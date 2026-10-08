<template>
  <div class="admin-dashboard">
    <div class="page-heading">
      <div>
        <span class="eyebrow">Admin Console</span>
        <h1>Event Management</h1>
        <p>Live approval and moderation queues from Supabase.</p>
      </div>
      <el-button
        :loading="loadingEvents || loadingReports"
        @click="loadDashboard"
        type="primary"
        size="large"
      >
        <el-icon class="el-icon--left"><Refresh /></el-icon>
        Refresh List
      </el-button>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
    <el-alert
      v-if="aiErrorMessage"
      :title="aiErrorMessage"
      type="warning"
      show-icon
      :closable="false"
    />

    <div class="filter-card">
      <el-radio-group v-model="activeStatusTab">
        <el-radio-button value="all">All ({{ events.length }})</el-radio-button>
        <el-radio-button value="pending">Pending ({{ pendingEventCount }})</el-radio-button>
        <el-radio-button value="published">Published ({{ publishedCount }})</el-radio-button>
        <el-radio-button value="draft">Drafts ({{ draftCount }})</el-radio-button>
        <el-radio-button value="rejected">Rejected ({{ rejectedCount }})</el-radio-button>
        <el-radio-button value="cancelled">Cancelled ({{ cancelledCount }})</el-radio-button>
      </el-radio-group>

      <div class="filters">
        <el-input v-model="searchQuery" clearable placeholder="Search title or organiser..." />
        <el-select v-model="selectedCategory" clearable placeholder="All categories">
          <el-option
            v-for="category in activeCategories"
            :key="category.slug"
            :label="category.name"
            :value="category.slug"
          />
        </el-select>
        <el-select v-model="riskFilter" placeholder="AI risk">
          <el-option label="All AI risks" value="all" />
          <el-option label="High risk" value="high" />
          <el-option label="Medium risk" value="medium" />
          <el-option label="Low risk" value="low" />
          <el-option label="Awaiting AI review" value="unreviewed" />
        </el-select>
      </div>
    </div>

    <el-table
      v-loading="loadingEvents"
      :data="filteredEvents"
      empty-text="No events match the selected filters."
      stripe
      size="large"
      style="width: 100%"
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
      <el-table-column label="Category" width="150">
        <template #default="{ row }">{{ categoryStore.labelFor(row.category) }}</template>
      </el-table-column>
      <el-table-column label="Organiser" min-width="190">
        <template #default="{ row }">
          <div class="organiser-cell">
            <strong>{{ row.organiser }}</strong>
            <span>{{ row.contactEmail }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="date" label="Scheduled" width="170" />
      <el-table-column label="AI pre-review" min-width="220">
        <template #default="{ row }">
          <div
            v-if="aiReviews[row.id]?.status === 'completed' && aiReviews[row.id]?.result"
            class="ai-cell"
          >
            <el-tag :type="riskType(aiReviews[row.id]!.result!.riskLevel)"
              >{{ aiReviews[row.id]!.result!.riskLevel.toUpperCase() }} RISK</el-tag
            >
            <span>Completeness {{ aiReviews[row.id]!.result!.completenessScore }}/100</span>
            <el-tag
              v-for="code in [
                ...new Set(aiReviews[row.id]!.result!.flags.map((flag) => flag.code)),
              ]"
              :key="code"
              size="small"
              type="warning"
              >{{ riskLabels[code] }}</el-tag
            >
          </div>
          <span
            v-else-if="analyzingEventIds.has(row.id) || aiReviews[row.id]?.status === 'processing'"
            >Analyzing…</span
          >
          <el-button
            v-else-if="row.status === 'pending'"
            link
            type="primary"
            @click="moderationStore.analyzeEvent(row.id)"
          >
            {{
              aiErrors[row.id] || aiReviews[row.id]?.status === 'failed'
                ? 'AI unavailable · Retry'
                : 'Queued · Analyze'
            }}
          </el-button>
          <span v-else>Not reviewed</span>
        </template>
      </el-table-column>
      <el-table-column label="Status" width="125" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" effect="dark">{{
            row.status.toUpperCase()
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Actions" min-width="270" align="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetails(row)">Details</el-button>
          <template v-if="row.status === 'pending'">
            <el-button type="success" size="small" @click="handleApprove(row)">Approve</el-button>
            <el-button type="danger" size="small" plain @click="handleReject(row)"
              >Reject</el-button
            >
          </template>
          <el-button
            v-else-if="row.status === 'published'"
            type="warning"
            size="small"
            plain
            @click="handleTakeDown(row)"
            >Take Down</el-button
          >
          <el-button
            v-else-if="row.status === 'rejected' || row.status === 'cancelled'"
            type="success"
            size="small"
            plain
            @click="handleRestore(row)"
            >Approve</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="drawerVisible" title="Event moderation details" size="48%">
      <div v-if="selectedEvent" class="drawer-content">
        <img
          :src="selectedEvent.poster || fallbackPoster"
          :alt="selectedEvent.title"
          class="drawer-poster"
        />
        <div class="drawer-title">
          <h2>{{ selectedEvent.title }}</h2>
          <el-tag :type="getStatusType(selectedEvent.status)">{{
            selectedEvent.status.toUpperCase()
          }}</el-tag>
        </div>
        <dl class="details-dl">
          <div>
            <dt>Organiser</dt>
            <dd>{{ selectedEvent.organiser }} · {{ selectedEvent.contactEmail }}</dd>
          </div>
          <div>
            <dt>Schedule</dt>
            <dd>{{ selectedEvent.date }}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>
              {{ selectedEvent.location }}
              <div
                v-if="
                  typeof selectedEvent.latitude === 'number' &&
                  typeof selectedEvent.longitude === 'number'
                "
                style="margin-top: 10px"
              >
                <MapView
                  :lat="selectedEvent.latitude"
                  :lng="selectedEvent.longitude"
                  :popupText="selectedEvent.title"
                />
              </div>
            </dd>
          </div>
          <div>
            <dt>Capacity</dt>
            <dd>{{ selectedEvent.capacity }}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{{ selectedEvent.submittedDate }}</dd>
          </div>
        </dl>
        <section class="details-section">
          <h3>Description</h3>
          <p>{{ selectedEvent.description }}</p>
        </section>
        <AiModerationPanel
          :review="aiReviews[selectedEvent.id]"
          :busy="analyzingEventIds.has(selectedEvent.id)"
          :adopting="adoptingEventId === selectedEvent.id"
          :error="aiErrors[selectedEvent.id]"
          :pending="selectedEvent.status === 'pending'"
          @analyze="moderationStore.analyzeEvent(selectedEvent.id, true)"
          @adopt="handleAdopt(selectedEvent, $event)"
          @open-duplicate="openDuplicate"
        />
        <el-alert
          v-if="selectedEvent.rejectionReason"
          :title="`Rejection reason: ${selectedEvent.rejectionReason}`"
          type="error"
          show-icon
          :closable="false"
        />
        <div v-if="selectedEvent.status === 'pending'" class="drawer-actions">
          <el-button type="danger" plain @click="handleReject(selectedEvent)">Reject</el-button>
          <el-button type="success" @click="handleApprove(selectedEvent)"
            >Approve & Publish</el-button
          >
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import MapView from '@/components/MapView.vue'
import AiModerationPanel from '@/components/AiModerationPanel.vue'
import type { RiskCode, RiskLevel } from '@/lib/aiModeration'

import {
  useModerationStore,
  type ModerationEvent,
  type EventModerationStatus,
} from '@/stores/moderationStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { categorySlug } from '@/lib/category'

const moderationStore = useModerationStore()
const categoryStore = useCategoryStore()

const {
  events,
  loadingEvents,
  loadingReports,
  errorMessage,
  pendingEventCount,
  aiReviews,
  analyzingEventIds,
  aiErrors,
  aiErrorMessage,
  adoptingEventId,
} = storeToRefs(moderationStore)
const { activeCategories } = storeToRefs(categoryStore)

const fallbackPoster = 'https://placehold.co/160x100?text=Event'

const searchQuery = ref('')
const selectedCategory = ref('')
const activeStatusTab = ref<EventModerationStatus | 'all'>('all')
const drawerVisible = ref(false)
const selectedEventId = ref('')
const selectedEvent = computed(
  () => events.value.find((event) => event.id === selectedEventId.value) ?? null,
)
const riskFilter = ref<RiskLevel | 'all' | 'unreviewed'>('all')
const riskLabels: Record<RiskCode, string> = {
  illegal_content: 'Illegal content',
  external_scam: 'Potential scam',
  hate_speech: 'Hate speech',
  low_quality: 'Low quality',
  missing_information: 'Missing details',
  duplicate: 'Possible duplicate',
}
function riskType(level: RiskLevel) {
  return level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success'
}

const publishedCount = computed(() => events.value.filter((e) => e.status === 'published').length)
const draftCount = computed(() => events.value.filter((e) => e.status === 'draft').length)
const rejectedCount = computed(() => events.value.filter((e) => e.status === 'rejected').length)
const cancelledCount = computed(() => events.value.filter((e) => e.status === 'cancelled').length)

const filteredEvents = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return events.value.filter((event) => {
    const result = aiReviews.value[event.id]?.result
    if (riskFilter.value === 'unreviewed' && result) return false
    if (
      riskFilter.value !== 'all' &&
      riskFilter.value !== 'unreviewed' &&
      result?.riskLevel !== riskFilter.value
    )
      return false
    if (activeStatusTab.value !== 'all' && event.status !== activeStatusTab.value) return false
    if (selectedCategory.value && categorySlug(event.category) !== selectedCategory.value)
      return false
    if (
      query &&
      !event.title.toLowerCase().includes(query) &&
      !event.organiser.toLowerCase().includes(query)
    )
      return false
    return true
  })
})

function getStatusType(status: EventModerationStatus) {
  if (status === 'published' || status === 'completed') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'info'
}

async function loadDashboard() {
  try {
    await Promise.all([
      moderationStore.fetchEvents(),
      moderationStore.fetchReports(),
      categoryStore.fetchCategories(),
    ])
    try {
      await moderationStore.fetchAiReviews()
      void moderationStore.analyzePendingEvents()
    } catch {
      /* The AI alert explains deployment failures; manual moderation remains available. */
    }
  } catch {
    ElMessage.error(errorMessage.value || 'Unable to load the event list.')
  }
}

function openDetails(event: ModerationEvent) {
  selectedEventId.value = event.id
  drawerVisible.value = true
}

function openDuplicate(eventId: string) {
  const event = events.value.find((event) => event.id === eventId)
  if (event) openDetails(event)
  else ElMessage.info('This event is no longer available. Refresh the list.')
}

async function handleAdopt(event: ModerationEvent, action: 'description' | 'reject') {
  try {
    await moderationStore.adoptAiSuggestion(event.id, action)
    ElMessage.success(
      action === 'description'
        ? 'AI description applied. A new pre-review is queued.'
        : 'Event returned with the AI review reason.',
    )
  } catch (error) {
    ElMessage.error(
      error instanceof Error
        ? error.message
        : 'Unable to apply the AI suggestion. Refresh and retry.',
    )
  }
}

async function handleApprove(event: ModerationEvent) {
  try {
    await moderationStore.reviewEvent(event.id, 'approve')
    drawerVisible.value = false
    ElMessage.success(`Event "${event.title}" approved.`)
  } catch (error) {
    ElMessage.error(
      error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'Unable to approve the event.',
    )
  }
}

async function handleReject(event: ModerationEvent) {
  try {
    const { value } = await ElMessageBox.prompt('Provide a rejection reason.', 'Reject event', {
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      inputPattern: /\S+/,
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
    await ElMessageBox.confirm(
      `Are you sure you want to forcibly take down the event "${event.title}"?`,
      'Takedown Event',
      { confirmButtonText: 'Takedown', cancelButtonText: 'Cancel', type: 'error' },
    )
    await moderationStore.cancelEvent(event.id)
    ElMessage.success(`Event "${event.title}" taken down.`)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'Unable to takedown the event.')
  }
}

async function handleRestore(event: ModerationEvent) {
  try {
    await moderationStore.reviewEvent(event.id, 'approve')
    drawerVisible.value = false
    ElMessage.success(`Event "${event.title}" restored and published.`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to restore the event.')
  }
}

let pollTimer: ReturnType<typeof setInterval> | undefined
let polling = false
onMounted(() => {
  void loadDashboard()
  pollTimer = setInterval(async () => {
    if (
      polling ||
      (!analyzingEventIds.value.size &&
        !Object.values(aiReviews.value).some((review) => review.status === 'processing'))
    )
      return
    polling = true
    try {
      await moderationStore.fetchAiReviews()
    } catch {
      /* Displayed by the AI alert. */
    } finally {
      polling = false
    }
  }, 5000)
})
onUnmounted(() => clearInterval(pollTimer))
</script>

<style scoped>
@import '../../assets/styles/AdminDashboard.css';

.filter-card {
  padding: 14px;
  background: #fff;
  border: 1px solid #dedbd3;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(17, 33, 61, 0.03);
}
.filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 420px;
}
.filters .el-input {
  flex: 1;
  min-width: 200px;
}
.filters .el-select {
  width: 170px;
}
.event-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ai-cell {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 5px;
}
.ai-cell > span:not(.el-tag) {
  flex-basis: 100%;
  color: #64748b;
  font-size: 0.8rem;
}
.event-cell img {
  width: 58px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
}
.event-cell div,
.organiser-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.event-cell span,
.organiser-cell span {
  color: #64748b;
  font-size: 0.78rem;
}
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.drawer-poster {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 12px;
}
.drawer-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.drawer-title h2 {
  margin: 0;
}
.details-dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin: 0;
}
.details-dl div {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px;
}
.details-dl dt {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}
.details-dl dd {
  margin: 5px 0 0;
  color: #1e293b;
}
.details-section h3 {
  margin-bottom: 8px;
}
.details-section p {
  color: #475569;
  line-height: 1.65;
}
.drawer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-table) {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #dedbd3;
  box-shadow: 0 4px 16px rgba(17, 33, 61, 0.03);
}
:deep(.el-table th.el-table__cell) {
  background-color: #f7f5ef;
  color: #11213d;
}

@media (max-width: 900px) {
  .filters {
    min-width: 100%;
  }
  .details-dl {
    grid-template-columns: 1fr;
  }
}
</style>
