import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<() => Promise<{ data: { user: { id: string } | null }; error: unknown }>>(),
  from: vi.fn<(table: string) => Record<string, unknown>>(),
  rpc: vi.fn<(name: string, args: Record<string, unknown>) => Promise<{ error: unknown }>>(),
  reportInsert: vi.fn<(row: Record<string, unknown>) => Promise<{ error: { code: string; message: string } | null }>>(),
  eventOrder: vi.fn<() => Promise<{ data: unknown[]; error: unknown }>>(),
  reportOrder: vi.fn<() => Promise<{ data: unknown[]; error: unknown }>>(),
  eventUpdateEq: vi.fn<() => Promise<{ error: unknown }>>(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
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
})
