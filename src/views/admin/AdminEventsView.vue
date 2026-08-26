<template>
  <div class="admin-events-view">
    <!-- Page Title & Search Bar -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Event Approvals & Governance</h1>
        <p class="page-subtitle">Review event proposals submitted by campus organisers and manage active events.</p>
      </div>

      <div class="filter-controls">
        <el-input
          v-model="searchQuery"
          placeholder="Search by event title or organiser..."
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="selectedCategory" placeholder="All Categories" clearable style="width: 160px">
          <el-option label="Academic" value="Academic" />
          <el-option label="Competition" value="Competition" />
          <el-option label="Sports" value="Sports" />
          <el-option label="Culture" value="Culture" />
        </el-select>
      </div>
    </div>

    <!-- Filter Control Card with Segmented Status Tabs (Matches Student Dashboard style) -->
    <div class="filter-card">
      <el-radio-group v-model="activeStatusTab" size="default" class="view-radio-tabs">
        <el-radio-button value="all">All Events ({{ allCount }})</el-radio-button>
        <el-radio-button value="published">Published ({{ publishedCount }})</el-radio-button>
        <el-radio-button value="pending">Pending Review ({{ pendingCount }})</el-radio-button>
        <el-radio-button value="draft">Draft / Upcoming ({{ draftCount }})</el-radio-button>
        <el-radio-button value="rejected">Rejected ({{ rejectedCount }})</el-radio-button>
      </el-radio-group>

      <div class="filter-controls-right">
        <el-select v-model="selectedCategory" placeholder="All Categories" clearable style="width: 150px">
          <el-option label="Academic" value="Academic" />
          <el-option label="Competition" value="Competition" />
          <el-option label="Sports" value="Sports" />
          <el-option label="Culture" value="Culture" />
        </el-select>

        <el-select v-model="selectedSort" placeholder="Sort By" style="width: 150px">
          <el-option label="Upcoming First" value="upcoming" />
          <el-option label="Latest Submitted" value="latest" />
        </el-select>
      </div>
    </div>

    <!-- Table List -->
    <div class="table-container">
      <el-table :data="filteredEvents" style="width: 100%" size="large" v-loading="loading" border-stripe>
        <el-table-column label="Event Details" min-width="300">
          <template #default="{ row }">
            <div class="event-info-cell">
              <img :src="row.poster" :alt="row.title" class="poster-thumb" />
              <div class="info-content">
                <div class="title-text" :title="row.title">{{ row.title }}</div>
                <div class="location-text">
                  <el-icon><Location /></el-icon> {{ row.location }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="category" label="Category" width="130" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small" effect="plain">{{ row.category }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="organiser" label="Organiser" min-width="180">
          <template #default="{ row }">
            <div class="organiser-cell">
              <span class="org-name">{{ row.organiser }}</span>
              <span class="org-contact">{{ row.contactEmail }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="date" label="Scheduled Date" width="160" align="center" />

        <el-table-column prop="status" label="Status" width="150" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" effect="dark" class="status-badge-tag">
              {{ row.status.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Actions" min-width="240" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" link @click="openDetails(row)">
                <el-icon><View /></el-icon> Details
              </el-button>

              <template v-if="row.status === 'pending'">
                <el-button type="success" size="small" @click="handleApprove(row)">
                  Approve
                </el-button>
                <el-button type="danger" size="small" plain @click="handleReject(row)">
                  Reject
                </el-button>
              </template>

              <template v-else-if="row.status === 'approved'">
                <el-button type="warning" size="small" plain @click="handleTakeDown(row)">
                  Take Down
                </el-button>
              </template>

              <template v-else-if="row.status === 'disabled' || row.status === 'rejected'">
                <el-button type="info" size="small" plain @click="handleRestore(row)">
                  Restore
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Event Detail Drawer -->
    <el-drawer v-model="drawerVisible" title="Event Approval Detail" size="50%" class="admin-drawer">
      <div v-if="selectedEvent" class="drawer-content">
        <div class="drawer-banner">
          <img :src="selectedEvent.poster" :alt="selectedEvent.title" class="drawer-poster" />
        </div>

        <div class="drawer-section">
          <h2>{{ selectedEvent.title }}</h2>
          <div class="status-header">
            <el-tag :type="getStatusType(selectedEvent.status)" effect="dark">{{ selectedEvent.status.toUpperCase() }}</el-tag>
            <span class="submitted-label">Submitted on {{ selectedEvent.submittedDate }}</span>
          </div>
        </div>

        <el-divider />

        <div class="drawer-section grid-section">
          <div>
            <label>Organiser:</label>
            <p>{{ selectedEvent.organiser }} ({{ selectedEvent.contactEmail }})</p>
          </div>
          <div>
            <label>Category:</label>
            <p>{{ selectedEvent.category }}</p>
          </div>
          <div>
            <label>Scheduled Time:</label>
            <p>{{ selectedEvent.date }}</p>
          </div>
          <div>
            <label>Location:</label>
            <p>{{ selectedEvent.location }}</p>
          </div>
        </div>

        <div class="drawer-section">
          <label>Event Description & Agenda:</label>
          <div class="desc-box">{{ selectedEvent.description }}</div>
        </div>

        <div class="drawer-section">
          <label>Estimated Capacity & Budget:</label>
          <p>Capacity: <strong>{{ selectedEvent.capacity }} Seats</strong> | Estimated Budget: <strong>${{ selectedEvent.budget }}</strong></p>
        </div>

        <div class="drawer-footer-actions">
          <el-button @click="drawerVisible = false">Close</el-button>
          <template v-if="selectedEvent.status === 'pending'">
            <el-button type="danger" @click="handleReject(selectedEvent)">Reject Proposal</el-button>
            <el-button type="success" @click="handleApprove(selectedEvent)">Approve & Publish</el-button>
          </template>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Location, View } from '@element-plus/icons-vue'

const searchQuery = ref('')
const selectedCategory = ref('')
const selectedSort = ref('upcoming')
const activeStatusTab = ref('all')
const loading = ref(false)
const drawerVisible = ref(false)
const selectedEvent = ref<any>(null)

// Mock Data
const eventsList = ref([
  {
    id: 1,
    title: 'AI & Machine Learning Innovation Hackathon 2026',
    poster: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&auto=format&fit=crop&q=80',
    category: 'Competition',
    organiser: 'School of Computer Science',
    contactEmail: 'cs-event@campus.edu',
    location: 'Innovation Lab 301',
    date: '2026-09-15 09:00',
    submittedDate: '2026-08-16',
    status: 'pending',
    capacity: 200,
    budget: 1500,
    description: 'A 24-hour hackathon bringing together students to solve real-world campus problems using AI and modern Web tech.',
  },
  {
    id: 2,
    title: 'Campus E-Sports Finals & Gaming Exhibition',
    poster: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&auto=format&fit=crop&q=80',
    category: 'Sports',
    organiser: 'Campus Gaming Club',
    contactEmail: 'esports@campus.edu',
    location: 'Student Activity Center',
    date: '2026-08-25 14:00',
    submittedDate: '2026-08-14',
    status: 'approved',
    capacity: 500,
    budget: 800,
    description: 'Annual competitive gaming tournament with live commentary, cosplay display, and hardware sponsors.',
  },
  {
    id: 3,
    title: 'Unsanctioned Off-Campus Party',
    poster: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80',
    category: 'Culture',
    organiser: 'Unknown Student Group',
    contactEmail: 'party@temp.com',
    location: 'Off-Campus Bar',
    date: '2026-08-20 22:00',
    submittedDate: '2026-08-15',
    status: 'rejected',
    capacity: 100,
    budget: 200,
    description: 'Late night gathering without safety approval.',
  },
  {
    id: 4,
    title: 'Annual Career Fair & Industry Networking',
    poster: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&auto=format&fit=crop&q=80',
    category: 'Academic',
    organiser: 'Career Services Center',
    contactEmail: 'careers@campus.edu',
    location: 'Main Gymnasium',
    date: '2026-10-01 10:00',
    submittedDate: '2026-08-10',
    status: 'approved',
    capacity: 1000,
    budget: 5000,
    description: 'Meet representatives from 50+ tech companies and top enterprises looking for interns and graduates.',
  },
  {
    id: 5,
    title: 'Robotics Workshop Proposal Draft',
    poster: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&auto=format&fit=crop&q=80',
    category: 'Academic',
    organiser: 'Robotics Club',
    contactEmail: 'robotics@campus.edu',
    location: 'Engineering Lab B',
    date: '2026-11-10 14:00',
    submittedDate: '2026-08-22',
    status: 'draft',
    capacity: 60,
    budget: 400,
    description: 'Hands-on introduction to ROS and microcontroller programming.',
  }
])

const allCount = computed(() => eventsList.value.length)
const publishedCount = computed(() => eventsList.value.filter((e) => e.status === 'approved' || e.status === 'published').length)
const pendingCount = computed(() => eventsList.value.filter((e) => e.status === 'pending').length)
const draftCount = computed(() => eventsList.value.filter((e) => e.status === 'draft').length)
const rejectedCount = computed(() => eventsList.value.filter((e) => e.status === 'rejected' || e.status === 'disabled').length)

const filteredEvents = computed(() => {
  return eventsList.value.filter((item) => {
    // Status Filter
    if (activeStatusTab.value === 'published') {
      if (item.status !== 'approved' && item.status !== 'published') return false
    } else if (activeStatusTab.value === 'draft') {
      if (item.status !== 'draft') return false
    } else if (activeStatusTab.value === 'rejected') {
      if (item.status !== 'rejected' && item.status !== 'disabled') return false
    } else if (activeStatusTab.value === 'pending') {
      if (item.status !== 'pending') return false
    }
    // Category Filter
    if (selectedCategory.value && item.category !== selectedCategory.value) {
      return false
    }
    // Search Query
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return item.title.toLowerCase().includes(q) || item.organiser.toLowerCase().includes(q)
    }
    return true
  })
})

function getStatusType(status: string) {
  switch (status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'rejected': return 'danger'
    case 'disabled': return 'info'
    default: return 'info'
  }
}

function openDetails(row: any) {
  selectedEvent.value = row
  drawerVisible.value = true
}

function handleApprove(row: any) {
  row.status = 'approved'
  ElMessage.success(`Event "${row.title}" approved and published.`)
  if (drawerVisible.value && selectedEvent.value?.id === row.id) {
    drawerVisible.value = false
  }
}

function handleReject(row: any) {
  ElMessageBox.prompt('Enter reason for rejecting this event proposal:', 'Reject Event', {
    confirmButtonText: 'Reject Proposal',
    cancelButtonText: 'Cancel',
    inputPattern: /.+/,
    inputErrorMessage: 'Rejection reason cannot be empty.',
  }).then(({ value }) => {
    row.status = 'rejected'
    ElMessage.warning(`Event "${row.title}" rejected. Reason: ${value}`)
    if (drawerVisible.value && selectedEvent.value?.id === row.id) {
      drawerVisible.value = false
    }
  }).catch(() => {})
}

function handleTakeDown(row: any) {
  ElMessageBox.confirm(`Are you sure you want to take down "${row.title}"? It will be hidden from the public portal.`, 'Take Down Event', {
    confirmButtonText: 'Take Down',
    cancelButtonText: 'Cancel',
    type: 'warning',
  }).then(() => {
    row.status = 'disabled'
    ElMessage.info(`Event "${row.title}" taken down.`)
  }).catch(() => {})
}

function handleRestore(row: any) {
  row.status = 'approved'
  ElMessage.success(`Event "${row.title}" restored to Active.`)
}
</script>

<style scoped>
.admin-events-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.filter-controls {
  display: flex;
  gap: 12px;
}

.search-input {
  width: 280px;
}

.filter-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  gap: 16px;
  flex-wrap: wrap;
}

.status-tab-group {
  display: inline-flex;
  background-color: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
  gap: 4px;
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
  background-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
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

.filter-controls-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.table-container {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 8px;
}

.event-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.poster-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.info-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.title-text {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-text {
  font-size: 0.78rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.organiser-cell {
  display: flex;
  flex-direction: column;
}

.org-name {
  font-weight: 600;
  color: #1e293b;
}

.org-contact {
  font-size: 0.75rem;
  color: #94a3b8;
}

.status-badge-tag {
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 4px 10px;
}

.tab-label-with-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tab-badge {
  transform: translateY(-1px);
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}

/* Drawer Content */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #1e293b;
}

.drawer-poster {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  border-radius: 12px;
}

.submitted-label {
  font-size: 0.8rem;
  color: #64748b;
  margin-left: 12px;
}

.grid-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.grid-section label, .drawer-section label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.desc-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-top: 6px;
}

.drawer-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
