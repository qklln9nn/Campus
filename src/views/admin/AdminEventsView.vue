<template>
  <div class="admin-events-view">
    <div class="page-header">
      <div>
        <h1>Event Approvals & Governance</h1>
        <p>Review organiser submissions and manage published campus events.</p>
      </div>
      <el-button :loading="loadingEvents" @click="loadEvents">Refresh</el-button>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <div class="filter-card">
      <el-radio-group v-model="activeStatusTab">
        <el-radio-button value="all">All ({{ allCount }})</el-radio-button>
        <el-radio-button value="pending">Pending ({{ pendingCount }})</el-radio-button>
        <el-radio-button value="published">Published ({{ publishedCount }})</el-radio-button>
        <el-radio-button value="draft">Drafts ({{ draftCount }})</el-radio-button>
        <el-radio-button value="rejected">Rejected ({{ rejectedCount }})</el-radio-button>
        <el-radio-button value="cancelled">Cancelled ({{ cancelledCount }})</el-radio-button>
      </el-radio-group>

      <div class="filters">
        <el-input v-model="searchQuery" clearable placeholder="Search title or organiser..." />
        <el-select v-model="selectedCategory" clearable placeholder="All categories">
          <el-option v-for="category in categories" :key="category" :label="category" :value="category" />
        </el-select>
      </div>
    </div>

    <el-table
      v-loading="loadingEvents"
      :data="filteredEvents"
      empty-text="No events match the selected filters."
      stripe
    >
      <el-table-column label="Event" min-width="300">
        <template #default="{ row }">
          <div class="event-cell">
            <img :src="row.poster || fallbackPoster" :alt="row.title" />
            <div>
              <strong>{{ row.title }}</strong>
              <span>{{ row.location }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="Category" width="130" />
      <el-table-column label="Organiser" min-width="190">
        <template #default="{ row }">
          <div class="organiser-cell">
            <strong>{{ row.organiser }}</strong>
            <span>{{ row.contactEmail }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="date" label="Scheduled" width="170" />
      <el-table-column label="Status" width="125" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" effect="dark">{{ row.status.toUpperCase() }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" min-width="270" align="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetails(row)">Details</el-button>
          <template v-if="row.status === 'pending'">
            <el-button type="success" size="small" @click="handleApprove(row)">Approve</el-button>
            <el-button type="danger" size="small" plain @click="handleReject(row)">Reject</el-button>
          </template>
          <el-button
            v-else-if="row.status === 'published'"
            type="warning"
            size="small"
            plain
            @click="handleTakeDown(row)"
          >Take Down</el-button>
          <el-button
            v-else-if="row.status === 'rejected' || row.status === 'cancelled'"
            type="success"
            size="small"
            plain
            @click="handleRestore(row)"
          >Approve</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="drawerVisible" title="Event moderation details" size="48%">
      <div v-if="selectedEvent" class="drawer-content">
        <img :src="selectedEvent.poster || fallbackPoster" :alt="selectedEvent.title" class="drawer-poster" />
        <div class="drawer-title">
          <h2>{{ selectedEvent.title }}</h2>
          <el-tag :type="getStatusType(selectedEvent.status)">{{ selectedEvent.status }}</el-tag>
        </div>
        <dl>
          <div><dt>Organiser</dt><dd>{{ selectedEvent.organiser }} · {{ selectedEvent.contactEmail }}</dd></div>
          <div><dt>Schedule</dt><dd>{{ selectedEvent.date }}</dd></div>
          <div><dt>Location</dt><dd>{{ selectedEvent.location }}</dd></div>
          <div><dt>Capacity</dt><dd>{{ selectedEvent.capacity }}</dd></div>
          <div><dt>Submitted</dt><dd>{{ selectedEvent.submittedDate }}</dd></div>
        </dl>
        <section><h3>Description</h3><p>{{ selectedEvent.description }}</p></section>
        <el-alert
          v-if="selectedEvent.rejectionReason"
          :title="`Rejection reason: ${selectedEvent.rejectionReason}`"
          type="error"
          show-icon
          :closable="false"
        />
        <div v-if="selectedEvent.status === 'pending'" class="drawer-actions">
          <el-button type="danger" plain @click="handleReject(selectedEvent)">Reject</el-button>
          <el-button type="success" @click="handleApprove(selectedEvent)">Approve & Publish</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useModerationStore, type EventModerationStatus, type ModerationEvent } from '@/stores/moderationStore'

const moderationStore = useModerationStore()
const { events, loadingEvents, errorMessage } = storeToRefs(moderationStore)
const searchQuery = ref('')
const selectedCategory = ref('')
const activeStatusTab = ref<EventModerationStatus | 'all'>('all')
const drawerVisible = ref(false)
const selectedEvent = ref<ModerationEvent | null>(null)
const fallbackPoster = 'https://placehold.co/640x360?text=Campus+Event'
const categories = ['academic', 'sports', 'cultural', 'tech', 'club', 'career', 'competition']

const allCount = computed(() => events.value.length)
const pendingCount = computed(() => events.value.filter((event) => event.status === 'pending').length)
const publishedCount = computed(() => events.value.filter((event) => event.status === 'published').length)
const draftCount = computed(() => events.value.filter((event) => event.status === 'draft').length)
const rejectedCount = computed(() => events.value.filter((event) => event.status === 'rejected').length)
const cancelledCount = computed(() => events.value.filter((event) => event.status === 'cancelled').length)

const filteredEvents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return events.value.filter((event) => {
    if (activeStatusTab.value !== 'all' && event.status !== activeStatusTab.value) return false
    if (selectedCategory.value && event.category !== selectedCategory.value) return false
    if (query && !event.title.toLowerCase().includes(query) && !event.organiser.toLowerCase().includes(query)) return false
    return true
  })
})

function getStatusType(status: EventModerationStatus) {
  if (status === 'published' || status === 'completed') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'info'
}

async function loadEvents() {
  try { await moderationStore.fetchEvents() }
  catch { ElMessage.error(errorMessage.value || 'Unable to load moderation events.') }
}

function openDetails(event: ModerationEvent) {
  selectedEvent.value = event
  drawerVisible.value = true
}

async function handleApprove(event: ModerationEvent) {
  try {
    await moderationStore.reviewEvent(event.id, 'approve')
    drawerVisible.value = false
    ElMessage.success(`Event "${event.title}" approved and published.`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to approve the event.')
  }
}

async function handleReject(event: ModerationEvent) {
  try {
    const { value } = await ElMessageBox.prompt('Explain why this event was rejected.', 'Reject event', {
      confirmButtonText: 'Reject', cancelButtonText: 'Cancel', inputPattern: /\S+/,
      inputErrorMessage: 'A rejection reason is required.',
    })
    await moderationStore.reviewEvent(event.id, 'reject', value)
    drawerVisible.value = false
    ElMessage.success(`Event "${event.title}" rejected.`)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'Unable to reject the event.')
  }
}

async function handleTakeDown(event: ModerationEvent) {
  try {
    await ElMessageBox.confirm(`Take down "${event.title}"?`, 'Take down event', {
      confirmButtonText: 'Take Down', cancelButtonText: 'Cancel', type: 'warning',
    })
    await moderationStore.cancelEvent(event.id)
    ElMessage.success(`Event "${event.title}" was taken down.`)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'Unable to take down the event.')
  }
}

async function handleRestore(event: ModerationEvent) {
  try {
    await moderationStore.reviewEvent(event.id, 'approve')
    ElMessage.success(`Event "${event.title}" approved and published.`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to restore the event.')
  }
}

onMounted(loadEvents)
</script>

<style scoped>
.admin-events-view { display: flex; flex-direction: column; gap: 20px; }
.page-header, .filter-card, .filters, .drawer-title, .drawer-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.page-header h1 { margin: 0 0 6px; color: #0f172a; }
.page-header p { margin: 0; color: #64748b; }
.filter-card { padding: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; flex-wrap: wrap; }
.filters { min-width: 420px; }
.event-cell { display: flex; align-items: center; gap: 12px; }
.event-cell img { width: 58px; height: 44px; object-fit: cover; border-radius: 8px; }
.event-cell div, .organiser-cell { display: flex; flex-direction: column; gap: 3px; }
.event-cell span, .organiser-cell span { color: #64748b; font-size: 0.78rem; }
.drawer-content { display: flex; flex-direction: column; gap: 20px; }
.drawer-poster { width: 100%; max-height: 260px; object-fit: cover; border-radius: 12px; }
.drawer-title h2 { margin: 0; }
dl { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 0; }
dl div { background: #f8fafc; border-radius: 8px; padding: 12px; }
dt { color: #64748b; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
dd { margin: 5px 0 0; color: #1e293b; }
section h3 { margin-bottom: 8px; }
section p { color: #475569; line-height: 1.65; }
.drawer-actions { justify-content: flex-end; }
@media (max-width: 900px) { .filters { min-width: 100%; } dl { grid-template-columns: 1fr; } }
</style>
