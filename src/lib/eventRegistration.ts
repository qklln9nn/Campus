import type { EventItem } from '@/types/event'

const REGISTERABLE_STATUSES = new Set(['OPEN', 'FILLING_FAST', 'WAITLIST'])

export function isEventRegistrationOpen(event: EventItem, now = new Date()): boolean {
  if (!REGISTERABLE_STATUSES.has(event.status)) return false
  if (!event.startsAt) return true

  const startTime = new Date(event.startsAt)
  if (Number.isNaN(startTime.getTime())) return false

  return startTime.getTime() > now.getTime()
}
