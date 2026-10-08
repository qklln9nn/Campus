import assert from 'node:assert/strict'
import { handleModeration } from './handler.ts'

const id = '00000000-0000-4000-8000-000000000001'
const event = {
  id,
  organiser_id: 'actor',
  status: 'pending',
  title: 'Coding workshop',
  description: 'Hands-on workshop for beginner students. Bring a laptop for practice.',
  category: 'tech',
  event_date: '2030-01-01',
  start_time: '10:00',
  end_time: '12:00',
  location: 'Lab 1',
  online_link: null,
  capacity: 30,
  image_url: null,
}
const assessment = {
  flags: [],
  descriptionQuality: 40,
  missingFields: [],
  recommendation: 'approve',
  reason: 'Clear details.',
  suggestedDescription: null,
}

function fixture({
  role = 'admin',
  accountStatus = 'active',
  validSession = true,
  target = event,
  cached = false,
  saveError = false,
} = {}) {
  const calls: { name: string; args: Record<string, unknown> }[] = []
  let authCalls = 0
  const review = {
    event_id: id,
    status: 'completed',
    result: assessment,
    updated_at: '2030-01-01T00:00:00Z',
  }
  const client = {
    auth: {
      getUser: () => {
        authCalls++
        return Promise.resolve({
          data: { user: validSession ? { id: 'actor' } : null },
          error: null,
        })
      },
    },
    from: (table: string) => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        neq: () => builder,
        in: () => builder,
        order: () => builder,
        single: () =>
          Promise.resolve({
            data: table === 'profiles' ? { role, account_status: accountStatus } : target,
            error: null,
          }),
        range: () => Promise.resolve({ data: [], error: null }),
      }
      return builder
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args })
      if (name === 'claim_event_ai_review')
        return Promise.resolve({
          data: cached ? { cached: true, review } : { claimId: id, event: target },
          error: null,
        })
      return Promise.resolve({
        data: review,
        error: saveError ? { message: 'Stale snapshot' } : null,
      })
    },
  }
  const options = {
    client: client as unknown as NonNullable<Parameters<typeof handleModeration>[1]>['client'],
    apiKey: '',
  }
  return { options, calls, review, authCalls: () => authCalls }
}
function request(body: unknown = { eventId: id }, token = 'valid-token') {
  return new Request('https://example.com/ai-moderation', {
    method: 'POST',
    headers: token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

Deno.test(
  'preflight and unsupported methods do not authenticate or access the database',
  async () => {
    const f = fixture()
    assert.equal(
      (await handleModeration(new Request('https://example.com', { method: 'OPTIONS' }), f.options))
        .status,
      200,
    )
    assert.equal(
      (await handleModeration(new Request('https://example.com'), f.options)).status,
      405,
    )
    assert.equal(f.authCalls(), 0)
  },
)
Deno.test('missing and invalid user tokens cannot reach the service RPC', async () => {
  const f = fixture({ validSession: false })
  assert.equal((await handleModeration(request({}, ''), f.options)).status, 401)
  assert.equal((await handleModeration(request(), f.options)).status, 401)
  assert.equal(f.calls.length, 0)
})
Deno.test('students, suspended accounts and organisers of other events are denied', async () => {
  for (const settings of [
    { role: 'student' },
    { accountStatus: 'suspended' },
    { role: 'organiser', target: { ...event, organiser_id: 'someone-else' } },
  ]) {
    const f = fixture(settings)
    assert.equal((await handleModeration(request(), f.options)).status, 403)
    assert.equal(f.calls.length, 0)
  }
})
Deno.test('invalid event IDs and non-pending events are rejected before claiming', async () => {
  const f = fixture()
  assert.equal((await handleModeration(request({ eventId: 'not-a-uuid' }), f.options)).status, 400)
  assert.equal(f.calls.length, 0)
  const published = fixture({ target: { ...event, status: 'published' } })
  assert.equal((await handleModeration(request(), published.options)).status, 409)
})
Deno.test('organisers cannot force a rerun or receive private admin findings', async () => {
  const f = fixture({ role: 'organiser', cached: true })
  const response = await handleModeration(
    request({ eventId: id, force: true, organiser_id: 'forged' }),
    f.options,
  )
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { review: null })
  assert.equal(f.calls[0].args.p_force, false)
})
Deno.test('administrators receive persisted results and may request a rerun', async () => {
  const f = fixture({ cached: true })
  const response = await handleModeration(request({ eventId: id, force: true }), f.options)
  assert.deepEqual(await response.json(), { review: f.review })
  assert.equal(f.calls[0].args.p_force, true)
})
Deno.test(
  'missing AI configuration persists a failed review and never changes event status',
  async () => {
    const f = fixture()
    const response = await handleModeration(request(), f.options)
    assert.equal(response.status, 502)
    assert.equal(f.calls[1].name, 'finish_event_ai_review')
    assert.equal(f.calls[1].args.p_result, null)
    assert.match(String(f.calls[1].args.p_error), /not configured/)
  },
)
Deno.test('malformed provider output fails instead of being accepted', async () => {
  const f = fixture()
  const original = globalThis.fetch
  globalThis.fetch = () =>
    Promise.resolve(Response.json({ choices: [{ message: { content: 'not valid JSON' } }] }))
  try {
    assert.equal(
      (await handleModeration(request(), { ...f.options, apiKey: 'test-key' })).status,
      502,
    )
    assert.equal(f.calls[1].args.p_result, null)
    assert.match(String(f.calls[1].args.p_error), /invalid response/)
  } finally {
    globalThis.fetch = original
  }
})
Deno.test(
  'stale completions return conflict and cannot be presented as a valid review',
  async () => {
    const f = fixture({ saveError: true })
    const original = globalThis.fetch
    globalThis.fetch = () =>
      Promise.resolve(
        Response.json({ choices: [{ message: { content: JSON.stringify(assessment) } }] }),
      )
    try {
      const response = await handleModeration(request(), { ...f.options, apiKey: 'test-key' })
      assert.equal(response.status, 409)
      assert.match((await response.json()).error, /changed/)
    } finally {
      globalThis.fetch = original
    }
  },
)
