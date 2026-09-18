<template>
  <StudentLayout>
    <div class="dashboard-page">

      <!-- 1. 顶部 Header 与 筛选集成区（替代原本死板的 Toolbar 盒子） -->
      <!-- 2. Page Header 左右分栏排版 -->
<header class="page-header">
  <div>
    <span class="page-eyebrow">WHAT'S ON?</span>
    <h1 class="main-title">Campus Events</h1>
    <p class="sub-title">
      We run heaps of awesome events throughout the year, including O Week & Re-O Week, gigs, quizzes, games, student markets, free food, giveaways, workshops and more! Check out our upcoming events on your campus.
    </p>
  </div>

  <div class="result-summary">
    <strong>{{ sortedEvents.length }}</strong>
    <span>{{ sortedEvents.length === 1 ? 'event' : 'events' }} found</span>
  </div>
</header>

<section class="control-bar">
  <div class="filter-group">
    <span class="filter-label">Filter events</span>

    <el-select
      v-model="eventStore.selectedCategory"
      placeholder="All categories"
      class="filter-select"
    >
      <el-option label="All Categories" value="All" />

      <el-option
        v-for="category in categoryStore.activeCategories"
        :key="category.slug"
        :label="category.name"
        :value="category.slug"
      />
    </el-select>

    <el-select
      v-model="sortBy"
      placeholder="Sort events"
      class="filter-select"
    >
      <el-option label="Upcoming first" value="upcoming" />
      <el-option label="Most popular" value="popular" />
      <el-option label="Available seats" value="seats" />
    </el-select>
  </div>

  <button
    v-if="hasActiveFilter"
    type="button"
    class="reset-text-btn"
    @click="resetFilters"
  >
    <el-icon><Refresh /></el-icon>
    Reset filters
  </button>
</section>

      <!-- 3. 卡片网格展示区 -->
      <main class="content-body">
        <div v-if="displayedEvents.length > 0" class="events-grid-container">
          <el-row :gutter="28">
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
                @toggle-bookmark="handleToggleBookmark"
              />
            </el-col>
          </el-row>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state-wrapper">
          <el-empty description="No campus events found matching your criteria.">
            <button class="brand-btn" @click="resetFilters">Reset Search Filters</button>
          </el-empty>
        </div>
      </main>

      <!-- 4. 底栏分页 -->
      <footer v-if="displayedEvents.length > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[9, 12, 18]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="sortedEvents.length"
        />
      </footer>

      <!-- 5. 交互弹窗：杂志交织风格重构 -->
      <el-dialog
        v-model="showRegistrationModal"
        title="Confirm Event Registration"
        width="560px"
        align-center
        destroy-on-close
        class="magazine-dialog"
      >
        <div v-if="selectedEvent" class="modal-event-summary">
          <div class="modal-hero-cover">
            <img :src="selectedEvent.posterUrl" :alt="selectedEvent.title" />
            <span class="category-badge">{{ selectedEvent.category }}</span>
          </div>

          <div class="modal-info">
            <h3 class="modal-title">{{ selectedEvent.title }}</h3>
            <p class="modal-desc">{{ selectedEvent.description }}</p>

            <div class="modal-meta-grid">
              <div class="meta-item">
                <el-icon><Calendar /></el-icon>
                <div>
                  <label>Date & Time</label>
                  <span>{{ selectedEvent.startTime }}</span>
                </div>
              </div>
              <div class="meta-item">
                <el-icon><Location /></el-icon>
                <div>
                  <label>Location</label>
                  <span>{{ selectedEvent.location }}</span>
                </div>
              </div>
              <div class="meta-item full-width">
                <el-icon><User /></el-icon>
                <div>
                  <label>Organiser</label>
                  <span>{{ selectedEvent.organiser.name }}</span>
                </div>
              </div>
            </div>

            <!-- 状态提示 -->
            <div v-if="selectedEvent.registeredCount >= selectedEvent.capacity" class="notice-block">
              <el-alert
                title="Seats Filled: Joining Waitlist Queue"
                type="warning"
                description="This event is currently full. Confirming will place you on the official waitlist."
                :closable="false"
                show-icon
              />
            </div>
            <div v-else class="notice-block">
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
            <button class="ghost-btn" @click="showRegistrationModal = false">Cancel</button>
            <button
              class="brand-btn"
              :disabled="isSubmitting"
              @click="confirmRegistration"
            >
              {{ selectedEvent && selectedEvent.registeredCount >= selectedEvent.capacity ? 'Confirm Join Waitlist' : 'Confirm Registration' }}
            </button>
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
import { useCategoryStore } from '@/stores/categoryStore'
import type { EventItem } from '@/types/event'
import { Refresh, Calendar, Location, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const eventStore = useEventStore()
const categoryStore = useCategoryStore()

onMounted(() => {
  eventStore.searchQuery = ''
  eventStore.selectedCategory = 'All'
  eventStore.activeTab = 'all'
  void Promise.allSettled([
    eventStore.fetchEventsFromSupabase(),
    categoryStore.fetchCategories(),
  ])
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

async function handleToggleBookmark(eventId: string) {
  try {
    await eventStore.toggleBookmark(eventId)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to update saved event.')
  }
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
    .then(async () => {
      try {
        await eventStore.cancelRegistration(eventId)
        ElMessage({
          type: 'info',
          message: `Registration update saved.`,
        })
      } catch (error) {
        ElMessage.error(
          error instanceof Error ? error.message : 'Unable to cancel registration.',
        )
      }
    })
    .catch(() => {})
}
</script>

<style scoped>
@import '@/assets/styles/StudentDashboard.css';
</style>
