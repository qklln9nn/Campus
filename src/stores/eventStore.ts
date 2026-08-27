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

const fallbackEvents: EventItem[] = [
  {
    id: 'evt-002',
    title: 'Academic Research & Publishing Seminar',
    description: 'Learn journal submission strategies with campus researchers and journal editors.',
    category: 'Academic',
    posterUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
    startTime: '2026-11-02 10:30',
    endTime: '2026-11-02 12:30',
    location: 'Library Lecture Theatre 2',
    organiser: { name: 'Graduate Research Office' },
    capacity: 60,
    registeredCount: 32,
    waitlistCount: 0,
    status: 'OPEN',
    isRegistered: false,
    isWaitlisted: false,
    isBookmarked: false,
  },
  {
    id: 'evt-005',
    title: 'Photography Club Workshop: Urban Lighting',
    description: 'Master low-light outdoor photography and portraiture techniques.',
    category: 'Club',
    posterUrl: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&q=80',
    startTime: '2026-11-20 16:30',
    endTime: '2026-11-20 19:00',
    location: 'Arts Building Studio 3',
    organiser: { name: 'Campus Shutterbugs Club' },
    capacity: 25,
    registeredCount: 25,
    waitlistCount: 3,
    status: 'WAITLIST',
    isRegistered: false,
    isWaitlisted: false,
    isBookmarked: false,
  },
]

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
  const events = ref<EventItem[]>(fallbackEvents.map((event) => ({ ...event })))

  // Mock Event Attendees Registry
  const eventAttendeesMap = ref<Record<string, AttendeeItem[]>>({
    'evt-001': [
      { id: 'st-101', name: 'Emily Chen', studentId: 'S2024001', email: 'emily.c@campus.edu', registeredAt: '2026-10-10 14:20', status: 'REGISTERED' },
      { id: 'st-102', name: 'Marcus Vance', studentId: 'S2024045', email: 'm.vance@campus.edu', registeredAt: '2026-10-11 09:15', status: 'CHECKED_IN' },
      { id: 'st-103', name: 'Sofia Rodriguez', studentId: 'S2024089', email: 'sofia.r@campus.edu', registeredAt: '2026-10-12 16:00', status: 'REGISTERED' },
      { id: 'st-104', name: 'Liam Taylor', studentId: 'S2024112', email: 'liam.t@campus.edu', registeredAt: '2026-10-14 11:30', status: 'REGISTERED' }
    ],
    'evt-002': [
      { id: 'st-201', name: 'David Kim', studentId: 'S2024220', email: 'dkim@campus.edu', registeredAt: '2026-10-05 10:00', status: 'REGISTERED' },
      { id: 'st-202', name: 'Jessica Alba', studentId: 'S2024301', email: 'jalba@campus.edu', registeredAt: '2026-10-06 15:45', status: 'REGISTERED' },
      { id: 'st-203', name: 'Brian Cox', studentId: 'S2024388', email: 'bcox@campus.edu', registeredAt: '2026-10-18 19:20', status: 'WAITLIST', waitlistRank: 1 },
      { id: 'st-204', name: 'Chloe Bennett', studentId: 'S2024410', email: 'chloe.b@campus.edu', registeredAt: '2026-10-19 08:10', status: 'WAITLIST', waitlistRank: 2 }
    ]
  })

  // Filter and Search state
  const searchQuery = ref('')
  const selectedCategory = ref<CategoryType | 'All'>('All')
  const activeTab = ref<'all' | 'registered' | 'waitlisted' | 'saved'>('all')

  // Computed Filtered Events (for Student Portal: strictly exclude drafts)
  const filteredEvents = computed(() => {
    return events.value.filter((event) => {
      // Students can only see public event states; drafts and pending reviews stay private.
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

    if (!supabase || !import.meta.env.VITE_SUPABASE_URL || !userId) return

    try {
      await supabase.from('registrations').insert({
        event_id: eventId,
        student_id: userId,
        status: targetStatus,
        attendance_status: 'pending',
      })
    } catch (e) {
      console.warn('Supabase registerEvent sync error:', e)
    }
  }

  // Actions: Persistent Cancel Registration in Supabase
  async function cancelRegistration(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event) return

    const authStore = useAuthStore()
    const userId = authStore.currentUser?.id

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

    if (!supabase || !import.meta.env.VITE_SUPABASE_URL || !userId) return

    try {
      await supabase
        .from('registrations')
        .delete()
        .eq('event_id', eventId)
        .eq('student_id', userId)
    } catch (e) {
      console.warn('Supabase cancelRegistration sync error:', e)
    }
  }

  /**
   * Real Supabase Event Creation (Supports Draft & Direct Publish)
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
    const hostName = eventPayload.organiserName || authStore.currentUser?.name || 'Campus Organiser'

    if (!organiserId && supabase && import.meta.env.VITE_SUPABASE_URL) {
      const { data: authData } = await supabase.auth.getUser()
      if (authData?.user) {
        organiserId = authData.user.id
      } else {
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
      // Safely attempt organiser profile upsert without throwing global errors
      try {
        await supabase.from('profiles').upsert(
          {
            id: organiserId,
            email: authStore.currentUser?.email || 'organiser@campus.edu',
            full_name: hostName,
            role: 'organiser',
          },
          { onConflict: 'id' }
        )
      } catch (profileErr) {
        console.warn('Profile sync notice:', profileErr)
      }

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
    const existingEvent = events.value.find((event) => event.id === eventId)
    if (
      existingEvent &&
      !eventPayload.isDraft &&
      !['draft', 'rejected'].includes(String(existingEvent.status).toLowerCase())
    ) {
      return {
        success: false,
        message: 'Approved events cannot be edited until the resubmission workflow is implemented.',
      }
    }

    const eventStatus = eventPayload.isDraft ? 'draft' : 'pending'

    // Clean bullet separators and safely extract HH:mm:ss
    let sTime = '14:00:00'
    let eTime = '18:00:00'
    if (eventPayload.startTime) {
      const clean = eventPayload.startTime.replace(/•/g, ' ').trim()
      const parts = clean.split(' ')
      const tStr = parts.find((p) => p.includes(':')) || '14:00'
      sTime = tStr.split(':').length === 2 ? `${tStr}:00` : tStr
    }
    if (eventPayload.endTime) {
      const clean = eventPayload.endTime.replace(/•/g, ' ').trim()
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
      target.status = eventPayload.isDraft ? ('DRAFT' as any) : 'OPEN'
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
   * Directly Publish a Draft Event
   */
  async function publishEventInSupabase(eventId: string): Promise<{ success: boolean; message?: string }> {
    const event = events.value.find((e) => e.id === eventId)
    if (event) {
      event.status = 'OPEN'
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
          console.warn('Supabase publishEvent error:', error)
          return { success: false, message: error.message }
        }
      } catch (err: any) {
        console.warn('Supabase publishEvent exception:', err)
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
      let userRegSet = new Set<string>()
      let userWaitlistSet = new Set<string>()
      let userSavedSet = new Set<string>()

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

  /**
   * Seed Published Events into Supabase 'events' Table when empty
   */
  async function seedInitialEventsToSupabase() {
    try {
      if (!supabase || !import.meta.env.VITE_SUPABASE_URL) return

      // Find an organiser profile ID if exists
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      let organiserId = profiles && profiles.length > 0 ? profiles[0]?.id : null

      // If no profile exists, try to get authenticated user or skip insert
      if (!organiserId) {
        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user) {
          organiserId = authData.user.id
        }
      }

      if (!organiserId) {
        // Cannot insert without organiser_id foreign key, keep static mockup events active
        return
      }

      const seedRows = [
        {
          title: 'AI & Future Tech Summit 2026',
          description:
            'Explore the next frontier of Large Language Models, Robotics, and Quantum Computing with leading researchers and industry speakers.',
          category: 'tech',
          event_date: '2026-10-28',
          start_time: '14:00:00',
          end_time: '18:00:00',
          location: 'Innovation Center Auditorium A',
          capacity: 120,
          image_url:
            'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
          status: 'published',
          organiser_id: organiserId,
        },
        {
          title: 'Academic Research & Publishing Seminar',
          description:
            'Learn journal submission strategies, peer review processes, and citation management from veteran professors and journal editors.',
          category: 'academic',
          event_date: '2026-11-02',
          start_time: '10:30:00',
          end_time: '12:30:00',
          location: 'Library Lecture Theatre 2',
          capacity: 60,
          image_url:
            'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
          status: 'published',
          organiser_id: organiserId,
        },
        {
          title: 'Inter-Department Football Championship',
          description:
            'Cheer for your faculty team in the ultimate campus football final! Matches start sharply at 3 PM. Refreshments available.',
          category: 'sports',
          event_date: '2026-10-30',
          start_time: '15:00:00',
          end_time: '18:30:00',
          location: 'Central Campus Stadium Field 1',
          capacity: 200,
          image_url:
            'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
          status: 'published',
          organiser_id: organiserId,
        },
        {
          title: 'International Cultural Fair & Food Fest',
          description:
            'Celebrate global diversity with traditional music, dance performances, costume showcases, and authentic food tasting booths.',
          category: 'cultural',
          event_date: '2026-11-12',
          start_time: '11:00:00',
          end_time: '17:00:00',
          location: 'Campus Main Plaza & Lawn',
          capacity: 350,
          image_url:
            'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
          status: 'published',
          organiser_id: organiserId,
        },
      ]

      const { data: insertedData, error: insertErr } = await supabase
        .from('events')
        .insert(seedRows)
        .select('*')

      if (!insertErr && insertedData && insertedData.length > 0) {
        // Re-run fetch after seeding
        await fetchEventsFromSupabase()
      }
    } catch (err) {
      console.warn('Seed initial events warning:', err)
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

  function resetUserActivity() {
    events.value.forEach((event) => {
      void cancelRegistration(event.id)
      event.isBookmarked = false
    })
    activeTab.value = 'all'
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
    publishEventInSupabase,
    toggleBookmark,
    registerEvent,
    cancelRegistration,
    resetUserActivity,
    // Organiser Portal exports
    addEvent,
    updateEvent,
    deleteEvent,
    getAttendees,
    promoteWaitlistAttendee,
    toggleCheckIn,
  }
})
