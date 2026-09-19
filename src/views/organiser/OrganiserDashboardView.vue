<template>
  <OrganiserLayout>
    <div class="organiser-dashboard">
      <header class="page-heading">
        <div>
          <p class="eyebrow">YOUR CAMPUS, YOUR EVENTS</p>
          <h1>My Events</h1>
          <p>Create something worth coming to. Manage your events and attendees here.</p>
        </div>
        <el-button type="primary" size="large" @click="router.push('/create')">
          <el-icon class="el-icon--left"><Plus /></el-icon>Create Event
        </el-button>
      </header>

      <dl class="overview" aria-label="Event overview">
        <div><dt>Events</dt><dd>{{ ownEvents.length }}</dd></div>
        <div><dt>Confirmed registrations</dt><dd>{{ registrationCount }}</dd></div>
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
              <el-button v-else type="primary" plain :disabled="eventStore.attendeesLoading" @click="openAttendees(event)">View Attendees</el-button>
              <div class="secondary-actions">
                <el-button :disabled="busyId !== ''" @click="editEvent(event.id)">Edit</el-button>
                <el-button type="danger" text :disabled="busyId !== ''" @click="deleteEvent(event)">Delete</el-button>
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
function statusGroup(status: EventStatus) {
  if (['OPEN', 'FILLING_FAST', 'WAITLIST'].includes(status)) return 'published'
  if (status === 'PENDING') return 'pending'
  if (status === 'DRAFT') return 'draft'
  return 'other'
}
const ownEvents = computed(() => {
  const id = authStore.currentUser?.id
  return id ? eventStore.events.filter(event => event.organiserId === id) : []
})
const registrationCount = computed(() => ownEvents.value.reduce((sum, event) => sum + event.registeredCount, 0))
const waitlistCount = computed(() => ownEvents.value.reduce((sum, event) => sum + event.waitlistCount, 0))
function countStatus(status: string) {
  return ownEvents.value.filter(event => status === 'all' || statusGroup(event.status) === status).length
}
const filteredEvents = computed(() => {
  const query = search.value.trim().toLowerCase()
  return ownEvents.value.filter(event =>
    (statusFilter.value === 'all' || statusGroup(event.status) === statusFilter.value) &&
    [event.title, event.location, event.category].some(value => value.toLowerCase().includes(query)),
  )
})
const paginatedEvents = computed(() => filteredEvents.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch([search, statusFilter], () => { page.value = 1 })
watch(() => filteredEvents.value.length, count => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(count / pageSize)))
})
function resetFilters() { search.value = ''; statusFilter.value = 'all' }
function editEvent(id: string) { void router.push({ path: '/create', query: { id } }) }

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

async function confirmAction(message: string, title: string, button: string) {
  try {
    await ElMessageBox.confirm(message, title, { confirmButtonText: button, cancelButtonText: 'Cancel', type: 'warning' })
    return true
  } catch { return false }
}
async function submitDraft(event: EventItem) {
  if (busyId.value) return
  if (!await confirmAction(`Submit "${event.title}" for review? It stays private until approved.`, 'Submit event', 'Submit')) return
  busyId.value = event.id
  const previousStatus = event.status
  try {
    const result = await eventStore.submitEventForReview(event.id)
    if (!result.success) throw new Error(result.message || 'Submission failed.')
    ElMessage.success('Submitted for administrator review.')
  } catch (error) {
    const current = eventStore.events.find(item => item.id === event.id)
    if (current) current.status = previousStatus
    ElMessage.error(error instanceof Error ? error.message : 'Submission failed.')
  } finally { busyId.value = '' }
}
async function deleteEvent(event: EventItem) {
  if (busyId.value) return
  if (!await confirmAction(`Delete "${event.title}"? This cannot be undone.`, 'Delete event', 'Delete')) return
  busyId.value = event.id
  // The existing store removes locally before saving. Keep a snapshot for failure recovery.
  const previousEvents = [...eventStore.events]
  try {
    const result = await eventStore.deleteEvent(event.id)
    if (!result.success) throw new Error(result.message || 'Deletion failed.')
    ElMessage.success('Event deleted.')
  } catch (error) {
    eventStore.events = previousEvents
    ElMessage.error(error instanceof Error ? error.message : 'Deletion failed.')
  } finally { busyId.value = '' }
}

const selectedEvent = computed(() => ownEvents.value.find(event => event.id === selectedId.value))
const attendees = computed(() => eventStore.getAttendees(selectedId.value))
const confirmedAttendees = computed(() => attendees.value.filter(person => person.status !== 'WAITLIST'))
const waitingAttendees = computed(() => attendees.value.filter(person => person.status === 'WAITLIST'))
async function openAttendees(event: EventItem) {
  if (eventStore.attendeesLoading) return
  selectedId.value = event.id
  attendeeTab.value = 'registered'
  drawerOpen.value = true
  await loadAttendees()
}
async function loadAttendees() {
  if (!selectedId.value || eventStore.attendeesLoading) return
  await eventStore.fetchEventAttendees(selectedId.value)
}
</script>

<style scoped src="@/assets/styles/OrganiserDashboard.css"></style>
