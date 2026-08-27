import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useEventStore } from '@/stores/eventStore'

describe('event store user activity', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts without another account activity and resets the current account mutations', () => {
    const store = useEventStore()
    const openEvent = store.events.find((event) => event.id === 'evt-002')!
    const fullEvent = store.events.find((event) => event.id === 'evt-005')!
    const initialRegisteredCount = openEvent.registeredCount
    const initialWaitlistCount = fullEvent.waitlistCount

    expect(store.events.every((event) => !event.isRegistered && !event.isWaitlisted)).toBe(true)
    expect(store.events.every((event) => !event.isBookmarked)).toBe(true)

    store.registerEvent(openEvent.id)
    store.registerEvent(fullEvent.id)
    store.toggleBookmark(openEvent.id)
    expect(openEvent.registeredCount).toBe(initialRegisteredCount + 1)
    expect(fullEvent.waitlistCount).toBe(initialWaitlistCount + 1)

    store.resetUserActivity()

    expect(store.events.every((event) => !event.isRegistered && !event.isWaitlisted)).toBe(true)
    expect(store.events.every((event) => !event.isBookmarked)).toBe(true)
    expect(openEvent.registeredCount).toBe(initialRegisteredCount)
    expect(fullEvent.waitlistCount).toBe(initialWaitlistCount)
    expect(store.activeTab).toBe('all')
  })
})
