<template>
  <StudentLayout>
    <div class="dashboard-page">
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

<div class="ai-recommendation-section" style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #f6f8fd 0%, #f1f5f9 100%); border-radius: 12px; border: 1px solid #e2e8f0;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
    <h3 style="margin:0; display:flex; align-items:center; gap:8px; color: #1e293b; font-size: 18px;">
      <el-icon><MagicStick /></el-icon> AI Recommendations For You
    </h3>
    <el-button type="primary" :loading="isAiLoading" @click="generateRecommendations">
      Generate Suggestions
    </el-button>
  </div>
  
  <p v-if="aiReason" style="margin: 0 0 16px 0; color: #475569; font-size: 14px; font-style: italic;">
    "{{ aiReason }}"
  </p>

  <el-row v-if="recommendedEvents.length > 0" :gutter="28">
    <el-col v-for="event in recommendedEvents" :key="event.id" :xs="24" :sm="12" :md="8">
      <EventCard :event="event" @register-event="openRegistrationDialog" @cancel-registration="handleCancelRegistration" @toggle-bookmark="handleToggleBookmark" />
    </el-col>
  </el-row>
</div>

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
    
    <el-radio-group v-model="viewMode" class="filter-select">
      <el-radio-button value="list">List</el-radio-button>
      <el-radio-button value="calendar">Calendar</el-radio-button>
    </el-radio-group>
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

      <main class="content-body">
        <div v-if="viewMode === 'calendar'" class="calendar-wrapper">
          <el-calendar>
            <template #date-cell="{ data }">
              <div class="calendar-day">
                <div class="date-label">{{ data.day.split('-').pop() }}</div>
                <div class="events-for-day">
                  <div
                    v-for="event in getEventsForDate(data.day)"
                    :key="event.id"
                    class="calendar-event-item"
                    @click.stop="openRegistrationDialog(event)"
                  >
                    <el-tag size="small" disable-transitions class="calendar-tag">
                      {{ event.title }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </template>
          </el-calendar>
        </div>

        <template v-else>
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
        </template>
      </main>

      <footer v-if="viewMode === 'list' && displayedEvents.length > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[9, 12, 18]"
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="sortedEvents.length"
        />
      </footer>

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
            <img
              :src="selectedEvent.posterUrl || DEFAULT_FALLBACK_POSTER"
              :alt="selectedEvent.title"
              @error="onRegistrationPosterError"
            />
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
import { useAuthStore } from '@/stores/authStore'
import type { EventItem } from '@/types/event'
import { Refresh, Calendar, Location, User, MagicStick } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DEFAULT_FALLBACK_POSTER, handlePosterError } from '@/lib/posterFallback'
import { supabase } from '@/lib/supabase'

const eventStore = useEventStore()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()

const isAiLoading = ref(false)
const aiReason = ref('')
const recommendedEvents = ref<EventItem[]>([])

async function generateRecommendations() {
  if (!authStore.currentUser) {
    ElMessage.warning('Please sign in first.')
    return
  }
  isAiLoading.value = true
  try {
    const profile = {
      interests: authStore.currentUser.interests || [],
      clubs: authStore.currentUser.clubs || [],
      availableTime: authStore.currentUser.availableTime || []
    }
    
    const upcoming = sortedEvents.value.slice(0, 20).map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      description: e.description,
      startTime: e.startTime
    }))

    const { data, error } = await supabase.functions.invoke('ai-recommendation', {
      body: { profile, events: upcoming }
    })
    
    if (error) throw error
    
    if (data && data.recommendedIds) {
      recommendedEvents.value = eventStore.events.filter(e => data.recommendedIds.includes(e.id))
      aiReason.value = data.reason
    }
  } catch (error: any) {
    console.error('AI Recommendation Error:', error)
    ElMessage.error('Failed to load AI recommendations: ' + (error?.message || 'Unknown error'))
  } finally {
    isAiLoading.value = false
  }
}

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

const viewMode = ref<'list' | 'calendar'>('list')
function getEventsForDate(dateStr: string) {
  return sortedEvents.value.filter(
    (e) => e.startsAt?.split('T')[0] === dateStr
  )
}

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

function onRegistrationPosterError(event: Event) {
  handlePosterError(event, selectedEvent.value?.category)
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

.calendar-wrapper {
  background: var(--el-bg-color, #fff);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.calendar-day {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.events-for-day {
  flex: 1;
  overflow-y: auto;
  margin-top: 4px;
}
.calendar-event-item {
  margin-bottom: 4px;
  cursor: pointer;
}
.calendar-tag {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
