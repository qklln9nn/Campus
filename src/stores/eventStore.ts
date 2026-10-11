import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElNotification } from 'element-plus'
import { supabase } from '@/lib/supabase'
import { isEventRegistrationOpen } from '@/lib/eventRegistration'
import { categoryLabel, categorySlug } from '@/lib/category'
import { useAuthStore } from '@/stores/authStore'
import type { CategoryType, EventItem, EventStatus } from '@/types/event'

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

interface RawEventRow {
  id: string
  title: string
  description: string | null
  category: string
  event_date: string
  start_time: string
  end_time: string
  location: string | null
  online_link: string | null
  organiser_id: string
  organiser_name?: string | null
  organiser?: { full_name?: string | null } | null
  capacity: number
  registered_count: number | null
  waitlist_count: number | null
  image_url: string | null
  poster_url?: string | null
  status: string
  rating_sum?: number | null
  rating_count?: number | null
  event_locations?: { latitude: number, longitude: number } | null
}

//If the event ended
function hasEventEnded(eventDate: string, endTime: string): boolean {
  // 没有日期或结束时间，就先认为活动没有结束
  if (!eventDate || !endTime) {
    return false
  }

  // 拼成完整时间，例如：2026-09-28T18:30:00
  const fullEndTime = eventDate + 'T' + endTime.slice(0, 8)

  // 转换成 JavaScript 能比较的日期
  const eventEnd = new Date(fullEndTime)

  // 如果时间格式有问题，就先认为活动没有结束
  if (isNaN(eventEnd.getTime())) {
    return false
  }
  const currentTime = new Date()
  // 活动结束时间早于或等于现在，说明活动已经结束
  if (eventEnd <= currentTime) {
    return true
  }

  return false
}

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message)
  return fallback
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

  // Persistent deleted and cancelled event ID tracking
  const deletedEventIds = ref<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('campus_deleted_events') || '[]'))
  )
  const cancelledEventIds = ref<Set<string>>(
    new Set(JSON.parse(localStorage.getItem('campus_cancelled_events') || '[]'))
  )

  function markEventDeletedLocally(id: string) {
    deletedEventIds.value.add(id)
    localStorage.setItem('campus_deleted_events', JSON.stringify(Array.from(deletedEventIds.value)))
  }

  function markEventCancelledLocally(id: string) {
    cancelledEventIds.value.add(id)
    localStorage.setItem('campus_cancelled_events', JSON.stringify(Array.from(cancelledEventIds.value)))
  }

  // Attendees loaded from the backend and grouped by event ID
  const eventAttendeesMap = ref<Record<string, AttendeeItem[]>>({})

  // Request state for the organiser attendee drawer
  const attendeesLoading = ref(false)
  const attendeesError = ref('')


  // Filter and Search state
  const searchQuery = ref('')
  const selectedCategory = ref<CategoryType | 'All'>('All')
  const activeTab = ref<'all' | 'registered' | 'waitlisted' | 'saved'| 'completed'>('all')
  const aiSearchActive = ref(false)
  const aiSearchSummary = ref('')
  const aiSearchMatchedIds = ref<string[]>([])
  const aiSearchReasons = ref<Record<string, string>>({})
  const isAiSearching = ref(false)

  // Student-facing lists only expose events that passed moderation.
  // Event filtering is handled by a computed property in the Pinia store.
  // It checks visibility, the selected tab, category and search text,
  // and updates automatically whenever those values change.
  const filteredEvents = computed(() => {
    //filteredEvents is a computed property that combines visibility, active tab, category, and search text.
    return events.value.filter((event) => {
      const st = (event.status as string || '').toLowerCase()
      if (!['published', 'completed', 'open', 'filling_fast', 'waitlist'].includes(st)) return false

      if (aiSearchActive.value) {
        return aiSearchMatchedIds.value.includes(event.id)
      }

      // Tab filter
      if (activeTab.value === 'registered' && (!event.isRegistered|| event.status === 'COMPLETED' )) return false
      if (activeTab.value === 'waitlisted' && !event.isWaitlisted) return false
      if (activeTab.value === 'saved' && !event.isBookmarked) return false
      // The Completed Events tab only shows completed events for which the current student has a confirmed registration.
      if (activeTab.value === 'completed' && (!event.isRegistered || event.status !== 'COMPLETED')) return false


      // Category filter (Case-insensitive matching)
      if (selectedCategory.value !== 'All') {
        const targetCat = categorySlug(selectedCategory.value)
        const eventCat = categorySlug(event.category || '')
        if (eventCat !== targetCat) {
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
const userRegisteredCount = computed(() =>
  events.value.filter(
    (event) =>
      event.isRegistered &&
      ['OPEN', 'FILLING_FAST', 'WAITLIST'].includes(
        event.status,
      ),
  ).length,
)
  const userWaitlistedCount = computed(
    () => events.value.filter((e) => e.isWaitlisted).length,
  )
  const userBookmarkedCount = computed(
    () => events.value.filter((e) => e.isBookmarked).length,
  )
  const userCompletedCount = computed(
  () => events.value.filter((e) => e.isRegistered && e.status === 'COMPLETED').length,
)

  // Actions
  // Actions: Persistent Bookmarking in Supabase
  // The store reverses isBookmarked to determine whether the student is saving or removing the event.
  async function toggleBookmark(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event) return

    const authStore = useAuthStore()
    const userId = authStore.currentUser?.id

    if (!userId) throw new Error('Please sign in to save events.')

    // Toggle local state instantly for seamless UI response
    const willBookmark = !event.isBookmarked
    event.isBookmarked = willBookmark

    try {
      if (willBookmark) {
        //Add this event into the 'save_events' table
        const { error } = await supabase
        .from('saved_events')
        .insert({
          student_id: userId,
          event_id: eventId,
        })
        if (error) throw error
      } else {
        //detele this event into the 'save_events' table
        const { error } = await supabase
          .from('saved_events')
          .delete()
          .eq('student_id', userId)
          .eq('event_id', eventId)
        if (error) throw error
      }
    } catch (error) {
      event.isBookmarked = !willBookmark
      console.warn('Supabase toggleBookmark sync error:', error)
      throw new Error(
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unable to update the saved event.',
      )
    }
  }

  // Actions: Persistent Registration & Waitlist in Supabase
  async function registerEvent(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event) throw new Error('Event not found.')
    if (event.isRegistered) return 'registered'
    if (event.isWaitlisted) return 'waitlisted'
    if (!isEventRegistrationOpen(event)) {
      throw new Error('Registration is closed because this event has already started or ended.')
    }

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

    //【Student Registration and Waitlist】
    // The store inserts a record into the registrations table through Supabase.
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

    if (data?.status !== 'registered' && data?.status !== 'waitlisted') {
      Object.assign(event, snapshot)
      throw new Error('Supabase did not return a valid registration status.')
    }

    const finalStatus = data.status
    await fetchEventsFromSupabase()
    return finalStatus
  }

  // Actions: Persistent Cancel Registration in Supabase
  // Optimistically remove the student's registration
  async function cancelRegistration(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event) return

    const authStore = useAuthStore()
    const userId = authStore.currentUser?.id
    if (!supabase || !userId) {
      throw new Error('Please sign in first.')
    }

    //.1 Store save the info first
    const snapshot = {
      registeredCount: event.registeredCount,
      waitlistCount: event.waitlistCount,
      isRegistered: event.isRegistered,
      isWaitlisted: event.isWaitlisted,
      status: event.status,
    }

    //.2 Cancel the idRegistraed or waitlisted
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

    //.3 Store calls the RPC
    const { error } = await supabase.rpc(
      'cancel_own_registration',
      {
        p_event_id: eventId,
      },
    )

    if (error) {
      //.4 if the database falls, it will restore the original page.
      Object.assign(event, snapshot)
      throw new Error(error.message)
    }

    await fetchEventsFromSupabase()
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
      latitude?: number
      longitude?: number
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

    const cleanCategory = categorySlug(eventPayload.category || 'tech')
    const validDate = eventPayload.date && eventPayload.date.length >= 8 ? eventPayload.date : '2026-11-01'
    const generatedId = generateValidUUID()

    const safeImageUrl = eventPayload.posterUrl.trim()

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
          image_url: safeImageUrl,
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
        if (typeof eventPayload.latitude === 'number' && typeof eventPayload.longitude === 'number') {
          const { error: locErr } = await supabase.from('event_locations').insert({
            event_id: dbData.id,
            latitude: eventPayload.latitude,
            longitude: eventPayload.longitude
          })
          if (locErr) {
            console.error('Failed to save event location:', locErr)
          }
        }
        await fetchEventsFromSupabase()
        const createdEvent = events.value.find((e) => e.id === dbData.id) || events.value[0]
        return { success: true, event: createdEvent }
      }
    } catch (err: unknown) {
      console.error('Supabase createEvent insert exception:', err)
      return { success: false, message: messageFrom(err, 'Database insert failed') }
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
      latitude?: number
      longitude?: number
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

    const cleanCategory = categorySlug(eventPayload.category || 'tech')
    const fullStart = `${eventPayload.date} • ${eventPayload.startTime}`
    const fullEnd = `${eventPayload.date} • ${eventPayload.endTime}`

    // Update local reactive store state
    const target = events.value.find((e) => e.id === eventId)
    if (target) {
      target.title = eventPayload.title
      target.description = eventPayload.description
      target.category = categoryLabel(eventPayload.category || 'Tech')
      target.posterUrl = eventPayload.posterUrl
      target.startTime = fullStart
      target.endTime = fullEnd
      target.location = eventPayload.location
      target.capacity = Number(eventPayload.capacity) || 50
      target.status = eventPayload.isDraft ? 'DRAFT' : 'PENDING'
      if (eventPayload.organiserName) {
        target.organiser.name = eventPayload.organiserName
      }
      target.latitude = eventPayload.latitude
      target.longitude = eventPayload.longitude
    }

    const safeImageUrl = eventPayload.posterUrl.trim()

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
            image_url: safeImageUrl,
            status: eventStatus,
          })
          .eq('id', eventId)

        if (error) {
          console.warn('Supabase updateEvent error:', error)
          return { success: false, message: error.message }
        } else {
          if (typeof eventPayload.latitude === 'number' && typeof eventPayload.longitude === 'number') {
            const { data: existingLoc } = await supabase.from('event_locations').select('event_id').eq('event_id', eventId).maybeSingle()
            if (existingLoc) {
              await supabase.from('event_locations').update({
                latitude: eventPayload.latitude,
                longitude: eventPayload.longitude
              }).eq('event_id', eventId)
            } else {
              await supabase.from('event_locations').insert({
                event_id: eventId,
                latitude: eventPayload.latitude,
                longitude: eventPayload.longitude
              })
            }
          } else if (eventPayload.latitude === undefined && eventPayload.longitude === undefined) {
             // Maybe they removed it? Or maybe we just ignore. Let's just ignore if not provided.
          }
          await fetchEventsFromSupabase()
        }
      } catch (err: unknown) {
        console.warn('Supabase updateEvent exception:', err)
        return { success: false, message: messageFrom(err, 'Database update failed') }
      }
    }

    return { success: true }
  }

/**
   * Submit a draft event for administrator review.
   */
  async function submitEventForReview(eventId: string): Promise<{ success: boolean; message?: string }> {
    const event = events.value.find((e) => e.id === eventId)
    const previousStatus = event?.status

    if (event) {
      event.status = 'PENDING'
    }

    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      try {
        const { error } = await supabase
          .from('events')
          .update({ status: 'pending' })
          .eq('id', eventId)

        if (error) {
          if (event && previousStatus) event.status = previousStatus
          console.warn('Supabase submitEventForReview error:', error)
          return { success: false, message: error.message }
        } else {
          await fetchEventsFromSupabase()
        }
      } catch (err: unknown) {
        if (event && previousStatus) event.status = previousStatus
        console.warn('Supabase submitEventForReview exception:', err)
        return { success: false, message: messageFrom(err, 'Unable to submit the event') }
      }
    }

    return { success: true }
  }

  /**
   * Fetch Events dynamically from Supabase & merge registrations/saved state
   */
  //The frontend requests event records from Supabase.
  // Even though it uses select all,
  // Row Level Security still controls which rows the student is allowed to receive.
  async function fetchEventsFromSupabase() {
    try {
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) return

      //Step 1 : get users ID
      const authStore = useAuthStore()
      const currentUserId = authStore.currentUser?.id

      // *Step2:  Fetch Events directly from Supabase events table without restrictive foreign key join requirement
      const { data, error } = await supabase
        .from('events')
        .select('*, event_locations(latitude, longitude)')
        //order by created time
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase fetchEvents error:', error)
      }

      // Step 3: Fetch User Registrations & Saved Bookmarks if logged in
      //I also load the current student’s registration records.
      // Registered event IDs and waitlisted event IDs are stored in separate sets for fast lookup.
      const userRegSet = new Set<string>()
      const userWaitlistSet = new Set<string>()
      const userSavedSet = new Set<string>()

      if (currentUserId) {
        setupRealtimeRegistrations(currentUserId)

        const { data: regs } = await supabase
          .from('registrations')
          .select('event_id, status')
          .eq('student_id', currentUserId)

        // Read previously tracked waitlisted events for this user to detect promotions
        const trackedWlKey = `user_wl_${currentUserId}`
        //Save the last registration ID in waitlist

        let trackedWlIds: string[] = []
        try {
          trackedWlIds = JSON.parse(localStorage.getItem(trackedWlKey) || '[]')
        } catch {
          trackedWlIds = []
        }

        const currentWlIds: string[] = []
        const newlyPromotedEventIds: string[] = []

        // Compare registration status when fetching data
        if (regs) {
          // Go through every user registration record
          regs.forEach((r) => {
            // This record status: already registered successfully
            if (r.status === 'registered') {
              // Save this event id into registered list
              userRegSet.add(r.event_id)

              // Check: last time this event was in waitlist
              if (trackedWlIds.includes(r.event_id)) {
                // Add to promotion list: user got out of waitlist
                newlyPromotedEventIds.push(r.event_id)
              }
            }

            // This record status: on waitlist, waiting for vacancy
            if (r.status === 'waitlisted') {
              // Save id to waitlist list
              userWaitlistSet.add(r.event_id)
              // Record current waitlist id for next time comparison
              currentWlIds.push(r.event_id)
            }
          })
        }

        // Save current waitlist ids to browser local storage
        // Next time we load page, use this old list to compare changes
        localStorage.setItem(trackedWlKey, JSON.stringify(currentWlIds))

        // If any user moved from waitlist to registered, show alert and save notification
        if (newlyPromotedEventIds.length > 0) {
          const promoKey = `user_promotions_${currentUserId}`
          // Array to store old notification messages
          let existingPromos: any[] = []

          try {
            // Read saved messages, empty list if nothing saved
            existingPromos = JSON.parse(localStorage.getItem(promoKey) || '[]')
          } catch {
            // If data broken, reset to empty list
            existingPromos = []
          }

          // Loop every event that just got promoted
          newlyPromotedEventIds.forEach((promotedId) => {
            // Find event info by event id
            const rawEvent = (data as RawEventRow[] | null)?.find((e) => e.id === promotedId)
            // Get event name, use default text if not found
            const eventTitle = rawEvent?.title || 'a campus event'

            // Create new notification, put new message at the top
            existingPromos.unshift({
              id: `promo-${promotedId}-${Date.now()}`, // unique id for this notification
              title: 'Spot Confirmed (Waitlist Promoted)',
              message: `Great news! You have been moved off the waitlist and confirmed for "${eventTitle}".`,
              time: 'Just now',
              type: 'promotion',
              timestamp: Date.now(),
            })

            // Pop up message box on top right of screen
            ElNotification({
              title: 'Spot Confirmed!',
              message: `Great news! A spot opened up and you were promoted from the waitlist for "${eventTitle}". Your seat is now confirmed!`,
              type: 'success',
              duration: 9000, // auto close after 9 seconds
              position: 'top-right',
            })
          })

          // Keep only latest 15 messages, avoid saving too many
          // Save updated messages back into browser storage
          localStorage.setItem(promoKey, JSON.stringify(existingPromos.slice(0, 15)))
        }


        //Saved events are stored in the saved_events table.
        //I load the current student’s saved event IDs and merge them into the event objects.
        const { data: saved } = await supabase
          .from('saved_events')
          .select('event_id')
          .eq('student_id', currentUserId)

        if (saved) {
          saved.forEach((s) => userSavedSet.add(s.event_id))
        }
      }

      if (!error && data && data.length > 0) {
        events.value = (data as RawEventRow[])
          .filter((item) => !deletedEventIds.value.has(item.id))
          .map((item) => {
            const categoryName: CategoryType = categoryLabel(item.category || 'tech')

            const fullStart = `${item.event_date || 'Oct 28'} • ${item.start_time || '14:00'}`
            const fullEnd = `${item.event_date || 'Oct 28'} • ${item.end_time || '18:00'}`

            const regCount = item.registered_count || 0
            const cap = item.capacity || 100

            let statusStr = (
              item.status ? item.status.toUpperCase() : 'OPEN'
            ) as EventStatus

            const databaseStatus = item.status?.toLowerCase()
            //Convert an ended event to COMPLETED
            const eventHasEnded = hasEventEnded(item.event_date,item.end_time,)

            if (
              cancelledEventIds.value.has(item.id) ||
              databaseStatus === 'cancelled'
            ) {
              statusStr = 'CANCELLED'
            } else if (
              //make the statu 'COMPLETED'
              databaseStatus === 'completed' ||
              (databaseStatus === 'published' && eventHasEnded)
            ) {
              // A published event that has ended is displayed as COMPLETED.
              statusStr = 'COMPLETED'
            } else if (databaseStatus === 'published') {
              if (regCount >= cap) {
                statusStr = 'WAITLIST'
              } else if (regCount >= cap * 0.8) {
                statusStr = 'FILLING_FAST'
              } else {
                statusStr = 'OPEN'
              }
            }

          //===========把数据库的原始内容进行转变==============
          //The store converts database rows into frontend EventItem objects.
          // It also merges the student’s registration, waitlist and bookmark states,
          // so the card receives all required information in one object.
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
            startsAt:
              item.event_date && item.start_time
                ? `${item.event_date}T${String(item.start_time).slice(0, 8)}`
                : undefined,
            location: item.location || item.online_link || 'Campus Center Auditorium',
            organiserId: item.organiser_id,
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
            //Fetch the data for the rating
            ratingSum: item.rating_sum || 0,
            ratingCount: item.rating_count || 0,
            latitude: item.event_locations?.latitude,
            longitude: item.event_locations?.longitude,
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

    try{
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .select('id')
        .maybeSingle()
      if (error) {
          return {
          success: false,
          message: `Database deletion failed: ${error.message}`,
       }
      } if (!data) {
      return {
       success: false,
      message: 'The event was not deleted. It may not belong to this organiser or its current status does not allow deletion.',
        }
      }
      } catch (error) {
        return {
          success: false,
          message: messageFrom(error, 'Unable to delete the event.'),
        }
    }

    //delete this data from the Pinia, same event
    events.value = events.value.filter((event) => event.id !== eventId)
    delete eventAttendeesMap.value[eventId]
    return { success: true }
  }

  // Clear browser-only state when the authenticated account changes. This must
  // never call registration APIs because signing out must not cancel bookings.
  function resetUserActivity() {
    events.value.forEach((event) => {
      event.isRegistered = false
      event.isWaitlisted = false
      event.isBookmarked = false
    })
    eventAttendeesMap.value = {}
    attendeesError.value = ''
    activeTab.value = 'all'
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

  async function toggleCheckIn(eventId: string, attendeeId: string) {
    //Find the list of Attendees
    const list = eventAttendeesMap.value[eventId]
    if (!list) return
    const target = list.find((a) => a.id === attendeeId)
    if (target) {
      const newStatus = target.status === 'CHECKED_IN' ? 'REGISTERED' : 'CHECKED_IN'
      target.status = newStatus

      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        const dbStatus = newStatus === 'CHECKED_IN' ? 'attended' : 'pending'
        await supabase
          .from('registrations')
          .update({ attendance_status: dbStatus })
          .eq('id', attendeeId)
      }
    }
  }

  let activeRealtimeUserId: string | null = null

  function setupRealtimeRegistrations(userId: string) {
    //Listen for registration changes
    if (!supabase || activeRealtimeUserId === userId) return
    activeRealtimeUserId = userId

    try {
      supabase
        .channel(`student-regs-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            //focus on the 'registration' and 'student_id'
            table: 'registrations',
            filter: `student_id=eq.${userId}`,
          },
          () => {
            //When the registration has changes, fetch the data (重新加载数据)
            void fetchEventsFromSupabase()
          },
        )
        .subscribe()
    } catch (e) {
      console.warn('Realtime registration subscription failed:', e)
    }
  }

  async function performAiSearch(queryText: string) {
    if (!queryText || !queryText.trim()) {
      clearAiSearch()
      return
    }
    isAiSearching.value = true
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase.functions.invoke('ai-smart-search', {
        body: {
          query: queryText.trim(),
          currentDate: today,
          events: events.value.map(e => ({
            id: e.id,
            title: e.title,
            category: e.category,
            event_date: e.eventDate,
            location: e.location,
            description: e.description
          }))
        }
      })
      if (!error && data?.result) {
        aiSearchActive.value = true
        aiSearchMatchedIds.value = data.result.matchedEventIds || []
        aiSearchSummary.value = data.result.summary || 'Matching events found.'
        aiSearchReasons.value = data.result.reasons || {}
      } else {
        throw error || new Error('Failed to perform AI search')
      }
    } catch (err) {
      clearAiSearch()
      throw err
    } finally {
      isAiSearching.value = false
    }
  }

  function clearAiSearch() {
    aiSearchActive.value = false
    aiSearchSummary.value = ''
    aiSearchMatchedIds.value = []
    aiSearchReasons.value = {}
  }

  return {
    events,
    searchQuery,
    selectedCategory,
    activeTab,
    filteredEvents,
    aiSearchActive,
    aiSearchSummary,
    aiSearchMatchedIds,
    aiSearchReasons,
    isAiSearching,
    performAiSearch,
    clearAiSearch,
    userRegisteredCount,
    userWaitlistedCount,
    userBookmarkedCount,
    userCompletedCount,
    fetchEventsFromSupabase,
    createEventInSupabase,
    updateEventInSupabase,
    submitEventForReview,
    toggleBookmark,
    registerEvent,
    cancelRegistration,
    resetUserActivity,
    markEventDeletedLocally,
    markEventCancelledLocally,
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
