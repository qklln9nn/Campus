import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
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

export const useEventStore = defineStore('event', () => {
  // Rich Static Mock Events Dataset
  const events = ref<EventItem[]>([
    {
      id: 'evt-001',
      title: 'AI & Future Tech Summit 2026',
      description:
        'Explore the next frontier of Large Language Models, Robotics, and Quantum Computing with leading researchers and industry speakers.',
      category: 'Tech',
      posterUrl:
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
      startTime: '2026-10-28 14:00',
      endTime: '2026-10-28 18:00',
      location: 'Innovation Center Auditorium A',
      organiser: {
        name: 'School of Computer Science',
      },
      capacity: 120,
      registeredCount: 114,
      waitlistCount: 0,
      status: 'FILLING_FAST',
      isRegistered: false,
      isWaitlisted: false,
      isBookmarked: true,
    },
    {
      id: 'evt-002',
      title: 'Academic Research & Publishing Seminar',
      description:
        'Learn journal submission strategies, peer review processes, and citation management from veteran professors and journal editors.',
      category: 'Academic',
      posterUrl:
        'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
      startTime: '2026-11-02 10:30',
      endTime: '2026-11-02 12:30',
      location: 'Library Lecture Theatre 2',
      organiser: {
        name: 'Graduate Research Office',
      },
      capacity: 60,
      registeredCount: 32,
      waitlistCount: 0,
      status: 'OPEN',
      isRegistered: false,
      isWaitlisted: false,
      isBookmarked: false,
    },
    {
      id: 'evt-003',
      title: 'Inter-Department Football Championship',
      description:
        'Cheer for your faculty team in the ultimate campus football final! Matches start sharply at 3 PM. Refreshments available.',
      category: 'Sports',
      posterUrl:
        'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
      startTime: '2026-10-30 15:00',
      endTime: '2026-10-30 18:30',
      location: 'Central Campus Stadium Field 1',
      organiser: {
        name: 'Campus Sports Union',
      },
      capacity: 200,
      registeredCount: 145,
      waitlistCount: 0,
      status: 'OPEN',
      isRegistered: true,
      isWaitlisted: false,
      isBookmarked: true,
    },
    {
      id: 'evt-004',
      title: 'International Cultural Fair & Food Fest',
      description:
        'Celebrate global diversity with traditional music, dance performances, costume showcases, and authentic food tasting booths.',
      category: 'Cultural',
      posterUrl:
        'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
      startTime: '2026-11-12 11:00',
      endTime: '2026-11-12 17:00',
      location: 'Campus Main Plaza & Lawn',
      organiser: {
        name: 'International Student Association',
      },
      capacity: 350,
      registeredCount: 320,
      waitlistCount: 0,
      status: 'FILLING_FAST',
      isRegistered: false,
      isWaitlisted: false,
      isBookmarked: false,
    },
    {
      id: 'evt-005',
      title: 'Photography Club Workshop: Urban Lighting',
      description:
        'Master low-light outdoor photography and portraiture techniques with professional equipment and guided hands-on practice.',
      category: 'Club',
      posterUrl:
        'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=800&q=80',
      startTime: '2026-11-20 16:30',
      endTime: '2026-11-20 19:00',
      location: 'Arts Building Studio 3',
      organiser: {
        name: 'Campus Shutterbugs Club',
      },
      capacity: 25,
      registeredCount: 25,
      waitlistCount: 3,
      status: 'WAITLIST',
      isRegistered: false,
      isWaitlisted: true,
      isBookmarked: false,
    },
    {
      id: 'evt-006',
      title: 'Fall Career & Internship Expo 2026',
      description:
        'Connect directly with recruiters from top companies across Tech, Finance, Consulting, and Engineering. Bring your CV!',
      category: 'Career',
      posterUrl:
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      startTime: '2026-11-18 09:30',
      endTime: '2026-11-18 16:00',
      location: 'Exhibition Hall B',
      organiser: {
        name: 'Career Development Center',
      },
      capacity: 500,
      registeredCount: 480,
      waitlistCount: 0,
      status: 'FILLING_FAST',
      isRegistered: false,
      isWaitlisted: false,
      isBookmarked: true,
    },
  ])

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

  // Computed Filtered Events
  const filteredEvents = computed(() => {
    return events.value.filter((event) => {
      // Tab filter
      if (activeTab.value === 'registered' && !event.isRegistered) return false
      if (activeTab.value === 'waitlisted' && !event.isWaitlisted) return false
      if (activeTab.value === 'saved' && !event.isBookmarked) return false

      // Category filter
      if (selectedCategory.value !== 'All' && event.category !== selectedCategory.value) {
        return false
      }

      // Search query
      if (searchQuery.value.trim() !== '') {
        const query = searchQuery.value.toLowerCase()
        const matchesTitle = event.title.toLowerCase().includes(query)
        const matchesLoc = event.location.toLowerCase().includes(query)
        const matchesDesc = event.description.toLowerCase().includes(query)
        const matchesOrganiser = event.organiser.name.toLowerCase().includes(query)
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
  function toggleBookmark(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (event) {
      event.isBookmarked = !event.isBookmarked
    }
  }

  function registerEvent(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event) return

    if (event.isRegistered) return

    if (event.registeredCount < event.capacity) {
      event.registeredCount++
      event.isRegistered = true
      if (event.registeredCount >= event.capacity) {
        event.status = 'WAITLIST'
      } else if (event.registeredCount >= event.capacity * 0.8) {
        event.status = 'FILLING_FAST'
      }
    } else {
      // Join waitlist
      if (!event.isWaitlisted) {
        event.waitlistCount++
        event.isWaitlisted = true
        event.status = 'WAITLIST'
      }
    }
  }

  function cancelRegistration(eventId: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!event) return

    if (event.isRegistered) {
      event.isRegistered = false
      event.registeredCount = Math.max(0, event.registeredCount - 1)

      if (event.registeredCount < event.capacity * 0.8) {
        event.status = 'OPEN'
      } else if (event.registeredCount < event.capacity) {
        event.status = 'FILLING_FAST'
      }
    } else if (event.isWaitlisted) {
      event.isWaitlisted = false
      event.waitlistCount = Math.max(0, event.waitlistCount - 1)
    }
  }

  // --- ORGANISER PORTAL ACTIONS ---
  function addEvent(newEvent: Omit<EventItem, 'id' | 'registeredCount' | 'waitlistCount' | 'status' | 'isRegistered' | 'isWaitlisted' | 'isBookmarked'>) {
    const newId = `evt-${Date.now()}`
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

  function deleteEvent(eventId: string) {
    const index = events.value.findIndex((e) => e.id === eventId)
    if (index !== -1) {
      events.value.splice(index, 1)
      delete eventAttendeesMap.value[eventId]
    }
  }

  /**
   * Fetch Real Events Data from Supabase Table 'events'
   */
  async function fetchEventsFromSupabase() {
    try {
      if (supabase && import.meta.env.VITE_SUPABASE_URL) {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'approved')

        if (!error && data && data.length > 0) {
          events.value = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description || '',
            category: (item.category || 'Tech') as CategoryType,
            posterUrl: item.poster_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
            startTime: item.start_time || '2026-10-28 14:00',
            endTime: item.end_time || '2026-10-28 18:00',
            location: item.location || 'Campus Center Auditorium',
            organiser: {
              name: item.organiser_name || 'Campus Activity Board',
            },
            capacity: item.capacity || 100,
            registeredCount: item.registered_count || 0,
            waitlistCount: item.waitlist_count || 0,
            status: item.registered_count >= item.capacity ? 'WAITLIST' : 'OPEN',
            isRegistered: false,
            isWaitlisted: false,
            isBookmarked: false,
          }))
        }
      }
    } catch (e) {
      console.warn('Supabase fetchEvents warning, using static fallback events:', e)
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
    toggleBookmark,
    registerEvent,
    cancelRegistration,
    // Organiser Portal exports
    addEvent,
    updateEvent,
    deleteEvent,
    getAttendees,
    promoteWaitlistAttendee,
    toggleCheckIn,
  }
})
