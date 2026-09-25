<template>
  <OrganiserLayout>
    <div class="organiser-dashboard">
      <header class="page-heading">
        <div>
          <p class="eyebrow">ORGANISER DASHBOARD</p>
          <h1>My Campus Events</h1>
          <p>Create, edit and oversee your events. Review submissions, monitor sign‑ups and manage attendees.</p>
        </div>
        <el-button type="primary" size="large" @click="router.push('/create')">
          <el-icon class="el-icon--left"><Plus /></el-icon>Create Event
        </el-button>
      </header>

      <dl class="overview" aria-label="Event overview">
        <div><dt>All Events</dt><dd>{{ ownEvents.length }}</dd></div>
        <div><dt>Open Events</dt><dd>{{ openEvents.length }}</dd></div>
        <div><dt>Pending Events</dt><dd>{{ pendingEvents.length }}</dd></div>
        <div><dt>Cancel Events</dt><dd>{{ cancelledEvents.length }}</dd></div>
        <div><dt>On waitlists</dt><dd>{{ waitlistCount }}</dd></div>
      </dl>

      <section class="events-panel" aria-label="Your events">
        <div class="list-tools">
          <div class="status-filters" aria-label="Filter by status">
            <button v-for="tab in statusTabs" :key="tab.value" type="button"
              :class="{ selected: statusFilter === tab.value }"
              :aria-pressed="statusFilter === tab.value" @click="statusFilter = tab.value">
              {{ tab.label }} <span>{{ countStatus(tab.value) }}</span>
            </button>
          </div>
          <div class="search-tools">
            <el-input v-model="search" clearable placeholder="Search your events" aria-label="Search your events">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-button :loading="loading" :disabled="busyId !== ''" @click="loadEvents">Refresh</el-button>
          </div>
        </div>

        <el-skeleton v-if="loading" :rows="6" animated class="list-loading" />
        <template v-else>
          <el-empty v-if="filteredEvents.length === 0" description="No events to show.">
            <el-button v-if="search || statusFilter !== 'all'" @click="resetFilters">Clear filters</el-button>
            <el-button v-else type="primary" @click="router.push('/create')">Create your first event</el-button>
          </el-empty>
          <article v-for="event in paginatedEvents" :key="event.id" class="event-row">
            <img class="event-poster" :src="event.posterUrl || DEFAULT_FALLBACK_POSTER" :alt="event.title"
              loading="lazy" @error="handlePosterError($event, event.category)" />
            <div class="event-info">
              <div class="event-labels"><span>{{ event.category }}</span><span class="status-label" :data-status="event.status">{{ statusLabel(event.status) }}</span></div>
              <h2>{{ event.title }}</h2>
              <p>{{ event.startTime }}</p>
              <p>{{ event.location }}</p>
              <div class="attendance-counts"><strong>{{ event.registeredCount }} / {{ event.capacity }}</strong> registered <span>· {{ event.waitlistCount }} waitlisted</span></div>
            </div>
            <div class="event-actions">
              <el-button v-if="event.status === 'DRAFT'" type="primary" :loading="busyId === event.id" :disabled="busyId !== ''" @click="submitDraft(event)">Submit for Review</el-button>
              <el-button v-else-if="canViewAttendees(event)" type="primary" plain :disabled="eventStore.attendeesLoading" @click="openAttendees(event)">View Attendees</el-button>
              <span v-else class="action-note">No attendee list for this status</span>
              <div class="secondary-actions">
                <el-button v-if="canEdit(event)" :disabled="busyId !== ''" @click="editEvent(event.id)">Edit</el-button>
                <el-button v-if="canCancel(event)" type="danger" plain :loading="busyId === event.id" :disabled="busyId !== ''" @click="cancelEvent(event)">Cancel</el-button>
                <el-button v-if="canDelete(event)" type="danger" text :disabled="busyId !== ''" @click="deleteEvent(event)">Delete</el-button>
              </div>
            </div>
          </article>
          <div v-if="filteredEvents.length > pageSize" class="pagination">
            <el-pagination v-model:current-page="page" :page-size="pageSize" :total="filteredEvents.length" layout="prev, pager, next" />
          </div>
        </template>
      </section>

      <el-drawer v-model="drawerOpen" title="Event attendees" size="min(720px, 100vw)" destroy-on-close>
        <div class="attendee-panel">
          <h2>{{ selectedEvent?.title }}</h2>
          <el-skeleton v-if="eventStore.attendeesLoading" :rows="5" animated />
          <template v-else-if="eventStore.attendeesError">
            <el-alert :title="eventStore.attendeesError" type="error" :closable="false" show-icon />
            <el-button @click="loadAttendees">Retry</el-button>
          </template>
          <template v-else>
            <div class="attendee-toolbar">
              <p>{{ confirmedAttendees.length }} confirmed · {{ waitingAttendees.length }} waitlisted</p>
              <el-button @click="loadAttendees">Refresh</el-button>
            </div>
            <el-tabs v-model="attendeeTab">
              <el-tab-pane label="Registered" name="registered" />
              <el-tab-pane label="Waitlist" name="waitlist" />
            </el-tabs>
            <el-table :data="attendeeTab === 'registered' ? confirmedAttendees : waitingAttendees" empty-text="No attendees in this list." style="width: 100%">
              <el-table-column v-if="attendeeTab === 'waitlist'" prop="waitlistRank" label="Queue" width="80" />
              <el-table-column prop="name" label="Name" min-width="130" />
              <el-table-column prop="email" label="Email" min-width="200" />
              <el-table-column prop="registeredAt" label="Registered on" min-width="180" />
              <el-table-column v-if="attendeeTab === 'registered'" label="Actions" min-width="120">
                <template #default="scope">
                  <el-button 
                    size="small" 
                    :type="scope.row.status === 'CHECKED_IN' ? 'success' : 'default'" 
                    @click="eventStore.toggleCheckIn(selectedId, scope.row.id)"
                  >
                    {{ scope.row.status === 'CHECKED_IN' ? 'Checked In' : 'Check In' }}
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </div>
      </el-drawer>
    </div>
  </OrganiserLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import OrganiserLayout from '@/layouts/OrganiserLayout.vue'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'
import { DEFAULT_FALLBACK_POSTER, handlePosterError } from '@/lib/posterFallback'
import { cancelOwnedEvent } from '@/lib/organiserEvents'
import type { EventItem, EventStatus } from '@/types/event'

const router = useRouter()
const authStore = useAuthStore()
const eventStore = useEventStore()
const search = ref('')
const statusFilter = ref('all')
const page = ref(1)
const pageSize = 6
const loading = ref(false)
const busyId = ref('')
const drawerOpen = ref(false)
const selectedId = ref('')
const attendeeTab = ref('registered')

//Top status category bar
const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Drafts' },
  { value: 'other', label: 'Other' },
]
const statusLabels: Record<EventStatus, string> = {
  OPEN: 'Published', FILLING_FAST: 'Filling fast', WAITLIST: 'Waitlist open',
  DRAFT: 'Draft', PENDING: 'Pending review', REJECTED: 'Rejected',
  CANCELLED: 'Cancelled', CLOSED: 'Closed', COMPLETED: 'Completed',
}
function statusLabel(status: EventStatus) { return statusLabels[status] || status }

//Filter logic for top status bar
//Classify the status of the event into five catagories
function statusGroup(status: EventStatus) {
  if (['OPEN', 'FILLING_FAST', 'WAITLIST'].includes(status)) return 'published'
  if (status === 'PENDING') return 'pending'
  if (status === 'DRAFT') return 'draft'
  return 'other'
}

//============== computed properties ==================
// Get the events owned by the current user
// filter the current organiser's events
const ownEvents = computed(() => {
  const id = authStore.currentUser?.id
  return id ? eventStore.events.filter(event => event.organiserId === id) : []
})

// count the data
const pendingEvents = computed(() => ownEvents.value.filter(event => event.status === 'PENDING'))
const openEvents = computed(() => ownEvents.value.filter(event => ['OPEN', 'FILLING_FAST', 'WAITLIST'].includes(event.status)))

const cancelledEvents = computed(() => ownEvents.value.filter(event => event.status === 'CANCELLED'))
const waitlistCount = computed(() => ownEvents.value.reduce((sum, event) => sum + event.waitlistCount, 0))
function countStatus(status: string) {
  return ownEvents.value.filter(event => status === 'all' || statusGroup(event.status) === status).length
}

// Filter the events based on the search query and status filter
const filteredEvents = computed(() => {
  const query = search.value.trim().toLowerCase()
  return ownEvents.value.filter(event =>
    (statusFilter.value === 'all' || statusGroup(event.status) === statusFilter.value) &&
    [event.title, event.location, event.category].some(value => value.toLowerCase().includes(query)),
  )
})
//分页逻辑
//Slice the filtered list to extract only items for the current page (e.g., extract index 0 to 6 for page 1) for display.
const paginatedEvents = computed(() => filteredEvents.value.slice((page.value - 1) * pageSize, page.value * pageSize))

// Reset the page to 1 when the search query or status filter changes
watch([search, statusFilter], () => { page.value = 1 })
//Reset the page to 1 when the filtered events count changes
watch(() => filteredEvents.value.length, count => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(count / pageSize)))
})
//Reset the filters when the user clicks the reset button
function resetFilters() { search.value = ''; statusFilter.value = 'all' }

function editEvent(id: string) { void router.push({ path: '/create', query: { id } }) }

function canDelete(event: EventItem) {
  return ['DRAFT', 'REJECTED', 'CANCELLED'].includes(event.status)
}

function canEdit(event: EventItem) {
  return event.status !== 'COMPLETED' && event.status !== 'CLOSED'
}
function canCancel(event: EventItem) {
  return ['OPEN', 'FILLING_FAST', 'WAITLIST', 'PENDING'].includes(event.status)
}
function canViewAttendees(event: EventItem) {
  return ['OPEN', 'FILLING_FAST', 'WAITLIST', 'COMPLETED', 'CLOSED'].includes(event.status)
}

// when load the data from supabase
async function loadEvents() {
  if (loading.value) return
  loading.value = true
  try {
    await eventStore.fetchEventsFromSupabase()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to load events.')
  } finally { loading.value = false }
}
onMounted(loadEvents)

async function confirmAction(
  message: string,
  title: string,
  confirmButton: string,
  cancelButton = 'Go back',
): Promise<boolean> {
  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: confirmButton,
      cancelButtonText: cancelButton,
      type: 'warning',
    })

    return true
  } catch {
    return false
  }
}

//submit the draft to admin
async function submitDraft(event: EventItem) {
  if (busyId.value) return
  if (!await confirmAction(`Submit "${event.title}" for review? It stays private until approved.`, 'Submit event', 'Submit')) return
  busyId.value = event.id
  const previousStatus = event.status
  try {
    //Call the action in Pinia, send a request to the backend, and submit this draft for review.
    const result = await eventStore.submitEventForReview(event.id)
    if (!result.success) throw new Error(result.message || 'Submission failed.')
    ElMessage.success('Submitted for administrator review.')
  } catch (error) {
    const current = eventStore.events.find(item => item.id === event.id)
    if (current) current.status = previousStatus
    ElMessage.error(error instanceof Error ? error.message : 'Submission failed.')
  } finally { busyId.value = '' }
}

//delete the event
async function deleteEvent(event: EventItem) {
  if (busyId.value) return
  if (!canDelete(event)) {
    ElMessage.warning('Only draft, rejected, or cancelled events can be permanently deleted.')
    return
  }
  if (!await confirmAction(`Delete "${event.title}"? This cannot be undone.`, 'Delete event', 'Delete')) return
  busyId.value = event.id
  // The existing store removes locally before saving. Keep a snapshot for failure recovery.
  //备份一下当前所有活动的数据，如果失败了，可以恢复
  const previousEvents = [...eventStore.events]
  try {
    //call Pinia action, ask backend to delete this event
    const result = await eventStore.deleteEvent(event.id)
    if (!result.success) throw new Error(result.message || 'Deletion failed.')
    ElMessage.success('Event deleted.')
  } catch (error) {
    eventStore.events = previousEvents
    ElMessage.error(error instanceof Error ? error.message : 'Deletion failed.')
  } finally { busyId.value = '' }
}

async function cancelEvent(event: EventItem) {
  if (busyId.value || !canCancel(event)) return

  const confirmed = await confirmAction(
    `Cancel "${event.title}"? The event will stop accepting registrations. This action does not automatically notify students.`,
    'Cancel this event?',
    'Yes, cancel event',
    'Keep event',
  )

  if (!confirmed) return

  busyId.value = event.id

  try {
    // 先更新数据库，不提前修改前端状态
    await cancelOwnedEvent(event.id)

    // 数据库成功后重新读取，确保页面与 Supabase 完全一致
    await eventStore.fetchEventsFromSupabase()

    const updatedEvent = eventStore.events.find(
      (item) => item.id === event.id,
    )

    if (!updatedEvent || updatedEvent.status !== 'CANCELLED') {
      throw new Error(
        'The database was updated, but the refreshed event status could not be confirmed.',
      )
    }

    ElMessage.success(
      'Event cancelled successfully. It can now be permanently deleted.',
    )
  } catch (error) {
    console.warn('Cancel event error:', error)

    // 更新失败时重新读取数据库，避免页面显示假的 CANCELLED
    await eventStore.fetchEventsFromSupabase()

    ElMessage.error({
      message:
        error instanceof Error
          ? error.message
          : 'The event could not be cancelled.',
      duration: 6000,
    })
  } finally {
    busyId.value = ''
  }
}

//get the selected event attendees
const selectedEvent = computed(() => ownEvents.value.find(event => event.id === selectedId.value))
//// get the list of attendees
const attendees = computed(() => eventStore.getAttendees(selectedId.value))
//display the list of attendees
const confirmedAttendees = computed(() => attendees.value.filter(person => person.status !== 'WAITLIST'))
//display the list of waiting attendees
const waitingAttendees = computed(() => attendees.value.filter(person => person.status === 'WAITLIST'))
//open the attendees drawer
async function openAttendees(event: EventItem) {
  if (eventStore.attendeesLoading) return
  selectedId.value = event.id
  attendeeTab.value = 'registered'
  drawerOpen.value = true
  await loadAttendees()
}
//load the attendees data
async function loadAttendees() {
  if (!selectedId.value || eventStore.attendeesLoading) return
  await eventStore.fetchEventAttendees(selectedId.value)
}
</script>

<style scoped src="@/assets/styles/OrganiserDashboard.css"></style>
