import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { before, after, describe, it } from 'node:test'

const db = new PGlite()
const organiser = '00000000-0000-4000-8000-000000000001'
const admin = '00000000-0000-4000-8000-000000000002'
const student = '00000000-0000-4000-8000-000000000003'
const suspendedAdmin = '00000000-0000-4000-8000-000000000004'
const readMigration = (name) =>
  readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
const result = {
  riskLevel: 'medium',
  flags: [],
  completenessScore: 60,
  missingFields: ['Agenda'],
  duplicates: [],
  recommendation: 'request_changes',
  reason: 'Please provide an agenda and participation instructions.',
  suggestedDescription: 'A campus workshop for students. Bring a laptop for exercises.',
}
let legacyEvent

async function actor(id, role, fn) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ''])
  await db.exec(`set role ${role}`)
  try {
    return await fn()
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}
async function createEvent(status = 'pending') {
  const id = randomUUID()
  await db.query(
    `insert into public.events(id,title,description,category,event_date,start_time,end_time,location,capacity,status,organiser_id)
    values($1,'Campus coding workshop','Bring a laptop for a hands-on beginner workshop.','tech','2030-01-01','10:00','12:00','Lab 1',30,$2,$3)`,
    [id, status, organiser],
  )
  return id
}
async function claim(id, force = false) {
  return actor(
    null,
    'service_role',
    async () =>
      (await db.query('select public.claim_event_ai_review($1,$2) as claim', [id, force])).rows[0]
        .claim,
  )
}
async function finish(id, token, value = result, error = null) {
  return actor(
    null,
    'service_role',
    async () =>
      (
        await db.query('select public.finish_event_ai_review($1,$2,$3,$4) as review', [
          id,
          token,
          value,
          error,
        ])
      ).rows[0].review,
  )
}

describe('AI moderation migration, permissions and transactions', { concurrency: false }, () => {
  before(async () => {
    // Reproduce Supabase default grants, so explicit revocations are tested.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to anon,authenticated,service_role;
      alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
      alter default privileges in schema public grant execute on functions to anon,authenticated,service_role;`)
    await db.exec(await readMigration('001_create_profiles.sql'))
    await db.exec(await readMigration('002_create_events.sql'))
    await db.exec(await readMigration('018_fix_cancel_event_review_state.sql'))
    const secureModeration = await readMigration('013_restore_secure_moderation.sql')
    await db.exec(
      secureModeration.match(/create or replace function public\.review_event\([\s\S]*?\$\$;/)[0],
    )
    await db.exec(
      "alter table public.profiles add column account_status text not null default 'active';",
    )
    const adminMigration = await readMigration('017_create_admin_management.sql')
    await db.exec(
      adminMigration.match(
        /create or replace function public\.current_user_role\(\)[\s\S]*?\$\$;/,
      )[0],
    )
    for (const [id, role, status] of [
      [organiser, 'organiser', 'active'],
      [admin, 'admin', 'active'],
      [student, 'student', 'active'],
      [suspendedAdmin, 'admin', 'suspended'],
    ]) {
      await db.query('insert into auth.users(id) values($1)', [id])
      await db.query('insert into public.profiles(id,role,account_status) values($1,$2,$3)', [
        id,
        role,
        status,
      ])
    }
    legacyEvent = await createEvent()
    await db.exec(await readMigration('024_add_ai_event_moderation.sql'))
  })
  after(() => db.close())

  it('backfills existing pending events and queues draft submissions', async () => {
    assert.equal(
      (
        await db.query('select status from public.event_ai_reviews where event_id=$1', [
          legacyEvent,
        ])
      ).rows[0].status,
      'queued',
    )
    const id = await createEvent('draft')
    assert.equal(
      (await db.query('select * from public.event_ai_reviews where event_id=$1', [id])).rows.length,
      0,
    )
    await actor(organiser, 'authenticated', () =>
      db.query("update public.events set status='pending' where id=$1", [id]),
    )
    assert.equal(
      (await db.query('select status from public.event_ai_reviews where event_id=$1', [id])).rows[0]
        .status,
      'queued',
    )
  })
  it('denies non-admin reads, forged writes and service-only RPCs despite default grants', async () => {
    for (const id of [organiser, student, suspendedAdmin]) {
      await actor(id, 'authenticated', async () => {
        assert.equal((await db.query('select * from public.event_ai_reviews')).rows.length, 0)
        await assert.rejects(
          db.query("update public.event_ai_reviews set status='failed'"),
          /permission denied/,
        )
        await assert.rejects(
          db.query('select public.claim_event_ai_review($1,false)', [legacyEvent]),
          /permission denied/,
        )
        await assert.rejects(
          db.query('select public.finish_event_ai_review($1,$2,$3,null)', [
            legacyEvent,
            randomUUID(),
            result,
          ]),
          /permission denied/,
        )
        await assert.rejects(
          db.query("select public.adopt_event_ai_suggestion($1,'reject')", [legacyEvent]),
          /Administrator role required/,
        )
      })
    }
    await actor(null, 'anon', () =>
      assert.rejects(
        db.query('select public.claim_event_ai_review($1,false)', [legacyEvent]),
        /permission denied/,
      ),
    )
  })
  it('leases work and caches unchanged completed results', async () => {
    const id = await createEvent()
    const first = await claim(id)
    assert.ok(first.claimId)
    assert.equal((await claim(id, true)).busy, true)
    assert.equal((await finish(id, first.claimId)).status, 'completed')
    const cached = await claim(id)
    assert.equal(cached.cached, true)
    assert.deepEqual(cached.review.result, result)
    assert.equal('source_snapshot' in cached.review, false)
    assert.ok((await claim(id, true)).claimId)
  })
  it('invalidates edits and prevents stale results from being saved or adopted', async () => {
    const id = await createEvent()
    const first = await claim(id)
    await actor(organiser, 'authenticated', () =>
      db.query(
        "update public.events set description='An updated workshop agenda for students.' where id=$1",
        [id],
      ),
    )
    const queued = (await db.query('select * from public.event_ai_reviews where event_id=$1', [id]))
      .rows[0]
    assert.equal(queued.status, 'queued')
    assert.equal(queued.claim_id, null)
    await assert.rejects(finish(id, first.claimId), /Event changed during analysis/)
    await actor(admin, 'authenticated', () =>
      assert.rejects(
        db.query("select public.adopt_event_ai_suggestion($1,'reject')", [id]),
        /unavailable or stale/,
      ),
    )
  })
  it('applies stored wording atomically, keeps the event pending and queues reanalysis', async () => {
    const id = await createEvent()
    await finish(id, (await claim(id)).claimId)
    await actor(admin, 'authenticated', () =>
      db.query("select public.adopt_event_ai_suggestion($1,'description')", [id]),
    )
    const event = (await db.query('select description,status from public.events where id=$1', [id]))
      .rows[0]
    assert.equal(event.description, result.suggestedDescription)
    assert.equal(event.status, 'pending')
    assert.equal(
      (await db.query('select status from public.event_ai_reviews where event_id=$1', [id])).rows[0]
        .status,
      'queued',
    )
    const audit = (
      await db.query('select * from public.event_ai_review_actions where event_id=$1', [id])
    ).rows[0]
    assert.equal(audit.admin_id, admin)
    assert.equal(audit.action, 'description')
    assert.deepEqual(audit.result, result)
  })
  it('returns a proposal with the stored reason and records the human reviewer', async () => {
    const id = await createEvent()
    await finish(id, (await claim(id)).claimId)
    await actor(admin, 'authenticated', () =>
      db.query("select public.adopt_event_ai_suggestion($1,'reject')", [id]),
    )
    const event = (await db.query('select * from public.events where id=$1', [id])).rows[0]
    assert.equal(event.status, 'rejected')
    assert.equal(event.rejection_reason, result.reason)
    assert.equal(event.reviewed_by, admin)
    assert.ok(event.reviewed_at)
    assert.equal(
      (await db.query('select action from public.event_ai_review_actions where event_id=$1', [id]))
        .rows[0].action,
      'reject',
    )
    await actor(admin, 'authenticated', () =>
      assert.rejects(
        db.query("select public.adopt_event_ai_suggestion($1,'reject')", [id]),
        /not pending/,
      ),
    )
  })
  it('recovers expired leases and prevents an old worker overwriting its successor', async () => {
    const id = await createEvent()
    const first = await claim(id)
    await db.query(
      "update public.event_ai_reviews set updated_at=now()-interval '6 minutes' where event_id=$1",
      [id],
    )
    const second = await claim(id)
    assert.notEqual(second.claimId, first.claimId)
    await assert.rejects(finish(id, first.claimId), /Event changed/)
    assert.equal((await finish(id, second.claimId, null, 'Provider unavailable')).status, 'failed')
    assert.ok((await claim(id)).claimId)
  })
  it('discards unfinished reviews when a pending event is cancelled', async () => {
    const id = await createEvent()
    const first = await claim(id)
    await actor(organiser, 'authenticated', () =>
      db.query("update public.events set status='cancelled' where id=$1", [id]),
    )
    assert.equal(
      (await db.query('select * from public.event_ai_reviews where event_id=$1', [id])).rows.length,
      0,
    )
    await assert.rejects(finish(id, first.claimId), /Event changed during analysis/)
  })
  it('removes stale findings if an administrator changes an already published event', async () => {
    const id = await createEvent()
    await finish(id, (await claim(id)).claimId)
    await actor(admin, 'authenticated', async () => {
      await db.query("select public.review_event($1,'approve',null)", [id])
      await db.query("update public.events set title='Updated workshop title' where id=$1", [id])
    })
    assert.equal(
      (await db.query('select * from public.event_ai_reviews where event_id=$1', [id])).rows.length,
      0,
    )
  })
  it('never auto-publishes and rejects unsupported adoption decisions', async () => {
    const id = await createEvent()
    await finish(id, (await claim(id)).claimId, {
      ...result,
      recommendation: 'approve',
      suggestedDescription: null,
    })
    assert.equal(
      (await db.query('select status from public.events where id=$1', [id])).rows[0].status,
      'pending',
    )
    await actor(admin, 'authenticated', async () => {
      await assert.rejects(
        db.query("select public.adopt_event_ai_suggestion($1,'reject')", [id]),
        /did not recommend/,
      )
      await assert.rejects(
        db.query("select public.adopt_event_ai_suggestion($1,'description')", [id]),
        /No description/,
      )
      await assert.rejects(
        db.query("select public.adopt_event_ai_suggestion($1,'approve')", [id]),
        /Invalid AI adoption/,
      )
    })
  })
})
