import type { EventItem } from '@/types/event'

const REGISTERABLE_STATUSES = new Set(['OPEN', 'FILLING_FAST', 'WAITLIST'])


//【Student Registration and Waitlist Flow】
// [Step 1] : Check whether event registration is open
// If the registration is closed, the button is disabled.
export function isEventRegistrationOpen(event: EventItem, now = new Date()): boolean {
  if (!REGISTERABLE_STATUSES.has(event.status)) return false
  if (!event.startsAt) return true

  const startTime = new Date(event.startsAt)
  if (Number.isNaN(startTime.getTime())) return false

  return startTime.getTime() > now.getTime()
}
