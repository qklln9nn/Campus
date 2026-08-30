<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <div><h1>System Governance Dashboard</h1><p>Live approval and safety queues from Supabase.</p></div>
      <el-button :loading="loadingEvents || loadingReports" @click="loadDashboard">Refresh</el-button>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <div class="metrics-grid">
      <div class="metric-card"><span>All Events</span><strong>{{ events.length }}</strong></div>
      <div class="metric-card success"><span>Published</span><strong>{{ publishedCount }}</strong></div>
      <div class="metric-card warning"><span>Pending Events</span><strong>{{ pendingEventCount }}</strong></div>
      <div class="metric-card danger"><span>Pending Reports</span><strong>{{ pendingReportCount }}</strong></div>
    </div>

    <div class="content-grid">
      <section class="dashboard-panel">
        <header><h2>Pending Event Reviews</h2><el-button link type="primary" @click="router.push('/admin/events')">View All</el-button></header>
        <el-empty v-if="pendingEvents.length === 0" description="No events awaiting review." />
        <article v-for="event in pendingEvents.slice(0, 5)" :key="event.id" class="queue-item">
          <img :src="event.poster || fallbackPoster" :alt="event.title" />
          <div><strong>{{ event.title }}</strong><span>{{ event.organiser }} · {{ event.submittedDate }}</span></div>
          <div class="actions">
            <el-button type="success" size="small" @click="approve(event)">Approve</el-button>
            <el-button type="danger" size="small" plain @click="reject(event)">Reject</el-button>
          </div>
        </article>
      </section>

      <section class="dashboard-panel">
        <header><h2>Open Reports</h2><el-button link type="primary" @click="router.push('/admin/reports')">View All</el-button></header>
        <el-empty v-if="openReports.length === 0" description="No open reports." />
        <article v-for="report in openReports.slice(0, 5)" :key="report.id" class="report-item">
          <div><strong>{{ report.targetTitle }}</strong><span>{{ report.reasonType }} · {{ report.createdAt }}</span></div>
          <el-tag :type="report.status === 'pending' ? 'danger' : 'warning'">{{ report.status }}</el-tag>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useModerationStore, type ModerationEvent } from '@/stores/moderationStore'

const router = useRouter()
const moderationStore = useModerationStore()
const {
  events,
  reports,
  loadingEvents,
  loadingReports,
  errorMessage,
  pendingEventCount,
  pendingReportCount,
} = storeToRefs(moderationStore)
const fallbackPoster = 'https://placehold.co/160x100?text=Event'

const publishedCount = computed(() => events.value.filter((event) => event.status === 'published').length)
const pendingEvents = computed(() => events.value.filter((event) => event.status === 'pending'))
const openReports = computed(() => reports.value.filter((report) => ['pending', 'reviewing'].includes(report.status)))

async function loadDashboard() {
  try {
    await Promise.all([moderationStore.fetchEvents(), moderationStore.fetchReports()])
  } catch {
    ElMessage.error(errorMessage.value || 'Unable to load the moderation dashboard.')
  }
}

async function approve(event: ModerationEvent) {
  try {
    await moderationStore.reviewEvent(event.id, 'approve')
    ElMessage.success(`Event "${event.title}" approved.`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to approve the event.')
  }
}

async function reject(event: ModerationEvent) {
  try {
    const { value } = await ElMessageBox.prompt('Provide a rejection reason.', 'Reject event', {
      confirmButtonText: 'Reject', cancelButtonText: 'Cancel', inputPattern: /\S+/,
      inputErrorMessage: 'A rejection reason is required.',
    })
    await moderationStore.reviewEvent(event.id, 'reject', value)
    ElMessage.success(`Event "${event.title}" rejected.`)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'Unable to reject the event.')
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.admin-dashboard { display: flex; flex-direction: column; gap: 22px; }
.dashboard-header, .dashboard-panel header, .queue-item, .report-item { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.dashboard-header h1 { margin: 0 0 6px; color: #0f172a; }
.dashboard-header p { margin: 0; color: #64748b; }
.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.metric-card { padding: 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; }
.metric-card.success { background: #ecfdf5; border-color: #a7f3d0; }
.metric-card.warning { background: #fffbeb; border-color: #fde68a; }
.metric-card.danger { background: #fff1f2; border-color: #fecdd3; }
.metric-card span { display: block; color: #64748b; font-size: 0.82rem; font-weight: 700; }
.metric-card strong { display: block; margin-top: 8px; color: #0f172a; font-size: 2rem; }
.content-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.dashboard-panel { padding: 18px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
.dashboard-panel h2 { margin: 0; font-size: 1.05rem; }
.queue-item, .report-item { padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
.queue-item:last-child, .report-item:last-child { border-bottom: 0; }
.queue-item img { width: 64px; height: 46px; object-fit: cover; border-radius: 8px; }
.queue-item > div:nth-child(2), .report-item > div { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.queue-item span, .report-item span { color: #64748b; font-size: 0.76rem; }
.actions { display: flex; gap: 6px; }
@media (max-width: 1000px) { .metrics-grid { grid-template-columns: 1fr 1fr; } .content-grid { grid-template-columns: 1fr; } }
</style>
