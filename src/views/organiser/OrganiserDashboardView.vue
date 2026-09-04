<template>
  <OrganiserLayout>
    <div class="organiser-dashboard">
      <!-- Welcome Header -->
      <div class="dashboard-header">
        <div>
          <span class="header-badge">ORGANISER COMMAND CENTER</span>
          <h2 class="dashboard-title">Event Operations & Management</h2>
          <p class="dashboard-subtitle">Monitor live registrations, promote waitlist queues, and send event updates.</p>
        </div>
        <router-link to="/create">
          <el-button type="primary" size="large" class="header-action-btn">
            <el-icon><Plus /></el-icon> Create New Event
          </el-button>
        </router-link>
      </div>

      <!-- KPI Summary Cards Grid -->
      <el-row :gutter="20" class="kpi-row">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="kpi-card">
            <div class="kpi-icon-bg bg-purple">
              <el-icon><Calendar /></el-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">{{ totalHostedEvents }}</span>
              <span class="kpi-label">Hosted Events</span>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="kpi-card">
            <div class="kpi-icon-bg bg-blue">
              <el-icon><User /></el-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">{{ totalRegistrations }}</span>
              <span class="kpi-label">Total Attendees</span>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="kpi-card">
            <div class="kpi-icon-bg bg-orange">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">{{ totalWaitlist }}</span>
              <span class="kpi-label">Waitlist Queue</span>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :md="6">
          <div class="kpi-card">
            <div class="kpi-icon-bg bg-green">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="kpi-info">
              <span class="kpi-value">{{ avgFillRate }}%</span>
              <span class="kpi-label">Avg. Fill Rate</span>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- Managed Events Section -->
      <el-card class="main-content-card" shadow="never">
        <!-- Toolbar Header with Status Tabs and View Switcher -->
        <div class="toolbar-header">
          <div class="status-filter-bar">
            <el-radio-group v-model="activeStatusTab" size="default" class="view-radio-tabs">
              <el-radio-button value="all">All Events ({{ allCount }})</el-radio-button>
              <el-radio-button value="published">Published ({{ publishedCount }})</el-radio-button>
              <el-radio-button value="pending">Pending Review ({{ pendingCount }})</el-radio-button>
              <el-radio-button value="draft">Draft / Upcoming ({{ draftCount }})</el-radio-button>
              <el-radio-button value="completed">Completed ({{ completedCount }})</el-radio-button>
            </el-radio-group>
          </div>

          <div class="toolbar-actions">
            <!-- View Switcher Toggle -->
            <el-radio-group v-model="viewMode" size="default" class="view-switch">
              <el-radio-button value="grid">
                <el-icon><Grid /></el-icon> Card Grid
              </el-radio-button>
              <el-radio-button value="table">
                <el-icon><Menu /></el-icon> Table List
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 1. GRID VIEW MODE (Organiser Custom Cards) -->
        <div v-if="viewMode === 'grid'" class="grid-view-container">
          <div v-if="paginatedTableData.length > 0" class="cards-grid">
            <div
              v-for="event in paginatedTableData"
              :key="event.id"
              class="organiser-event-card"
            >
              <!-- Card Top Poster with Overlay Badges -->
              <div class="card-cover-wrapper">
                <img
                  :src="event.posterUrl || DEFAULT_FALLBACK_POSTER"
                  :alt="event.title"
                  class="card-cover-img"
                  @error="e => handlePosterError(e, event.category)"
                />

                <div class="cover-overlay-top">
                  <el-tag size="small" effect="dark" type="info" class="category-chip">
                    {{ event.category }}
                  </el-tag>
                  <el-tag :type="getStatusTagType(event.status)" effect="dark" class="status-chip">
                    {{ event.status.replace('_', ' ') }}
                  </el-tag>
                </div>
              </div>

              <!-- Card Body Content -->
              <div class="card-body">
                <h4 class="card-event-title" :title="event.title">{{ event.title }}</h4>

                <div class="card-meta-list">
                  <div class="meta-row">
                    <el-icon><Calendar /></el-icon>
                    <span>{{ event.startTime }}</span>
                  </div>
                  <div class="meta-row">
                    <el-icon><Location /></el-icon>
                    <span class="truncate-text">{{ event.location }}</span>
                  </div>
                </div>

                <!-- Registration Progress Block -->
                <div class="progress-box">
                  <div class="progress-info">
                    <span class="progress-lbl">Registration Seats</span>
                    <span class="progress-nums">
                      <strong>{{ event.registeredCount }}</strong> / {{ event.capacity }}
                      <span v-if="event.waitlistCount > 0" class="waitlist-num">
                        (+{{ event.waitlistCount }} Queue)
                      </span>
                    </span>
                  </div>
                  <el-progress
                    :percentage="getFillPct(event)"
                    :status="getFillStatus(event)"
                    :stroke-width="8"
                    :show-text="false"
                  />
                </div>
              </div>

              <!-- Card Action Footer -->
              <div class="card-action-footer">
                <template v-if="(event.status as string).toLowerCase() === 'draft'">
                  <el-button
                    size="default"
                    type="success"
                    class="flex-1-btn"
                    @click="handlePublishDraft(event)"
                  >
                    <el-icon><Upload /></el-icon> Submit
                  </el-button>

                  <el-button
                    size="default"
                    type="primary"
                    plain
                    class="flex-1-btn"
                    @click="handleEdit(event.id)"
                  >
                    <el-icon><Edit /></el-icon> Edit
                  </el-button>
                </template>
                <template v-else>
                  <el-button
                    size="default"
                    type="primary"
                    plain
                    class="flex-1-btn"
                    @click="openAttendeesDrawer(event)"
                  >
                    <el-icon><User /></el-icon> Attendees
                  </el-button>

                  <el-button
                    size="default"
                    type="warning"
                    plain
                    class="flex-1-btn"
                    @click="openBroadcastModal(event)"
                  >
                    <el-icon><Bell /></el-icon> Notice
                  </el-button>
                </template>

                <el-dropdown trigger="click">
                  <el-button size="default" class="more-btn">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="handleEdit(event.id)">
                        <el-icon><Edit /></el-icon> Edit Details
                      </el-dropdown-item>
                      <el-dropdown-item divided style="color: #f56c6c;" @click="handleDelete(event)">
                        <el-icon><Delete /></el-icon> Delete Event
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <el-empty description="No events match your current filter." />
          </div>
        </div>

        <!-- 2. TABLE VIEW MODE -->
        <div v-else class="table-view-container">
          <el-table :data="paginatedTableData" style="width: 100%" size="large" stripe>
            <!-- Poster Preview -->
            <el-table-column label="Poster" width="100">
              <template #default="scope">
                <img
                  :src="scope.row.posterUrl || DEFAULT_FALLBACK_POSTER"
                  class="table-poster-img"
                  @error="e => handlePosterError(e, scope.row.category)"
                />
              </template>
            </el-table-column>

            <!-- Title & Organiser -->
            <el-table-column label="Event Details" min-width="220">
              <template #default="scope">
                <div class="event-cell-title">{{ scope.row.title }}</div>
                <div class="event-cell-sub">
                  <el-tag size="small" type="info">{{ scope.row.category }}</el-tag>
                  <span>{{ scope.row.organiser.name }}</span>
                </div>
              </template>
            </el-table-column>

            <!-- Date & Location -->
            <el-table-column label="Date & Venue" min-width="200">
              <template #default="scope">
                <div class="cell-meta">
                  <el-icon><Calendar /></el-icon> {{ scope.row.startTime }}
                </div>
                <div class="cell-meta muted">
                  <el-icon><Location /></el-icon> {{ scope.row.location }}
                </div>
              </template>
            </el-table-column>

            <!-- Seats & Fill Progress -->
            <el-table-column label="Registration Fill Rate" width="200">
              <template #default="scope">
                <div class="progress-cell">
                  <div class="progress-label">
                    <span>{{ scope.row.registeredCount }} / {{ scope.row.capacity }}</span>
                    <span v-if="scope.row.waitlistCount > 0" class="waitlist-tag">+{{ scope.row.waitlistCount }} Queue</span>
                  </div>
                  <el-progress
                    :percentage="getFillPct(scope.row)"
                    :status="getFillStatus(scope.row)"
                    :stroke-width="8"
                    :show-text="false"
                  />
                </div>
              </template>
            </el-table-column>

            <!-- Status -->
            <el-table-column label="Status" width="130">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)" effect="light">
                  {{ scope.row.status.replace('_', ' ') }}
                </el-tag>
              </template>
            </el-table-column>

            <!-- Actions -->
            <el-table-column label="Actions" width="260" fixed="right">
              <template #default="scope">
                <div class="action-btn-group">
                  <template v-if="(scope.row.status as string).toLowerCase() === 'draft'">
                    <el-button size="small" type="success" @click="handlePublishDraft(scope.row)">
                      <el-icon><Upload /></el-icon> Submit
                    </el-button>

                    <el-button size="small" type="primary" plain @click="handleEdit(scope.row.id)">
                      <el-icon><Edit /></el-icon> Edit
                    </el-button>
                  </template>
                  <template v-else>
                    <el-button size="small" type="primary" plain @click="openAttendeesDrawer(scope.row)">
                      <el-icon><User /></el-icon> Attendees
                    </el-button>

                    <el-button size="small" type="warning" plain @click="openBroadcastModal(scope.row)">
                      <el-icon><Bell /></el-icon> Notice
                    </el-button>
                  </template>

                  <el-dropdown trigger="click">
                    <el-button size="small" icon>
                      <el-icon><MoreFilled /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item @click="handleEdit(scope.row.id)">
                          <el-icon><Edit /></el-icon> Edit Event
                        </el-dropdown-item>
                        <el-dropdown-item divided style="color: #f56c6c;" @click="handleDelete(scope.row)">
                          <el-icon><Delete /></el-icon> Delete Event
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- Pagination Footer -->
        <div class="table-pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            layout="total, prev, pager, next"
            :total="filteredTableEvents.length"
          />
        </div>
      </el-card>

      <!-- Attendee & Waitlist Management Drawer -->
      <el-drawer
        v-model="showAttendeesDrawer"
        :title="`Manage Attendees: ${currentEvent?.title || ''}`"
        size="600px"
        destroy-on-close
      >
        <el-skeleton
  v-if="eventStore.attendeesLoading"
  :rows="5"
  animated
/>

<div
  v-else-if="eventStore.attendeesError"
  class="attendee-error-state"
>
  <el-alert
    :title="eventStore.attendeesError"
    type="error"
    show-icon
    :closable="false"
  />

  <el-button
    type="primary"
    plain
    @click="retryAttendees"
  >
    Retry
  </el-button>
</div>

<div v-else-if="currentEvent" class="drawer-content">
          <div class="drawer-summary-box">
            <div class="stat-item">
              <span class="stat-num">{{ currentEvent.registeredCount }}</span>
              <span class="stat-lbl">Confirmed Passes</span>
            </div>
            <div class="stat-item">
              <span class="stat-num text-purple">{{ currentEvent.waitlistCount }}</span>
              <span class="stat-lbl">Waitlist Queue</span>
            </div>
            <div class="stat-item">
              <span class="stat-num text-green">{{ checkedInCount }}</span>
              <span class="stat-lbl">Checked In</span>
            </div>
          </div>

          <el-tabs v-model="activeDrawerTab">
            <!-- Confirmed Attendees Tab -->
            <el-tab-pane label="Registered Students" name="registered">
              <el-table :data="currentAttendees.filter((a: AttendeeItem) => a.status !== 'WAITLIST')" style="width: 100%" size="default">
                <el-table-column prop="name" label="Name" width="130">
                  <template #default="scope">
                    <strong>{{ scope.row.name }}</strong>
                  </template>
                </el-table-column>
                <el-table-column prop="studentId" label="Student ID" width="110" />
                <el-table-column prop="email" label="Email" min-width="150" />
                <el-table-column label="Check-in Status" width="130">
                  <template #default="scope">
                    <el-button
                      size="small"
                      :type="scope.row.status === 'CHECKED_IN' ? 'success' : 'info'"
                      plain
                      @click="eventStore.toggleCheckIn(currentEvent!.id, scope.row.id)"
                    >
                      {{ scope.row.status === 'CHECKED_IN' ? 'Checked In ✓' : 'Mark Check-in' }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <!-- Waitlist Queue Tab -->
            <el-tab-pane label="Waitlist Queue" name="waitlist">
              <el-table :data="currentAttendees.filter((a: AttendeeItem) => a.status === 'WAITLIST')" style="width: 100%" size="default">
                <el-table-column prop="waitlistRank" label="Rank" width="80">
                  <template #default="scope">
                    <el-tag size="small" type="warning">#{{ scope.row.waitlistRank }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="name" label="Student Name" width="140" />
                <el-table-column prop="studentId" label="ID" width="110" />
                <el-table-column label="Action" width="140">
                  <template #default="scope">
                    <el-button
                      size="small"
                      type="success"
                      @click="promoteStudent(scope.row.id)"
                    >
                      Promote to Seat
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-drawer>

      <!-- Broadcast Notification Modal Dialog -->
      <el-dialog
        v-model="showBroadcastModal"
        title="Broadcast Announcement to Attendees"
        width="500px"
        align-center
        destroy-on-close
      >
        <div v-if="targetBroadcastEvent" class="broadcast-dialog-content">
          <div class="target-event-badge">
            <el-icon><Bell /></el-icon> Sending update for: <strong>{{ targetBroadcastEvent.title }}</strong>
          </div>

          <el-form label-position="top">
            <el-form-item label="Notice Subject / Headline">
              <el-input v-model="broadcastForm.subject" placeholder="e.g. Venue Change to Hall B / Reminder" />
            </el-form-item>

            <el-form-item label="Message Announcement Content">
              <el-input
                v-model="broadcastForm.message"
                type="textarea"
                :rows="4"
                placeholder="Write message to send to all registered students and waitlist queued participants..."
              />
            </el-form-item>
          </el-form>
        </div>

        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showBroadcastModal = false">Cancel</el-button>
            <el-button type="primary" :loading="isBroadcasting" @click="sendBroadcast">
              Broadcast Notification
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </OrganiserLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import OrganiserLayout from '@/layouts/OrganiserLayout.vue'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import type { EventItem } from '@/types/event'
import type { AttendeeItem } from '@/stores/eventStore'
import { handlePosterError, DEFAULT_FALLBACK_POSTER } from '@/lib/posterFallback'
import {
  Calendar,
  User,
  Clock,
  TrendCharts,
  Plus,
  Search,
  Location,
  Bell,
  MoreFilled,
  Edit,
  Delete,
  Grid,
  Menu,
  Upload,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()

async function handlePublishDraft(event: EventItem) {
  try {
    await ElMessageBox.confirm(
      `Submit "${event.title}" for administrator review? It will remain private until approved.`,
      'Submit Draft for Review',
      {
        confirmButtonText: 'Submit for Review',
        cancelButtonText: 'Keep Draft',
        type: 'success',
      }
    )
    const res = await eventStore.submitEventForReview(event.id)
    if (res.success) {
      ElMessage.success(`Event "${event.title}" submitted for administrator review.`)
    } else {
      ElMessage.error(res.message || 'Failed to submit the event for review.')
    }
  } catch {
    // User cancelled
  }
}

onMounted(() => {
  eventStore.fetchEventsFromSupabase()
})

// State
const tableSearch = ref('')
const viewMode = ref<'grid' | 'table'>('grid')
const currentPage = ref(1)
const pageSize = ref(6)
const activeStatusTab = ref<'all' | 'published' | 'pending' | 'draft' | 'completed'>('all')

// Drawer State
const showAttendeesDrawer = ref(false)
const currentEvent = ref<EventItem | null>(null)
const activeDrawerTab = ref<'registered' | 'waitlist'>('registered')

// Broadcast Modal State
const showBroadcastModal = ref(false)
const targetBroadcastEvent = ref<EventItem | null>(null)
const isBroadcasting = ref(false)
const broadcastForm = reactive({
  subject: '',
  message: '',
})

// Organiser's Own Events Filter
const ownEvents = computed(() => {
  return eventStore.events
})

// KPI Metrics Computations
const totalHostedEvents = computed(() => ownEvents.value.length)
const totalRegistrations = computed(() =>
  ownEvents.value.reduce((sum: number, e: EventItem) => sum + e.registeredCount, 0),
)
const totalWaitlist = computed(() =>
  ownEvents.value.reduce((sum: number, e: EventItem) => sum + e.waitlistCount, 0),
)
const avgFillRate = computed(() => {
  if (ownEvents.value.length === 0) return 0
  const totalPct = ownEvents.value.reduce(
    (sum: number, e: EventItem) => sum + (e.registeredCount / e.capacity) * 100,
    0,
  )
  return Math.round(totalPct / ownEvents.value.length)
})

// Status Counts
const allCount = computed(() => ownEvents.value.length)
const publishedCount = computed(() => ownEvents.value.filter((e: EventItem) => {
  const st = (e.status as string).toLowerCase()
  return st === 'published' || st === 'approved' || st === 'open' || st === 'filling_fast'
}).length)

const pendingCount = computed(() => ownEvents.value.filter((e: EventItem) => {
  const st = (e.status as string).toLowerCase()
  return st === 'pending' || st === 'waitlist'
}).length)

const draftCount = computed(() => ownEvents.value.filter((e: EventItem) => {
  const st = (e.status as string).toLowerCase()
  return st === 'draft'
}).length)

const completedCount = computed(() => ownEvents.value.filter((e: EventItem) => {
  const st = (e.status as string).toLowerCase()
  return st === 'completed' || st === 'rejected' || st === 'closed'
}).length)

// Table Filtered & Paginated List
const filteredTableEvents = computed(() => {
  return ownEvents.value.filter((e: EventItem) => {
    const st = (e.status as string).toLowerCase()
    // Status Tab Filter
    if (activeStatusTab.value === 'published') {
      if (st !== 'published' && st !== 'approved' && st !== 'open' && st !== 'filling_fast') return false
    } else if (activeStatusTab.value === 'pending') {
      if (st !== 'pending' && st !== 'waitlist') return false
    } else if (activeStatusTab.value === 'draft') {
      if (st !== 'draft') return false
    } else if (activeStatusTab.value === 'completed') {
      if (st !== 'completed' && st !== 'rejected' && st !== 'closed') return false
    }

    // Search Query Filter
    if (tableSearch.value.trim()) {
      const query = tableSearch.value.toLowerCase()
      const titleStr = (e.title || '').toLowerCase()
      const locStr = (e.location || '').toLowerCase()
      const catStr = (e.category || '').toLowerCase()
      return titleStr.includes(query) || locStr.includes(query) || catStr.includes(query)
    }
    return true
  })
})

const paginatedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredTableEvents.value.slice(start, start + pageSize.value)
})

// Current Event Attendees
const currentAttendees = computed(() => {
  if (!currentEvent.value) return []
  return eventStore.getAttendees(currentEvent.value.id)
})

const checkedInCount = computed(() => {
  return currentAttendees.value.filter((a: AttendeeItem) => a.status === 'CHECKED_IN').length
})

// Table Progress Status Helpers
function getFillPct(event: EventItem) {
  return Math.min(Math.round((event.registeredCount / event.capacity) * 100), 100)
}

function getFillStatus(event: EventItem) {
  const pct = getFillPct(event)
  if (pct >= 100) return 'exception'
  if (pct >= 80) return 'warning'
  return 'success'
}

function getStatusTagType(status: string) {
  if (status === 'OPEN') return 'success'
  if (status === 'FILLING_FAST') return 'warning'
  return 'danger'
}

// Action Handlers
function handleEdit(eventId: string) {
  router.push(`/create?id=${eventId}`)
}

function handleDelete(event: EventItem) {
  ElMessageBox.confirm(
    `Are you sure you want to delete "${event.title}"? This cannot be undone.`,
    'Delete Event',
    {
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      type: 'warning',
    },
  )
    .then(async () => {
      const res = await eventStore.deleteEvent(event.id)
      if (res && !res.success) {
        ElMessage.error(res.message || 'Failed to delete event from database.')
      } else {
        ElMessage.success('Event deleted permanently from Supabase.')
      }
    })
    .catch(() => {})
}

async function openAttendeesDrawer(
  event: EventItem,
): Promise<void> {
  currentEvent.value = event
  showAttendeesDrawer.value = true

  await eventStore.fetchEventAttendees(event.id)
}

async function retryAttendees(): Promise<void> {
  if (!currentEvent.value) return

  await eventStore.fetchEventAttendees(
    currentEvent.value.id,
  )
}

function promoteStudent(studentId: string) {
  if (!currentEvent.value) return
  eventStore.promoteWaitlistAttendee(currentEvent.value.id, studentId)
  ElMessage.success('Student promoted from waitlist to confirmed seat!')
}

function openBroadcastModal(event: EventItem) {
  targetBroadcastEvent.value = event
  broadcastForm.subject = `Update regarding ${event.title}`
  broadcastForm.message = ''
  showBroadcastModal.value = true
}

function sendBroadcast() {
  if (!broadcastForm.message.trim()) {
    ElMessage.error('Please enter message content.')
    return
  }
  isBroadcasting.value = true
  setTimeout(() => {
    isBroadcasting.value = false
    showBroadcastModal.value = false
    ElMessage.success(
      `Broadcast notice sent to ${targetBroadcastEvent.value?.registeredCount} attendees!`,
    )
  }, 500)
}
</script>

<style scoped>
.attendee-error-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: flex-start;
}
.organiser-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  padding: 24px 32px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.header-badge {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #6366f1;
  display: inline-block;
  margin-bottom: 6px;
}

.dashboard-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 4px;
}

.dashboard-subtitle {
  font-size: 0.9rem;
  color: #64748b;
}

.header-action-btn {
  font-weight: 700;
  border-radius: 10px;
}

/* KPI Cards Grid */
.kpi-row {
  margin-bottom: 4px;
}

.kpi-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
}

.kpi-icon-bg {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 1.4rem;
}

.bg-purple {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
}

.bg-blue {
  background: linear-gradient(135deg, #3b82f6, #0284c7);
}

.bg-orange {
  background: linear-gradient(135deg, #f97316, #ea580c);
}

.bg-green {
  background: linear-gradient(135deg, #10b981, #059669);
}

.kpi-info {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.kpi-label {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
}

/* Main Content Card */
.main-content-card {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.toolbar-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-title-group h3 {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.event-count-badge {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
}

/* Status Filter Segmented Control Bar */
.status-filter-bar {
  margin-bottom: 0;
}

.status-tab-group {
  display: inline-flex;
  background-color: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
  gap: 4px;
  flex-wrap: wrap;
}

.tab-btn {
  background: transparent;
  border: none;
  padding: 8px 16px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn:hover {
  color: #1e293b;
}

.tab-btn.active {
  background-color: #409eff;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.3);
  font-weight: 700;
}

.badge-count {
  background: #ef4444;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Organiser Card Grid View */
.grid-view-container {
  margin-top: 12px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.organiser-event-card {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
}

.organiser-event-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.07);
  border-color: #cbd5e1;
}

.card-cover-wrapper {
  position: relative;
  height: 150px;
  width: 100%;
  overflow: hidden;
  background-color: #f1f5f9;
}

.card-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.organiser-event-card:hover .card-cover-img {
  transform: scale(1.05);
}

.cover-overlay-top {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-chip,
.status-chip {
  font-weight: 700;
  border-radius: 6px;
}

/* Card Body */
.card-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-event-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.7em;
}

.card-meta-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  background: #f8fafc;
  padding: 10px;
  border-radius: 8px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #475569;
}

.meta-row .el-icon {
  color: #6366f1;
}

.truncate-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Progress Box */
.progress-box {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #64748b;
}

.progress-nums {
  font-size: 0.8rem;
  color: #1e293b;
}

.waitlist-num {
  color: #ea580c;
  font-weight: 600;
  margin-left: 2px;
}

/* Card Action Footer */
.card-action-footer {
  padding: 12px 16px;
  background: #fafbfc;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 8px;
}

.flex-1-btn {
  flex: 1;
  font-weight: 600;
  border-radius: 8px;
}

.more-btn {
  padding: 8px 12px;
  border-radius: 8px;
}

/* Table View Styles */
.table-poster-img {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  background-color: #f1f5f9;
}

.event-cell-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1e293b;
  margin-bottom: 4px;
}

.event-cell-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #64748b;
}

.cell-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: #334155;
}

.cell-meta.muted {
  color: #64748b;
  font-size: 0.78rem;
  margin-top: 2px;
}

.progress-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
}

.waitlist-tag {
  color: #ea580c;
}

.action-btn-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.empty-state {
  padding: 40px 0;
}

/* Drawer Content */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.drawer-summary-box {
  display: flex;
  gap: 12px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f172a;
}

.stat-num.text-purple {
  color: #8b5cf6;
}

.stat-num.text-green {
  color: #10b981;
}

.stat-lbl {
  font-size: 0.75rem;
  color: #64748b;
}

/* Broadcast Dialog */
.target-event-badge {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  padding: 10px 14px;
  border-radius: 8px;
  color: #1d4ed8;
  font-size: 0.88rem;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
