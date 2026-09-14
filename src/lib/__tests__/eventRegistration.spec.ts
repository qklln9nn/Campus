import { describe, expect, it } from 'vitest'

import { isEventRegistrationOpen } from '@/lib/eventRegistration'
import type { EventItem } from '@/types/event'

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

describe('event registration availability', () => {
  const now = new Date('2026-09-12T12:00:00')

  it('allows a future open event', () => {
    expect(isEventRegistrationOpen(event(), now)).toBe(true)
  })

  it('closes registration after the event starts', () => {
    expect(isEventRegistrationOpen(event({ startsAt: '2026-09-12T11:59:59' }), now)).toBe(false)
  })

  it('rejects a non-registerable event status even when its date is in the future', () => {
    expect(isEventRegistrationOpen(event({ status: 'COMPLETED' }), now)).toBe(false)
  })

  it('supports existing event objects that do not yet contain startsAt', () => {
    expect(isEventRegistrationOpen(event({ startsAt: undefined }), now)).toBe(true)
  })
})
