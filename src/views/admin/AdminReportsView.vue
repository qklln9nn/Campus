<template>
  <div class="admin-reports-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Violation Reports & Moderation</h1>
        <p class="page-subtitle">Inspect user-submitted moderation tickets and enforce platform safety rules.</p>
      </div>

      <el-radio-group v-model="statusFilter" size="large">
        <el-radio-button label="pending">Pending Review ({{ pendingReportsCount }})</el-radio-button>
        <el-radio-button label="resolved">Resolved</el-radio-button>
        <el-radio-button label="dismissed">Dismissed</el-radio-button>
      </el-radio-group>
    </div>

    <!-- Reports Grid / Cards -->
    <div class="reports-grid">
      <div v-for="report in filteredReports" :key="report.id" class="report-card" :class="report.status">
        <div class="report-header">
          <div class="report-id">Ticket #{{ report.id }}</div>
          <el-tag :type="getReasonTagType(report.reasonType)" size="small" effect="dark">
            {{ report.reasonType }}
          </el-tag>
        </div>

        <div class="report-body">
          <div class="target-title">Target Event: <strong>{{ report.targetTitle }}</strong></div>
          <div class="reporter-info">Reported by <span>{{ report.reporter }}</span> on {{ report.createdAt }}</div>
          <div class="reason-box">
            "{{ report.details }}"
          </div>
        </div>

        <div class="report-footer">
          <div class="status-text">
            Status: <strong :class="report.status">{{ report.status.toUpperCase() }}</strong>
          </div>

          <div v-if="report.status === 'pending'" class="card-actions">
            <el-button type="info" size="small" plain @click="dismissTicket(report)">
              Dismiss
            </el-button>
            <el-button type="danger" size="small" @click="takeDownTarget(report)">
              Take Down Event
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const statusFilter = ref('pending')

const reportsList = ref([
  {
    id: 101,
    targetTitle: 'Off-Campus Unsanctioned Party Night',
    reporter: 'anonymous_student@campus.edu',
    createdAt: '2026-08-17 18:30',
    reasonType: 'Safety Hazard',
    details: 'This event charges illegal entry fees off campus without safety approval from student affairs.',
    status: 'pending',
  },
  {
    id: 102,
    targetTitle: 'Fake Crypto Trading Workshop',
    reporter: 'john.doe@campus.edu',
    createdAt: '2026-08-16 11:15',
    reasonType: 'Fraud & Misleading',
    details: 'Promotes high-risk financial schemes targeted at freshmen.',
    status: 'pending',
  },
  {
    id: 103,
    targetTitle: 'Campus Music Night 2026',
    reporter: 'lisa.wong@campus.edu',
    createdAt: '2026-08-14 09:40',
    reasonType: 'Noise Complaint',
    details: 'Claimed noise level would be too loud near library.',
    status: 'dismissed',
  },
])

const pendingReportsCount = computed(() => reportsList.value.filter((r) => r.status === 'pending').length)

const filteredReports = computed(() => {
  return reportsList.value.filter((r) => r.status === statusFilter.value)
})

function getReasonTagType(reason: string) {
  switch (reason) {
    case 'Safety Hazard': return 'danger'
    case 'Fraud & Misleading': return 'warning'
    default: return 'info'
  }
}

function dismissTicket(report: any) {
  report.status = 'dismissed'
  ElMessage.info(`Ticket #${report.id} dismissed as non-violation.`)
}

function takeDownTarget(report: any) {
  ElMessageBox.confirm(`Take down target event "${report.targetTitle}" and notify organiser?`, 'Enforce Violation Action', {
    confirmButtonText: 'Enforce Action',
    cancelButtonText: 'Cancel',
    type: 'warning',
  }).then(() => {
    report.status = 'resolved'
    ElMessage.success(`Target event taken down and ticket #${report.id} resolved.`)
  }).catch(() => {})
}
</script>

<style scoped>
.admin-reports-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
}

.page-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.report-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.report-card.pending {
  border-left: 4px solid #ef4444;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.report-id {
  font-weight: 800;
  color: #94a3b8;
  font-size: 0.85rem;
}

.target-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.reporter-info {
  font-size: 0.78rem;
  color: #94a3b8;
  margin-bottom: 12px;
}

.reporter-info span {
  color: #334155;
  font-weight: 600;
}

.reason-box {
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.88rem;
  color: #334155;
  font-style: italic;
}

.report-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
}

.status-text {
  font-size: 0.8rem;
  color: #64748b;
}

.status-text strong.pending { color: #ef4444; }
.status-text strong.resolved { color: #059669; }
.status-text strong.dismissed { color: #94a3b8; }

.card-actions {
  display: flex;
  gap: 8px;
}
</style>
