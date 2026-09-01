<template>
  <StudentLayout>
    <div class="dashboard-page">
      <!-- Top Hero Welcome Banner -->
      <section class="hero-section">
        <div class="hero-content">
          <span class="hero-subtitle">CAMPUS EVENTHUB PORTAL</span>
          <h1 class="hero-title">Discover, Join & Experience Campus Events</h1>
          <p class="hero-description">
            Explore upcoming workshops, sports leagues, tech hackathons, and academic seminars. Reserve your spot or join waitlists instantly.
          </p>

          <!-- Quick Stats Pills -->
          <div class="hero-pills">
            <div class="pill-item">
              <span class="pill-value">{{ eventStore.events.length }}</span>
              <span class="pill-label">Total Events</span>
            </div>
            <div class="pill-divider" />
            <div class="pill-item">
              <span class="pill-value">{{ eventStore.userRegisteredCount }}</span>
              <span class="pill-label">Your Passes</span>
            </div>
            <div class="pill-divider" />
            <div class="pill-item">
              <span class="pill-value">{{ eventStore.userWaitlistedCount }}</span>
              <span class="pill-label">In Waitlist</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Active Registration Alert Notification (If user has passes) -->
      <el-alert
        v-if="eventStore.userWaitlistedCount > 0"
        title="Waitlist Update Notification"
        type="warning"
        description="You are currently in the waitlist queue for 1 event. You will receive immediate notification if a spot opens up."
        show-icon
        closable
        class="mb-4"
      />

      <!-- Toolbar: Tabs, Categories, Sorting -->
      <div class="toolbar-section">
        <!-- View Filter Tabs -->
        <el-radio-group v-model="eventStore.activeTab" size="large" class="view-radio-tabs">
          <el-radio-button label="all">All Events</el-radio-button>
          <el-radio-button label="registered">
            My Passes ({{ eventStore.userRegisteredCount }})
          </el-radio-button>
          <el-radio-button label="waitlisted">
            Waitlist ({{ eventStore.userWaitlistedCount }})
          </el-radio-button>
          <el-radio-button label="saved">
            Saved ({{ eventStore.userBookmarkedCount }})
          </el-radio-button>
        </el-radio-group>

        <!-- Category & Sort Controls -->
        <div class="toolbar-controls">
          <!-- Category Select Dropdown -->
          <el-select
            v-model="eventStore.selectedCategory"
            placeholder="Category"
            style="width: 160px"
            size="default"
          >
            <el-option label="All Categories" value="All" />
            <el-option label="Academic" value="Academic" />
            <el-option label="Tech & Coding" value="Tech" />
            <el-option label="Sports & Fitness" value="Sports" />
            <el-option label="Cultural & Arts" value="Cultural" />
            <el-option label="Club Activities" value="Club" />
            <el-option label="Career Expo" value="Career" />
          </el-select>

          <!-- Sorting Select Dropdown -->
          <el-select
            v-model="sortBy"
            placeholder="Sort by"
            style="width: 160px"
            size="default"
          >
            <el-option label="Upcoming First" value="upcoming" />
            <el-option label="Most Popular" value="popular" />
            <el-option label="Available Seats" value="seats" />
          </el-select>

          <!-- Reset Filter Button -->
          <el-button 
            v-if="hasActiveFilter" 
            type="info" 
            plain 
            circle 
            title="Reset Filters"
            @click="resetFilters"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- Events Card Grid Display Section -->
      <div v-if="displayedEvents.length > 0" class="events-grid-container">
        <el-row :gutter="24">
          <el-col
            v-for="event in displayedEvents"
            :key="event.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8"
            class="card-col"
          >
            <EventCard
              :event="event"
              @register-event="openRegistrationDialog"
              @cancel-registration="handleCancelRegistration"
              @toggle-bookmark="eventStore.toggleBookmark"
            />
          </el-col>
        </el-row>
      </div>

      <!-- Empty State View -->
      <div v-else class="empty-state-wrapper">
        <el-empty description="No campus events found matching your criteria.">
          <el-button type="primary" @click="resetFilters">Reset Search Filters</el-button>
        </el-empty>
      </div>

      <!-- Pagination Section -->
      <div v-if="displayedEvents.length > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[9, 12, 18]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="sortedEvents.length"
        />
      </div>

      <!-- Interactive Event Registration Dialog Modal -->
      <el-dialog
        v-model="showRegistrationModal"
        title="Confirm Event Registration"
        width="520px"
        align-center
        destroy-on-close
      >
        <div v-if="selectedEvent" class="modal-event-summary">
          <div class="modal-poster">
            <img :src="selectedEvent.posterUrl" :alt="selectedEvent.title" />
          </div>
          <div class="modal-info">
            <el-tag size="small" type="primary" class="mb-1">{{ selectedEvent.category }}</el-tag>
            <h3 class="modal-title">{{ selectedEvent.title }}</h3>
            <p class="modal-desc">{{ selectedEvent.description }}</p>
            
            <div class="modal-meta">
              <div class="meta-row">
                <el-icon><Calendar /></el-icon>
                <span><strong>Date & Time:</strong> {{ selectedEvent.startTime }}</span>
              </div>
              <div class="meta-row">
                <el-icon><Location /></el-icon>
                <span><strong>Location:</strong> {{ selectedEvent.location }}</span>
              </div>
              <div class="meta-row">
                <el-icon><User /></el-icon>
                <span><strong>Organiser:</strong> {{ selectedEvent.organiser.name }}</span>
              </div>
            </div>

            <el-divider style="margin: 16px 0;" />

            <!-- Seat Availability Notice -->
            <div v-if="selectedEvent.registeredCount >= selectedEvent.capacity" class="waitlist-notice">
              <el-alert
                title="Seats Filled: Joining Waitlist Queue"
                type="warning"
                description="This event is currently full. Confirming will place you on the official waitlist. You will automatically be bumped up if a seat frees up."
                :closable="false"
                show-icon
              />
            </div>
            <div v-else class="open-notice">
              <el-alert
                title="Spot Available for Instant Confirmation"
                type="success"
                description="Your seat will be reserved immediately upon confirmation."
                :closable="false"
                show-icon
              />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="dialog-footer">
            <el-button @click="showRegistrationModal = false">Cancel</el-button>
            <el-button
              type="primary"
              :loading="isSubmitting"
              @click="confirmRegistration"
            >
              {{ selectedEvent && selectedEvent.registeredCount >= selectedEvent.capacity ? 'Confirm Join Waitlist' : 'Confirm Registration' }}
            </el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </StudentLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StudentLayout from '@/layouts/StudentLayout.vue'
import EventCard from '@/components/EventCard.vue'
import { useEventStore } from '@/stores/eventStore'
import type { EventItem } from '@/types/event'
import { Refresh, Calendar, Location, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const eventStore = useEventStore()

onMounted(() => {
  eventStore.searchQuery = ''
  eventStore.selectedCategory = 'All'
  eventStore.activeTab = 'all'
  eventStore.fetchEventsFromSupabase()
})

// Local Controls State
const sortBy = ref<'upcoming' | 'popular' | 'seats'>('upcoming')
const currentPage = ref(1)
const pageSize = ref(9)

// Registration Modal State
const showRegistrationModal = ref(false)
const selectedEvent = ref<EventItem | null>(null)
const isSubmitting = ref(false)

// Computed active filter status
const hasActiveFilter = computed(() => {
  return (
    eventStore.searchQuery !== '' ||
    eventStore.selectedCategory !== 'All' ||
    eventStore.activeTab !== 'all'
  )
})

// Sorted Events based on criteria
const sortedEvents = computed(() => {
  const list = [...eventStore.filteredEvents]
  if (sortBy.value === 'popular') {
    list.sort((a, b) => b.registeredCount - a.registeredCount)
  } else if (sortBy.value === 'seats') {
    list.sort((a, b) => (a.capacity - a.registeredCount) - (b.capacity - b.registeredCount))
  }
  return list
})

// Paginated slice
const displayedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return sortedEvents.value.slice(start, end)
})

// Reset filters action
function resetFilters() {
  eventStore.searchQuery = ''
  eventStore.selectedCategory = 'All'
  eventStore.activeTab = 'all'
  sortBy.value = 'upcoming'
  currentPage.value = 1
}

// Open Registration Dialog Modal
function openRegistrationDialog(event: EventItem) {
  selectedEvent.value = event
  showRegistrationModal.value = true
}

async function confirmRegistration() {
  if (!selectedEvent.value) return

  isSubmitting.value = true
  const event = selectedEvent.value
  try {
    const finalStatus = await eventStore.registerEvent(event.id)
    showRegistrationModal.value = false

    if (finalStatus === 'waitlisted') {
      ElMessage({
        type: 'warning',
        message: `Added to waitlist queue for "${event.title}".`,
        duration: 4000,
      })
    } else {
      ElMessage({
        type: 'success',
        message: `Registration confirmed for "${event.title}"! Access pass generated.`,
        duration: 4000,
      })
    }
  } catch (e) {
    ElMessage({
      type: 'error',
      message: e instanceof Error ? e.message : 'Registration failed. Please try again.',
      duration: 5000,
    })
  } finally {
    isSubmitting.value = false
  }
}

// Handle Cancel Registration Confirmation
function handleCancelRegistration(eventId: string) {
  const event = eventStore.events.find((e: EventItem) => e.id === eventId)
  if (!event) return

  const actionText = event.isWaitlisted ? 'leave the waitlist for' : 'cancel registration for'

  ElMessageBox.confirm(
    `Are you sure you want to ${actionText} "${event.title}"?`,
    'Confirm Action',
    {
      confirmButtonText: 'Yes, Proceed',
      cancelButtonText: 'Keep My Spot',
      type: 'warning',
    }
  )
    .then(() => {
      eventStore.cancelRegistration(eventId)
      ElMessage({
        type: 'info',
        message: `Registration update saved.`,
      })
    })
    .catch(() => {})
}
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 16px;
  padding: 32px 40px;
  color: #ffffff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(0, 0, 0, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 760px;
}

.hero-subtitle {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #60a5fa;
  display: inline-block;
  margin-bottom: 8px;
}

.hero-title {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.25;
  margin: 0 0 12px 0;
  letter-spacing: -0.5px;
}

.hero-description {
  font-size: 1rem;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 24px;
}

/* Hero Pills Stats */
.hero-pills {
  display: inline-flex;
  align-items: center;
  gap: 20px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  padding: 10px 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.pill-item {
  display: flex;
  flex-direction: column;
}

.pill-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: #38bdf8;
}

.pill-label {
  font-size: 0.72rem;
  color: #cbd5e1;
  font-weight: 600;
  text-transform: uppercase;
}

.pill-divider {
  width: 1px;
  height: 28px;
  background-color: rgba(255, 255, 255, 0.15);
}

.mb-4 {
  margin-bottom: 16px;
}

/* Toolbar Section */
.toolbar-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  background: #ffffff;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Cards Grid */
.events-grid-container {
  margin-top: 8px;
}

.card-col {
  margin-bottom: 24px;
}

/* Empty State */
.empty-state-wrapper {
  background: #ffffff;
  border-radius: 12px;
  padding: 60px 20px;
  border: 1px solid #e2e8f0;
  margin-top: 12px;
}

/* Pagination Container */
.pagination-container {
  display: flex;
  justify-content: flex-end;
  background: #ffffff;
  padding: 16px 24px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

/* Registration Modal Summary */
.modal-event-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-poster {
  width: 100%;
  height: 160px;
  border-radius: 8px;
  overflow: hidden;
}

.modal-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 4px 0 8px 0;
}

.modal-desc {
  font-size: 0.88rem;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 12px;
}

.modal-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #334155;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-row .el-icon {
  color: #3b82f6;
  font-size: 1rem;
}
</style>
