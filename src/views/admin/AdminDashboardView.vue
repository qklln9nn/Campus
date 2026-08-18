<template>
  <div class="admin-dashboard">
    <!-- Header Title Section -->
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">System Governance Dashboard</h1>
        <p class="page-subtitle">Real-time stats, event approval pipelines, and platform system monitoring.</p>
      </div>
    </div>

    <!-- Stat Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon blue">
          <el-icon><UserFilled /></el-icon>
        </div>
        <div class="metric-info">
          <div class="metric-label">Total Users</div>
          <div class="metric-value">2,845</div>
          <div class="metric-trend positive">
            <el-icon><Top /></el-icon> +14.2% this month
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon success">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="metric-info">
          <div class="metric-label">Active Events</div>
          <div class="metric-value">86</div>
          <div class="metric-trend positive">
            <el-icon><Top /></el-icon> +8 new today
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon purple">
          <el-icon><Tickets /></el-icon>
        </div>
        <div class="metric-info">
          <div class="metric-label">Total Registrations</div>
          <div class="metric-value">12,480</div>
          <div class="metric-trend positive">
            <el-icon><Top /></el-icon> +1,240 this week
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon teal">
          <el-icon><Checked /></el-icon>
        </div>
        <div class="metric-info">
          <div class="metric-label">Avg Attendance Rate</div>
          <div class="metric-value">88.5%</div>
          <div class="metric-trend positive">
            High QR check-in rate
          </div>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon danger">
          <el-icon><WarningFilled /></el-icon>
        </div>
        <div class="metric-info">
          <div class="metric-label">Violation Reports</div>
          <div class="metric-value">3</div>
          <div class="metric-trend negative">
            2 pending review
          </div>
        </div>
      </div>
    </div>

    <!-- Middle Split: Quick Approval Pipeline & Category Breakdown -->
    <div class="content-grid">
      <!-- Quick Approval Widget -->
      <div class="dashboard-panel main-panel">
        <div class="panel-header">
          <div class="panel-title">
            <el-icon class="panel-icon warning-icon"><Clock /></el-icon>
            Pending Event Review Queue
          </div>
          <el-button type="primary" link @click="router.push('/admin/events')">View All</el-button>
        </div>

        <div class="approval-list">
          <div v-for="item in pendingEvents" :key="item.id" class="approval-item">
            <div class="event-thumb">
              <img :src="item.poster" :alt="item.title" />
            </div>
            <div class="event-details">
              <div class="event-title-row">
                <span class="meta-tag">{{ item.category }}</span>
                <span class="event-title" :title="item.title">{{ item.title }}</span>
              </div>
              <div class="event-meta">
                <span class="meta-org"><el-icon><User /></el-icon> {{ item.organiser }}</span>
                <span class="meta-time"><el-icon><Clock /></el-icon> {{ item.submittedTime }}</span>
              </div>
            </div>
            <div class="approval-actions">
              <el-tooltip content="Approve & Publish" placement="top">
                <el-button type="success" size="default" circle @click="quickApprove(item)">
                  <el-icon><Check /></el-icon>
                </el-button>
              </el-tooltip>

              <el-tooltip content="Reject Proposal" placement="top">
                <el-button type="danger" size="default" circle @click="quickReject(item)">
                  <el-icon><Close /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Category & User Distribution Widget -->
      <div class="dashboard-panel side-panel">
        <div class="panel-header">
          <div class="panel-title">
            <el-icon class="panel-icon"><PieChart /></el-icon>
            Category Distribution
          </div>
        </div>

        <div class="category-bars">
          <div v-for="cat in categoryStats" :key="cat.name" class="cat-bar-item">
            <div class="cat-bar-header">
              <span class="cat-name">{{ cat.name }}</span>
              <span class="cat-count">{{ cat.count }} events ({{ cat.percentage }}%)</span>
            </div>
            <el-progress :percentage="cat.percentage" :color="cat.color" :show-text="false" :stroke-width="8" />
          </div>
        </div>

        <div class="system-health-box">
          <div class="health-header">System Health & Storage</div>
          <div class="health-metric">
            <span>Database Connections</span>
            <span class="badge-good">Optimal (18/100)</span>
          </div>
          <div class="health-metric">
            <span>Supabase Storage Usage</span>
            <span>2.4 GB / 5.0 GB</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Audit Logs Table -->
    <div class="dashboard-panel full-panel">
      <div class="panel-header">
        <div class="panel-title">
          <el-icon class="panel-icon"><Document /></el-icon>
          Recent Audit Logs
        </div>
        <el-tag type="info" size="small">Last 24 Hours</el-tag>
      </div>

      <el-table :data="auditLogs" style="width: 100%" size="default">
        <el-table-column prop="timestamp" label="Timestamp" width="180" />
        <el-table-column prop="operator" label="Administrator" width="160">
          <template #default="{ row }">
            <span class="operator-name">{{ row.operator }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="Action" width="180">
          <template #default="{ row }">
            <el-tag :type="row.actionType" size="small" effect="dark">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="Target Object" width="260" />
        <el-table-column prop="details" label="Execution Details" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Tickets,
  User,
  UserFilled,
  Top,
  Clock,
  Calendar,
  WarningFilled,
  Check,
  Checked,
  Close,
  PieChart,
  Document,
} from '@element-plus/icons-vue'

const router = useRouter()

// Mock Pending Approvals
const pendingEvents = ref([
  {
    id: 1,
    title: 'AI & Machine Learning Innovation Hackathon 2026',
    category: 'Competition',
    organiser: 'School of Computer Science',
    submittedTime: '2 hours ago',
    poster: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    title: 'Annual Campus E-Sports Tournament Finals',
    category: 'Sports & Gaming',
    organiser: 'Campus Gaming Club',
    submittedTime: '4 hours ago',
    poster: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    title: 'Global Cultural Exchange Food & Music Festival',
    category: 'Culture & Art',
    organiser: 'International Students Association',
    submittedTime: 'Yesterday',
    poster: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=80',
  },
])

// Category Breakdown Stats
const categoryStats = ref([
  { name: 'Academic & Tech', count: 34, percentage: 40, color: '#3b82f6' },
  { name: 'Sports & Health', count: 22, percentage: 25, color: '#10b981' },
  { name: 'Culture & Arts', count: 18, percentage: 21, color: '#f59e0b' },
  { name: 'Career & Networking', count: 12, percentage: 14, color: '#8b5cf6' },
])

// Audit Logs Data
const auditLogs = ref([
  {
    timestamp: '2026-08-17 23:40',
    operator: 'Chief Admin',
    action: 'Approved Event',
    actionType: 'success',
    target: 'Hackathon 2026',
    details: 'Event approved and status updated to Active.',
  },
  {
    timestamp: '2026-08-17 21:15',
    operator: 'Chief Admin',
    action: 'Role Promoted',
    actionType: 'primary',
    target: 'User: sarah.jenkins@campus.edu',
    details: 'Promoted user role from Student to Organiser.',
  },
  {
    timestamp: '2026-08-17 18:02',
    operator: 'Safety Moderator',
    action: 'Dismissed Report',
    actionType: 'info',
    target: 'Report #1042',
    details: 'Reviewed report for Music Night; no violation found.',
  },
])

function quickApprove(item: any) {
  ElMessage.success(`Event "${item.title}" approved successfully.`)
  pendingEvents.value = pendingEvents.value.filter((e) => e.id !== item.id)
}

function quickReject(item: any) {
  ElMessageBox.prompt('Please provide a reason for rejection:', 'Reject Event', {
    confirmButtonText: 'Confirm Reject',
    cancelButtonText: 'Cancel',
    inputPattern: /.+/,
    inputErrorMessage: 'Rejection reason is required',
  }).then(({ value }) => {
    ElMessage.warning(`Event "${item.title}" rejected. Reason: ${value}`)
    pendingEvents.value = pendingEvents.value.filter((e) => e.id !== item.id)
  }).catch(() => {})
}
</script>

<<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.quick-action-btn {
  font-weight: 700;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

@media (max-width: 1300px) {
  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.metric-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.metric-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
  flex-shrink: 0;
}

.metric-icon.blue { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.metric-icon.warning { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.metric-icon.success { background: rgba(16, 185, 129, 0.1); color: #059669; }
.metric-icon.purple { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
.metric-icon.teal { background: rgba(20, 184, 166, 0.1); color: #0d9488; }
.metric-icon.danger { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

.metric-info {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.metric-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: #0f172a;
  margin: 2px 0;
}

.metric-trend {
  font-size: 0.72rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-trend.positive { color: #059669; }
.metric-trend.warning-text { color: #d97706; }
.metric-trend.negative { color: #dc2626; }

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.dashboard-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-icon {
  font-size: 1.2rem;
  color: #ef4444;
}

.panel-icon.warning-icon {
  color: #f59e0b;
}

/* Approval List */
.approval-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.approval-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.approval-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.event-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
}

.event-thumb img {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.event-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.event-title {
  font-weight: 700;
  font-size: 0.92rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-meta {
  font-size: 0.78rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 16px;
}

.meta-org, .meta-time {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.meta-tag {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.approval-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* Category Bars Widget */
.category-bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}

.cat-bar-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.cat-count {
  color: #64748b;
  font-size: 0.75rem;
}

.system-health-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
}

.health-header {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.health-metric {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #334155;
  margin-bottom: 6px;
}

.badge-good {
  color: #059669;
  font-weight: 600;
}

.operator-name {
  font-weight: 600;
  color: #0f172a;
}
</style>
