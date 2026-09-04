import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { EventItem, CategoryType } from '@/types/event'

export interface AttendeeItem {
  id: string
  name: string
  studentId: string
  email: string
  registeredAt: string
  status: 'REGISTERED' | 'WAITLIST' | 'CHECKED_IN'
  waitlistRank?: number
}

interface RawAttendeeRow {
  registration_id: string
  student_id: string
  full_name: string | null
  email: string | null
  registration_status: 'registered' | 'waitlisted' | 'cancelled'
  attendance_status: 'pending' | 'attended' | 'absent'
  registered_at: string
}

function generateValidUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const useEventStore = defineStore('event', () => {
  // Real Events Dataset (Pulled dynamically from Supabase)
  const events = ref<EventItem[]>([])

// Attendees loaded from the backend and grouped by event ID
const eventAttendeesMap = ref<Record<string, AttendeeItem[]>>({})

// Request state for the organiser attendee drawer
const attendeesLoading = ref(false)
const attendeesError = ref('')


  // Filter and Search state
  const searchQuery = ref('')
  const selectedCategory = ref<CategoryType | 'All'>('All')
  const activeTab = ref<'all' | 'registered' | 'waitlisted' | 'saved'>('all')

  // Student-facing lists only expose events that passed moderation.
  const filteredEvents = computed(() => {
    return events.value.filter((event) => {
      const st = (event.status as string || '').toLowerCase()
      if (!['published', 'completed', 'open', 'filling_fast', 'waitlist'].includes(st)) return false

      // Tab filter
      if (activeTab.value === 'registered' && !event.isRegistered) return false
      if (activeTab.value === 'waitlisted' && !event.isWaitlisted) return false
      if (activeTab.value === 'saved' && !event.isBookmarked) return false

      // Category filter (Case-insensitive matching)
      if (selectedCategory.value !== 'All') {
        const targetCat = selectedCategory.value.toLowerCase()
        const eventCat = (event.category || '').toLowerCase()
        if (!eventCat.includes(targetCat) && !targetCat.includes(eventCat)) {
          return false
        }
      }

      // Search query
      if (searchQuery.value.trim() !== '') {
        const query = searchQuery.value.toLowerCase()
        const matchesTitle = (event.title || '').toLowerCase().includes(query)
        const matchesLoc = (event.location || '').toLowerCase().includes(query)
        const matchesDesc = (event.description || '').toLowerCase().includes(query)
        const matchesOrganiser = (event.organiser?.name || '').toLowerCase().includes(query)
        if (!matchesTitle && !matchesLoc && !matchesDesc && !matchesOrganiser) return false
      }

      return true
    })
  })

  // Registered Count Stats
  const userRegisteredCount = computed(
    () => events.value.filter((e) => e.isRegistered).length,
  )
  const userWaitlistedCount = computed(
    () => events.value.filter((e) => e.isWaitlisted).length,
  )
  const userBookmarkedCount = computed(
    () => events.value.filter((e) => e.isBookmarked).length,
  )

  // Actions
  // Actions: Persistent Bookmarking in Supabase
  async function toggleBookmark(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event) return

    const authStore = useAuthStore()
    const userId = authStore.currentUser?.id

    // Toggle local state instantly for seamless UI response
    const willBookmark = !event.isBookmarked
    event.isBookmarked = willBookmark

    if (!supabase || !import.meta.env.VITE_SUPABASE_URL || !userId) return

    try {
      if (willBookmark) {
        await supabase.from('saved_events').insert({
          student_id: userId,
          event_id: eventId,
        })
      } else {
        await supabase
          .from('saved_events')
          .delete()
          .eq('student_id', userId)
          .eq('event_id', eventId)
      }
    } catch (e) {
      console.warn('Supabase toggleBookmark sync error:', e)
    }
  }

  // Actions: Persistent Registration & Waitlist in Supabase
  async function registerEvent(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event || event.isRegistered || event.isWaitlisted) return

    const authStore = useAuthStore()
    const userId = authStore.currentUser?.id
    if (!supabase || !userId) {
      throw new Error('Please sign in to register for events.')
    }

    const snapshot = {
      registeredCount: event.registeredCount,
      waitlistCount: event.waitlistCount,
      isRegistered: event.isRegistered,
      isWaitlisted: event.isWaitlisted,
      status: event.status,
    }

    const isAvailable = event.registeredCount < event.capacity
    const targetStatus = isAvailable ? 'registered' : 'waitlisted'

    if (isAvailable) {
      event.registeredCount++
      event.isRegistered = true
      if (event.registeredCount >= event.capacity) {
        event.status = 'WAITLIST'
      } else if (event.registeredCount >= event.capacity * 0.8) {
        event.status = 'FILLING_FAST'
      }
    } else {
      event.waitlistCount++
      event.isWaitlisted = true
      event.status = 'WAITLIST'
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert({
        event_id: eventId,
        student_id: userId,
        status: targetStatus,
        attendance_status: 'pending',
      })
      .select('status')
      .single()

    if (error) {
      Object.assign(event, snapshot)
      throw new Error(error.message)
    }

    if (data?.status === 'waitlisted' && targetStatus === 'registered') {
      event.isRegistered = false
      event.registeredCount--
      event.waitlistCount++
      event.isWaitlisted = true
      event.status = 'WAITLIST'
    }

    return data?.status as string
  }

  // Actions: Persistent Cancel Registration in Supabase
  async function cancelRegistration(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event) return

    const authStore = useAuthStore()
    const userId = authStore.currentUser?.id
    if (!supabase || !userId) {
      throw new Error('Please sign in first.')
    }

    const snapshot = {
      registeredCount: event.registeredCount,
      waitlistCount: event.waitlistCount,
      isRegistered: event.isRegistered,
      isWaitlisted: event.isWaitlisted,
      status: event.status,
    }

    if (event.isRegistered) {
      event.isRegistered = false
      event.registeredCount = Math.max(0, event.registeredCount - 1)
      if (event.registeredCount < event.capacity * 0.8) {
        event.status = 'OPEN'
      }
    } else if (event.isWaitlisted) {
      event.isWaitlisted = false
      event.waitlistCount = Math.max(0, event.waitlistCount - 1)
    }

    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('student_id', userId)

    if (error) {
      Object.assign(event, snapshot)
      throw new Error(error.message)
    }
  }

  /**
   * Real Supabase event creation (draft or pending administrator review).
   */
  async function createEventInSupabase(
    eventPayload: {
      title: string
      description: string
      category: string
      date: string
      startTime: string
      endTime: string
      location: string
      capacity: number
      posterUrl: string
      organiserName?: string
      isDraft?: boolean
    }
  ): Promise<{ success: boolean; event?: EventItem; message?: string }> {
    const authStore = useAuthStore()
    let organiserId = authStore.currentUser?.id
    if (!organiserId && supabase && import.meta.env.VITE_SUPABASE_URL) {
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        organiserId = authData.user.id
      }
    }

    if (!supabase || !import.meta.env.VITE_SUPABASE_URL || !organiserId) {
      console.error('Supabase connection error: organiserId or VITE_SUPABASE_URL missing.')
      return {
        success: false,
        message: 'Unable to save to Supabase backend. Please check if you are logged in.',
      }
    }

    const eventStatus = eventPayload.isDraft ? 'draft' : 'pending'

    // Robust Time Range Formatting (Ensures end_time > start_time to pass DB checks)
    let sTime = '14:00:00'
    let eTime = '18:00:00'
    if (eventPayload.startTime) {
      const parts = eventPayload.startTime.split(' ')
      const tStr = parts[parts.length - 1] || '14:00'
      sTime = tStr.includes(':') ? (tStr.split(':').length === 2 ? `${tStr}:00` : tStr) : '14:00:00'
    }
    if (eventPayload.endTime) {
      const parts = eventPayload.endTime.split(' ')
      const tStr = parts[parts.length - 1] || '18:00'
      eTime = tStr.includes(':') ? (tStr.split(':').length === 2 ? `${tStr}:00` : tStr) : '18:00:00'
    }
    if (eTime <= sTime) {
      eTime = '23:59:59'
    }

    const cleanCategory = (eventPayload.category || 'tech').toLowerCase()
    const validDate = eventPayload.date && eventPayload.date.length >= 8 ? eventPayload.date : '2026-11-01'
    const generatedId = generateValidUUID()

    try {
      const { data: dbData, error: dbErr } = await supabase
        .from('events')
        .insert({
          id: generatedId,
          title: eventPayload.title,
          description: eventPayload.description || '',
          category: cleanCategory,
          event_date: validDate,
          start_time: sTime,
          end_time: eTime,
          location: eventPayload.location || 'Campus Center Hall',
          capacity: Number(eventPayload.capacity) || 50,
          image_url: eventPayload.posterUrl,
          status: eventStatus,
          organiser_id: organiserId,
        })
        .select('*')
        .single()

      if (dbErr) {
        console.error('Supabase insert error:', dbErr)
        return {
          success: false,
          message: `Database save failed: ${dbErr.message}.`,
        }
      }

      if (dbData) {
        await fetchEventsFromSupabase()
        const createdEvent = events.value.find((e) => e.id === dbData.id) || events.value[0]
        return { success: true, event: createdEvent }
      }
    } catch (err: any) {
      console.error('Supabase createEvent insert exception:', err)
      return { success: false, message: err.message || 'Database insert failed' }
    }

    return { success: false, message: 'Event insert to Supabase failed.' }
  }

  /**
   * Real Supabase Event Update (Modifies Existing Event instead of inserting new)
   */
  async function updateEventInSupabase(
    eventId: string,
    eventPayload: {
      title: string
      description: string
      category: string
      date: string
      startTime: string
      endTime: string
      location: string
      capacity: number
      posterUrl: string
      organiserName?: string
      isDraft?: boolean
    }
  ): Promise<{ success: boolean; message?: string }> {
    const eventStatus = eventPayload.isDraft ? 'draft' : 'pending'

    // Clean bullet separators and safely extract HH:mm:ss
    let sTime = '14:00:00'
    let eTime = '18:00:00'
    if (eventPayload.startTime) {
      const clean = eventPayload.startTime.replace(/\u2022/g, ' ').trim()
      const parts = clean.split(' ')
      const tStr = parts.find((p) => p.includes(':')) || '14:00'
      sTime = tStr.split(':').length === 2 ? `${tStr}:00` : tStr
    }
    if (eventPayload.endTime) {
      const clean = eventPayload.endTime.replace(/\u2022/g, ' ').trim()
      const parts = clean.split(' ')
      const tStr = parts.find((p) => p.includes(':')) || '18:00'
      eTime = tStr.split(':').length === 2 ? `${tStr}:00` : tStr
    }
    if (eTime <= sTime) {
      eTime = '23:59:59'
    }

    const cleanCategory = (eventPayload.category || 'tech').toLowerCase()
    const fullStart = `${eventPayload.date} • ${eventPayload.startTime}`
    const fullEnd = `${eventPayload.date} • ${eventPayload.endTime}`

    // Update local reactive store state
    const target = events.value.find((e) => e.id === eventId)
    if (target) {
      target.title = eventPayload.title
      target.description = eventPayload.description
      target.category = (eventPayload.category as CategoryType) || 'Tech'
      target.posterUrl = eventPayload.posterUrl
      target.startTime = fullStart
      target.endTime = fullEnd
      target.location = eventPayload.location
      target.capacity = Number(eventPayload.capacity) || 50
      target.status = eventPayload.isDraft ? 'DRAFT' : 'PENDING'
      if (eventPayload.organiserName) {
        target.organiser.name = eventPayload.organiserName
      }
    }

    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      try {
        const { error } = await supabase
          .from('events')
          .update({
            title: eventPayload.title,
            description: eventPayload.description,
            category: cleanCategory,
            event_date: eventPayload.date || '2026-10-30',
            start_time: sTime,
            end_time: eTime,
            location: eventPayload.location,
            capacity: Number(eventPayload.capacity) || 50,
            image_url: eventPayload.posterUrl,
            status: eventStatus,
          })
          .eq('id', eventId)

        if (error) {
          console.warn('Supabase updateEvent error:', error)
          return { success: false, message: error.message }
        } else {
          await fetchEventsFromSupabase()
        }
      } catch (err: any) {
        console.warn('Supabase updateEvent exception:', err)
        return { success: false, message: err.message }
      }
    }

    return { success: true }
  }

  /**
   * Submit a draft event for administrator review.
   */
  async function submitEventForReview(eventId: string): Promise<{ success: boolean; message?: string }> {
    const event = events.value.find((e) => e.id === eventId)
    if (event) {
      event.status = 'PENDING'
    }

    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      try {
        const { error } = await supabase
          .from('events')
          .update({ status: 'pending' })
          .eq('id', eventId)

        if (!error) {
          await fetchEventsFromSupabase()
        } else {
          console.warn('Supabase submitEventForReview error:', error)
          return { success: false, message: error.message }
        }
      } catch (err: any) {
        console.warn('Supabase submitEventForReview exception:', err)
        return { success: false, message: err.message }
      }
    }

    return { success: true }
  }

  /**
   * Fetch Events dynamically from Supabase & merge registrations/saved state
   */
  async function fetchEventsFromSupabase() {
    try {
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) return

      const authStore = useAuthStore()
      const currentUserId = authStore.currentUser?.id

      // 1. Fetch Events directly from Supabase events table without restrictive foreign key join requirement
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase fetchEvents error:', error)
      }

      // 2. Fetch User Registrations & Saved Bookmarks if logged in
      const userRegSet = new Set<string>()
      const userWaitlistSet = new Set<string>()
      const userSavedSet = new Set<string>()

      if (currentUserId) {
        const { data: regs } = await supabase
          .from('registrations')
          .select('event_id, status')
          .eq('student_id', currentUserId)

        if (regs) {
          regs.forEach((r) => {
            if (r.status === 'registered') userRegSet.add(r.event_id)
            if (r.status === 'waitlisted') userWaitlistSet.add(r.event_id)
          })
        }

        const { data: saved } = await supabase
          .from('saved_events')
          .select('event_id')
          .eq('student_id', currentUserId)

        if (saved) {
          saved.forEach((s) => userSavedSet.add(s.event_id))
        }
      }

      if (!error && data && data.length > 0) {
        events.value = data.map((item: any) => {
          let categoryName: CategoryType = 'Tech'
          const rawCat = (item.category || '').toLowerCase()
          if (rawCat.includes('tech') || rawCat.includes('coding')) categoryName = 'Tech'
          else if (rawCat.includes('academic') || rawCat.includes('research')) categoryName = 'Academic'
          else if (rawCat.includes('sport') || rawCat.includes('fitness')) categoryName = 'Sports'
          else if (rawCat.includes('cultural') || rawCat.includes('art')) categoryName = 'Cultural'
          else if (rawCat.includes('club')) categoryName = 'Club'
          else if (rawCat.includes('career')) categoryName = 'Career'
          else categoryName = 'Tech'

          const fullStart = `${item.event_date || 'Oct 28'} • ${item.start_time || '14:00'}`
          const fullEnd = `${item.event_date || 'Oct 28'} • ${item.end_time || '18:00'}`

          const regCount = item.registered_count || 0
          const cap = item.capacity || 100

          let statusStr: any = item.status ? item.status.toLowerCase() : 'open'
          if (statusStr === 'published') {
            if (regCount >= cap) statusStr = 'WAITLIST'
            else if (regCount >= cap * 0.8) statusStr = 'FILLING_FAST'
            else statusStr = 'OPEN'
          }

          return {
            id: item.id,
            title: item.title,
            description: item.description || '',
            category: categoryName,
            posterUrl:
              item.image_url ||
              item.poster_url ||
              'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
            startTime: fullStart,
            endTime: fullEnd,
            location: item.location || item.online_link || 'Campus Center Auditorium',
            organiser: {
              name:
                item.organiser?.full_name ||
                item.organiser_name ||
                'Campus Activity Board',
            },
            capacity: cap,
            registeredCount: regCount,
            waitlistCount: item.waitlist_count || 0,
            status: statusStr,
            isRegistered: userRegSet.has(item.id),
            isWaitlisted: userWaitlistSet.has(item.id),
            isBookmarked: userSavedSet.has(item.id),
          }
        })
      }
    } catch (e) {
      console.warn('Supabase fetchEvents warning:', e)
    }
  }

  function addEvent(newEvent: Omit<EventItem, 'id' | 'registeredCount' | 'waitlistCount' | 'status' | 'isRegistered' | 'isWaitlisted' | 'isBookmarked'>) {
    const newId = generateValidUUID()
    const createdItem: EventItem = {
      ...newEvent,
      id: newId,
      registeredCount: 0,
      waitlistCount: 0,
      status: 'OPEN',
      isRegistered: false,
      isWaitlisted: false,
      isBookmarked: false,
    }
    events.value.unshift(createdItem)
    eventAttendeesMap.value[newId] = []
    return createdItem
  }

  function updateEvent(eventId: string, updatedFields: Partial<Omit<EventItem, 'id'>>) {
    const index = events.value.findIndex((e) => e.id === eventId)
    if (index !== -1) {
      const existing = events.value[index]!
      events.value[index] = {
        ...existing,
        ...(updatedFields as Omit<EventItem, 'id'>),
        id: existing.id,
      }
    }
  }

  async function deleteEvent(eventId: string): Promise<{ success: boolean; message?: string }> {
    const index = events.value.findIndex((e) => e.id === eventId)
    if (index !== -1) {
      events.value.splice(index, 1)
      delete eventAttendeesMap.value[eventId]
    }

    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      try {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId)

        if (error) {
          console.error('Supabase delete error:', error)
          await fetchEventsFromSupabase()
          return { success: false, message: `Failed to delete from database: ${error.message}` }
        } else {
          await fetchEventsFromSupabase()
          return { success: true }
        }
      } catch (err: any) {
        console.error('Supabase delete exception:', err)
        return { success: false, message: err.message || 'Delete operation failed' }
      }
    }

    return { success: true }
  }

  async function fetchEventAttendees(eventId: string): Promise<void> {
  attendeesLoading.value = true
  attendeesError.value = ''

  try {
    const { data, error } = await supabase.rpc(
      'get_event_attendees',
      {
        p_event_id: eventId,
      },
    )

    if (error) {
      throw error
    }

    const rows = (data ?? []) as RawAttendeeRow[]
    let waitlistRank = 0

    eventAttendeesMap.value[eventId] = rows
      .filter((row) => row.registration_status !== 'cancelled')
      .map((row) => {
        const isWaitlisted =
          row.registration_status === 'waitlisted'

        if (isWaitlisted) {
          waitlistRank += 1
        }

        let status: AttendeeItem['status'] = 'REGISTERED'

        if (isWaitlisted) {
          status = 'WAITLIST'
        } else if (row.attendance_status === 'attended') {
          status = 'CHECKED_IN'
        }

        return {
          id: row.registration_id,
          name: row.full_name || 'Unknown student',
          studentId: row.student_id,
          email: row.email || '',
          registeredAt: new Date(
            row.registered_at,
          ).toLocaleString(),
          status,
          waitlistRank: isWaitlisted
            ? waitlistRank
            : undefined,
        }
      })
  } catch (error) {
    eventAttendeesMap.value[eventId] = []

    attendeesError.value =
      error &&
      typeof error === 'object' &&
      'message' in error
        ? String(error.message)
        : 'Unable to load attendees.'
  } finally {
    attendeesLoading.value = false
  }
}

  function getAttendees(eventId: string): AttendeeItem[] {
    return eventAttendeesMap.value[eventId] || []
  }

  function promoteWaitlistAttendee(eventId: string, attendeeId: string) {
    const list = eventAttendeesMap.value[eventId]
    if (!list) return
    const target = list.find((a) => a.id === attendeeId)
    const event = events.value.find((e) => e.id === eventId)

    if (target && target.status === 'WAITLIST' && event) {
      target.status = 'REGISTERED'
      target.waitlistRank = undefined
      event.registeredCount++
      event.waitlistCount = Math.max(0, event.waitlistCount - 1)
    }
  }

  function toggleCheckIn(eventId: string, attendeeId: string) {
    const list = eventAttendeesMap.value[eventId]
    if (!list) return
    const target = list.find((a) => a.id === attendeeId)
    if (target) {
      target.status = target.status === 'CHECKED_IN' ? 'REGISTERED' : 'CHECKED_IN'
    }
  }

  return {
    events,
    searchQuery,
    selectedCategory,
    activeTab,
    filteredEvents,
    userRegisteredCount,
    userWaitlistedCount,
    userBookmarkedCount,
    fetchEventsFromSupabase,
    createEventInSupabase,
    updateEventInSupabase,
    submitEventForReview,
    toggleBookmark,
    registerEvent,
    cancelRegistration,
    // Organiser Portal exports
    attendeesLoading,
    attendeesError,
    fetchEventAttendees,
    addEvent,
    updateEvent,
    deleteEvent,
    getAttendees,
    promoteWaitlistAttendee,
    toggleCheckIn,
  }
})
