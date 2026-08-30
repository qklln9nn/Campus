import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { supabase } from '@/lib/supabase'

export type EventModerationStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'rejected'
  | 'cancelled'
  | 'completed'

export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'

export interface ModerationEvent {
  id: string
  title: string
  description: string
  category: string
  poster: string
  organiser: string
  contactEmail: string
  location: string
  date: string
  submittedDate: string
  status: EventModerationStatus
  capacity: number
  rejectionReason: string
}

export interface ModerationReport {
  id: string
  eventId: string
  targetTitle: string
  reporter: string
  createdAt: string
  reasonType: string
  details: string
  status: ReportStatus
}

type Relation = Record<string, unknown> | Record<string, unknown>[] | null

interface RawModerationEvent {
  id: string
  title: string
  description: string | null
  category: string
  event_date: string
  start_time: string
  location: string | null
  online_link: string | null
  capacity: number
  image_url: string | null
  status: string
  rejection_reason: string | null
  created_at: string
  organiser: Relation
}

interface RawModerationReport {
  id: string
  event_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
  event: Relation
  reporter: Relation
}

function firstRelation(value: Relation): Record<string, unknown> {
  return Array.isArray(value) ? (value[0] ?? {}) : (value ?? {})
}

function messageFrom(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return fallback
}

export const useModerationStore = defineStore('moderation', () => {
  const events = ref<ModerationEvent[]>([])
  const reports = ref<ModerationReport[]>([])
  const loadingEvents = ref(false)
  const loadingReports = ref(false)
  const submittingReport = ref(false)
  const errorMessage = ref('')

  const pendingEventCount = computed(
    () => events.value.filter((event) => event.status === 'pending').length,
  )
  const pendingReportCount = computed(
    () => reports.value.filter((report) => report.status === 'pending').length,
  )

  async function fetchEvents(): Promise<void> {
    loadingEvents.value = true
    errorMessage.value = ''
    try {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id,title,description,category,event_date,start_time,location,online_link,capacity,image_url,status,rejection_reason,created_at,organiser:profiles!events_organiser_id_fkey(full_name,email)',
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      const rows = (data ?? []) as RawModerationEvent[]
      events.value = rows.map((row) => {
        const organiser = firstRelation(row.organiser)
        return {
          id: row.id,
          title: row.title,
          description: row.description ?? '',
          category: row.category,
          poster: row.image_url ?? '',
          organiser: String(organiser.full_name ?? 'Unknown organiser'),
          contactEmail: String(organiser.email ?? ''),
          location: row.location ?? row.online_link ?? 'Online',
          date: `${row.event_date} ${String(row.start_time).slice(0, 5)}`,
          submittedDate: new Date(row.created_at).toLocaleDateString(),
          status: row.status as EventModerationStatus,
          capacity: row.capacity,
          rejectionReason: row.rejection_reason ?? '',
        }
      })
    } catch (error) {
      errorMessage.value = messageFrom(error, 'Unable to load events for moderation.')
      throw error
    } finally {
      loadingEvents.value = false
    }
  }

  async function reviewEvent(
    eventId: string,
    decision: 'approve' | 'reject',
    rejectionReason?: string,
  ): Promise<void> {
    const { error } = await supabase.rpc('review_event', {
      p_event_id: eventId,
      p_decision: decision,
      p_rejection_reason: rejectionReason?.trim() || null,
    })
    if (error) throw error
    await fetchEvents()
  }

  async function cancelEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', eventId)
    if (error) throw error
    await fetchEvents()
  }

  async function submitReport(
    eventId: string,
    reason: string,
    description: string,
  ): Promise<void> {
    submittingReport.value = true
    try {
      const { data, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!data.user) throw new Error('Please sign in before reporting an event.')

      const { error } = await supabase.from('reports').insert({
        reporter_id: data.user.id,
        event_id: eventId,
        reason: reason.trim(),
        description: description.trim(),
      })
      if (error?.code === '23505') {
        throw new Error('You have already reported this event.')
      }
      if (error) throw error
    } finally {
      submittingReport.value = false
    }
  }

  async function fetchReports(): Promise<void> {
    loadingReports.value = true
    errorMessage.value = ''
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(
          'id,event_id,reason,description,status,created_at,event:events!reports_event_id_fkey(title),reporter:profiles!reports_reporter_id_fkey(full_name,email)',
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      const rows = (data ?? []) as RawModerationReport[]
      reports.value = rows.map((row) => {
        const event = firstRelation(row.event)
        const reporter = firstRelation(row.reporter)
        return {
          id: row.id,
          eventId: row.event_id,
          targetTitle: String(event.title ?? 'Deleted event'),
          reporter: String(reporter.full_name ?? reporter.email ?? 'Campus user'),
          createdAt: new Date(row.created_at).toLocaleString(),
          reasonType: row.reason,
          details: row.description || 'No additional details provided.',
          status: row.status as ReportStatus,
        }
      })
    } catch (error) {
      errorMessage.value = messageFrom(error, 'Unable to load reports.')
      throw error
    } finally {
      loadingReports.value = false
    }
  }

  async function moderateReport(
    reportId: string,
    resolution: Exclude<ReportStatus, 'pending'>,
    takeDownEvent = false,
  ): Promise<void> {
    const { error } = await supabase.rpc('moderate_report', {
      p_report_id: reportId,
      p_resolution: resolution,
      p_take_down_event: takeDownEvent,
    })
    if (error) throw error
    await fetchReports()
  }

  return {
    events,
    reports,
    loadingEvents,
    loadingReports,
    submittingReport,
    errorMessage,
    pendingEventCount,
    pendingReportCount,
    fetchEvents,
    reviewEvent,
    cancelEvent,
    submitReport,
    fetchReports,
    moderateReport,
  }
})
