<template>
  <div class="admin-reports-view">
    <div class="page-header">
      <div><h1>Violation Reports & Moderation</h1><p>Review student reports and apply an auditable resolution.</p></div>
      <el-button :loading="loadingReports || loadingSettings" @click="loadReports">Refresh</el-button>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />

    <el-radio-group v-model="statusFilter" size="large">
      <el-radio-button value="pending">Pending ({{ pendingReportCount }})</el-radio-button>
      <el-radio-button value="reviewing">Reviewing</el-radio-button>
      <el-radio-button value="resolved">Resolved</el-radio-button>
      <el-radio-button value="dismissed">Dismissed</el-radio-button>
    </el-radio-group>

    <div v-loading="loadingReports" class="reports-grid">
      <el-empty v-if="!loadingReports && filteredReports.length === 0" description="No reports in this status." />
      <article v-for="report in filteredReports" :key="report.id" class="report-card">
        <header>
          <span class="ticket-id">Ticket #{{ report.id.slice(0, 8) }}</span>
          <div class="report-tags">
            <el-tag v-if="isEscalated(report)" type="danger" effect="dark">HIGH PRIORITY</el-tag>
            <el-tag :type="getReasonTagType(report.reasonType)" effect="dark">{{ report.reasonType }}</el-tag>
          </div>
        </header>
        <div class="report-body">
          <h3>{{ report.targetTitle }}</h3>
          <p class="reporter">Reported by {{ report.reporter }} · {{ report.createdAt }}</p>
          <blockquote>{{ report.details }}</blockquote>
        </div>
        <footer>
          <el-tag :type="getStatusType(report.status)">{{ report.status.toUpperCase() }}</el-tag>
          <div v-if="report.status === 'pending' || report.status === 'reviewing'" class="actions">
            <el-button v-if="report.status === 'pending'" size="small" @click="markReviewing(report)">Start Review</el-button>
            <el-button size="small" type="info" plain @click="dismissTicket(report)">Dismiss</el-button>
            <el-button size="small" type="danger" @click="takeDownTarget(report)">Resolve & Take Down</el-button>
          </div>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useModerationStore, type ModerationReport, type ReportStatus } from '@/stores/moderationStore'
import { useAdminStore } from '@/stores/adminStore'

const moderationStore = useModerationStore()
const adminStore = useAdminStore()
const { reports, loadingReports, errorMessage, pendingReportCount } = storeToRefs(moderationStore)
const { settings, loadingSettings } = storeToRefs(adminStore)
const statusFilter = ref<ReportStatus>('pending')
const filteredReports = computed(() => reports.value.filter((report) => report.status === statusFilter.value))
const openReportCounts = computed(() => {
  const counts = new Map<string, number>()
  reports.value
    .filter((report) => report.status === 'pending' || report.status === 'reviewing')
    .forEach((report) => counts.set(report.eventId, (counts.get(report.eventId) ?? 0) + 1))
  return counts
})

function isEscalated(report: ModerationReport): boolean {
  if (!settings.value) return false
  return (openReportCounts.value.get(report.eventId) ?? 0) >= settings.value.reportThreshold
}

function getReasonTagType(reason: string) {
  if (reason.toLowerCase().includes('safety')) return 'danger'
  if (reason.toLowerCase().includes('fraud')) return 'warning'
  return 'info'
}

function getStatusType(status: ReportStatus) {
  if (status === 'resolved') return 'success'
  if (status === 'pending') return 'danger'
  if (status === 'reviewing') return 'warning'
  return 'info'
}

async function loadReports() {
  try { await Promise.all([moderationStore.fetchReports(), adminStore.fetchSettings()]) }
  catch { ElMessage.error(errorMessage.value || 'Unable to load reports.') }
}

async function markReviewing(report: ModerationReport) {
  try {
    await moderationStore.moderateReport(report.id, 'reviewing')
    ElMessage.success('Report marked as under review.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to update the report.')
  }
}

async function dismissTicket(report: ModerationReport) {
  try {
    await ElMessageBox.confirm('Dismiss this report without taking down the event?', 'Dismiss report', {
      confirmButtonText: 'Dismiss', cancelButtonText: 'Cancel', type: 'info',
    })
    await moderationStore.moderateReport(report.id, 'dismissed')
    ElMessage.success('Report dismissed.')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'Unable to dismiss the report.')
  }
}

async function takeDownTarget(report: ModerationReport) {
  try {
    await ElMessageBox.confirm(`Resolve this report and take down "${report.targetTitle}"?`, 'Resolve violation', {
      confirmButtonText: 'Resolve & Take Down', cancelButtonText: 'Cancel', type: 'warning',
    })
    await moderationStore.moderateReport(report.id, 'resolved', true)
    ElMessage.success('Report resolved and event taken down.')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error instanceof Error ? error.message : 'Unable to resolve the report.')
  }
}

onMounted(loadReports)
</script>

<style scoped>
.admin-reports-view { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.page-header h1 { margin: 0 0 6px; color: #0f172a; }
.page-header p { margin: 0; color: #64748b; }
.reports-grid { min-height: 180px; display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 18px; }
.report-card { display: flex; flex-direction: column; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgb(15 23 42 / 6%); }
.report-card header, .report-card footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; background: #f8fafc; }
.ticket-id { color: #64748b; font-size: 0.8rem; font-weight: 700; }
.report-tags { display: flex; align-items: center; gap: 6px; }
.report-body { flex: 1; padding: 18px; }
.report-body h3 { margin: 0 0 6px; color: #1e293b; }
.reporter { color: #64748b; font-size: 0.8rem; }
blockquote { margin: 16px 0 0; padding: 12px; border-left: 3px solid #ef4444; background: #fff7ed; color: #475569; line-height: 1.55; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
@media (max-width: 720px) { .page-header, .report-card footer { align-items: flex-start; flex-direction: column; } }
</style>
