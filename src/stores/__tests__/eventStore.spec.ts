import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EventItem } from '@/types/event'

const mocks = vi.hoisted(() => ({
  from: vi.fn<(table: string) => Record<string, unknown>>(),
  bookmarkInsert: vi.fn<
    (row: Record<string, string>) => Promise<{ error: { message: string } | null }>
  >(),
  rpc: vi.fn<() => Promise<{ data: unknown; error: unknown }>>(),
  getUser: vi.fn<() => Promise<{ data: { user: null }; error: unknown }>>(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
    auth: { getUser: mocks.getUser },
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ currentUser: { id: 'student-1' } }),
}))

import { useEventStore } from '@/stores/eventStore'

function event(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 'event-1',
    title: 'Test event',
    description: '',
    category: 'Tech',
    posterUrl: '',
    startTime: '2030-01-01 • 10:00',
    endTime: '2030-01-01 • 12:00',
    startsAt: '2030-01-01T10:00:00',
    location: 'Campus',
    organiserId: 'organiser-1',
    organiser: { name: 'Organiser' },
    capacity: 20,
    registeredCount: 0,
    waitlistCount: 0,
    status: 'OPEN',
    isRegistered: false,
    isWaitlisted: false,
    isBookmarked: false,
    ...overrides,
  }
}

describe('event store registration safeguards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.from.mockImplementation((table: string) => {
      if (table === 'saved_events') return { insert: mocks.bookmarkInsert }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('rolls back an optimistic bookmark when Supabase rejects it', async () => {
    mocks.bookmarkInsert.mockResolvedValueOnce({ error: { message: 'RLS denied' } })
    const store = useEventStore()
    store.events.push(event())

    await expect(store.toggleBookmark('event-1')).rejects.toThrow('RLS denied')
    expect(store.events[0]?.isBookmarked).toBe(false)
  })

  it('does not contact Supabase when registration is already closed', async () => {
    const store = useEventStore()
    store.events.push(event({ startsAt: '2020-01-01T10:00:00' }))

    await expect(store.registerEvent('event-1')).rejects.toThrow('Registration is closed')
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
