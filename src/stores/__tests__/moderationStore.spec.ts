import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null }; error: unknown }>>(),
  from: vi.fn<(table: string) => Record<string, unknown>>(),
  rpc: vi.fn<(name: string, args: Record<string, unknown>) => Promise<{ error: unknown }>>(),
  reportInsert:
    vi.fn<
      (row: Record<string, unknown>) => Promise<{ error: { code: string; message: string } | null }>
    >(),
  eventOrder: vi.fn<() => Promise<{ data: unknown[]; error: unknown }>>(),
  reportOrder: vi.fn<() => Promise<{ data: unknown[]; error: unknown }>>(),
  eventUpdateEq: vi.fn<() => Promise<{ error: unknown }>>(),
  aiReviewIn: vi.fn<() => Promise<{ data: unknown[]; error: unknown }>>(),
  invoke: vi.fn<() => Promise<{ data: unknown; error: unknown }>>(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
    functions: { invoke: mocks.invoke },
  },
}))

import { useModerationStore } from '@/stores/moderationStore'

describe('moderation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'student-1' } }, error: null })
    mocks.reportInsert.mockResolvedValue({ error: null })
    mocks.rpc.mockResolvedValue({ error: null })
    mocks.eventUpdateEq.mockResolvedValue({ error: null })
    mocks.eventOrder.mockResolvedValue({ data: [], error: null })
    mocks.reportOrder.mockResolvedValue({ data: [], error: null })
    mocks.aiReviewIn.mockResolvedValue({ data: [], error: null })
    mocks.invoke.mockResolvedValue({ data: null, error: null })
    mocks.from.mockImplementation((table: string) => {
      if (table === 'reports') {
        return {
          insert: mocks.reportInsert,
          select: () => ({ order: mocks.reportOrder }),
        }
      }
      if (table === 'events') {
        return {
          select: () => ({ order: mocks.eventOrder }),
          update: () => ({ eq: mocks.eventUpdateEq }),
        }
      }
      if (table === 'event_ai_reviews') return { select: () => ({ in: mocks.aiReviewIn }) }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('submits a report with the authenticated user identity', async () => {
    const store = useModerationStore()

    await store.submitReport('event-1', 'Safety Hazard', 'Blocked emergency exit')

    expect(mocks.reportInsert).toHaveBeenCalledWith({
      reporter_id: 'student-1',
      event_id: 'event-1',
      reason: 'Safety Hazard',
      description: 'Blocked emergency exit',
    })
    expect(store.submittingReport).toBe(false)
  })

  it('returns a clear message for duplicate reports', async () => {
    mocks.reportInsert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } })
    const store = useModerationStore()

    await expect(store.submitReport('event-1', 'Other', '')).rejects.toThrow(
      'You have already reported this event.',
    )
    expect(store.submittingReport).toBe(false)
  })

  it('uses the protected review RPC and refreshes the queue', async () => {
    const store = useModerationStore()

    await store.reviewEvent('event-2', 'reject', 'Missing venue approval')

    expect(mocks.rpc).toHaveBeenCalledWith('review_event', {
      p_event_id: 'event-2',
      p_decision: 'reject',
      p_rejection_reason: 'Missing venue approval',
    })
    expect(mocks.eventOrder).toHaveBeenCalled()
  })

  it('loads persisted AI findings shared between administrators', async () => {
    const review = {
      event_id: 'event-1',
      status: 'completed',
      result: { completenessScore: 80 },
      error_message: null,
      updated_at: '2030-01-01T00:00:00Z',
    }
    mocks.aiReviewIn.mockResolvedValueOnce({ data: [review], error: null })
    const store = useModerationStore()
    await store.fetchAiReviews()
    expect(store.aiReviews['event-1']).toEqual(review)
  })
  it('shows a per-event failure and always releases the local analysis lock', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: { message: 'AI is offline' } })
    const store = useModerationStore()
    await store.analyzeEvent('event-1')
    expect(store.aiErrors['event-1']).toBe('AI is offline')
    expect(store.analyzingEventIds.has('event-1')).toBe(false)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('does not invoke the provider twice for the same in-flight event', async () => {
    const store = useModerationStore()
    store.analyzingEventIds.add('event-1')
    await store.analyzeEvent('event-1')
    expect(mocks.invoke).not.toHaveBeenCalled()
  })
  it('adopts a rejection using only the protected RPC, without client-supplied AI text', async () => {
    const store = useModerationStore()
    await store.adoptAiSuggestion('event-1', 'reject')
    expect(mocks.rpc).toHaveBeenCalledWith('adopt_event_ai_suggestion', {
      p_event_id: 'event-1',
      p_action: 'reject',
    })
    expect(mocks.eventOrder).toHaveBeenCalled()
    expect(mocks.aiReviewIn).toHaveBeenCalled()
    expect(store.adoptingEventId).toBe('')
  })
  it('propagates stale adoption failures and releases the action lock', async () => {
    mocks.rpc.mockResolvedValueOnce({ error: new Error('AI review is stale') })
    const store = useModerationStore()
    await expect(store.adoptAiSuggestion('event-1', 'description')).rejects.toThrow(
      'AI review is stale',
    )
    expect(store.adoptingEventId).toBe('')
    expect(mocks.eventOrder).not.toHaveBeenCalled()
  })
})
