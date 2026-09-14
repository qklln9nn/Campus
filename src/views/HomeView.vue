<template>
  <div class="home-page">
    <!-- Top Navigation Header -->
    <header class="home-header">
      <div class="header-container">
        <router-link to="/" class="logo-group">
          <div class="logo-icon">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="logo-text">
            <span class="brand-name">Campus<span class="highlight">Hub</span></span>
            <span class="brand-sub">Connect. Explore. Meet.</span>
          </div>
        </router-link>

        <!-- Navbar Anchor Links -->
        <nav class="nav-links">
          <a href="#hero" class="nav-item active">Home</a>
          <a href="#featured" class="nav-item">Featured Events</a>
          <a href="#organiser" class="nav-item">Organiser Portal</a>
        </nav>

        <!-- Right Single Auth Action Button -->
        <div class="header-actions">
          <template v-if="authStore.isAuthenticated">
            <el-button type="primary" class="login-btn" @click="handleViewAllEvents">
              <el-icon class="el-icon--left"><Compass /></el-icon> Student Portal
            </el-button>
            <el-button type="info" plain class="logout-btn" @click="handleLogout">
              Sign Out
            </el-button>
          </template>
          <template v-else>
            <router-link to="/login">
              <el-button type="primary" size="large" class="login-btn">
                <el-icon class="el-icon--left"><UserFilled /></el-icon> Sign In / Login
              </el-button>
            </router-link>
          </template>
        </div>
      </div>
    </header>

    <!-- 1. Hero & Dashboard Overview Section -->
    <section id="hero" class="hero-section">
      <div class="hero-shell">
        <div class="hero-container">
          <span class="hero-kicker">CAMPUS EVENTS &amp; ACTIVITIES</span>
          <h1 class="hero-title">What's On?</h1>

          <p class="hero-subtitle">
            Find upcoming events across campus and the community. Easily register for
            activities, track schedules and connect with people who share your interests.
          </p>

          <div class="hero-cta-group">
            <el-button type="primary" size="large" class="hero-cta-primary" @click="handleViewAllEvents">
              <el-icon><Compass /></el-icon>
              <span>Discover More</span>
            </el-button>
          </div>
        </div>

        <div class="hero-art" aria-hidden="true">
          <img src="/hero_bg.jpeg" alt="" />
        </div>
      </div>
    </section>

<!-- 2. Event Categories and Featured Events -->
<section id="featured" class="featured-section">
  <div class="section-container">
    <div class="featured-header-row">
      <div>
        <span class="hero-kicker">EXPLORE CAMPUS LIFE</span>
        <h2 class="section-title">Upcoming Highlight Events</h2>
        <p class="section-desc">
          Choose a category to find events that match your interests.
        </p>
      </div>
    </div>

    <!-- Category Tabs -->
    <div class="category-tabs">
      <button
        v-for="category in homeCategoryTabs"
        :key="category.slug"
        type="button"
        class="category-tab"
        :class="{ active: selectedHomeCategory === category.slug }"
        @click="selectedHomeCategory = category.slug"
      >
        {{ category.name }}
      </button>
    </div>

    <!-- Filtered Event Cards -->
    <div v-if="featuredEvents.length > 0" class="featured-grid">
      <el-row :gutter="24">
        <el-col
          v-for="event in featuredEvents"
          :key="event.id"
          :xs="24"
          :sm="12"
          :md="8"
          class="card-col"
        >
          <div
            class="clickable-card-wrapper"
            @click="handleCardClick(event)"
          >
            <EventCard
              :event="event"
              hide-action-btn
              hide-overlay-actions
              @register-event="openRegistrationDialog"
            />
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- No Matching Events -->
    <el-empty
      v-else
      description="No events are currently available in this category."
    />

    <!-- View All Button -->
    <div class="view-all-footer">
      <el-button
        type="primary"
        size="large"
        class="view-all-large-btn"
        @click="handleViewAllEvents"
      >
        View All Events
        <el-icon><Right /></el-icon>
      </el-button>
    </div>
  </div>
</section>



    <!-- Registration Dialog Modal (Shared interactive functionality) -->
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

          <div v-if="selectedEvent.registeredCount >= selectedEvent.capacity" class="waitlist-notice">
            <el-alert
              title="Seats Filled: Joining Waitlist Queue"
              type="warning"
              description="This event is full. Confirming will place you on the waitlist queue."
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

<!-- Organiser Invitation -->
<section class="organiser-section" id="organiser">
  <div class="organiser-content">
    <div class="organiser-collage">
      <figure class="organiser-photo photo-main">
        <img
          src="/organiser-planning.jpeg"
          alt="Students planning a campus event"
        />
        <figcaption>Plan something meaningful.</figcaption>
      </figure>

      <figure class="organiser-photo photo-secondary">
        <img
          src="/organiser-event.jpeg"
          alt="Students attending a campus event"
        />
      </figure>

      <span class="collage-note">Your idea could be next!</span>
    </div>

    <div class="organiser-copy">
      <span class="hero-kicker">CREATE · CONNECT · LEAD</span>

      <h2 class = "hero-title">Have an idea for campus?</h2>

      <p class="section-desc">
        Turn your idea into an event. Create a listing, manage registrations
        and bring students together in one place.
      </p>

        <li class="section-desc">Publish your event information</li>
        <li class="section-desc">Manage registrations and attendees</li>
        <li class="section-desc">Build a stronger campus community</li>

          <!-- View All Button -->
    <div class="view-all-footer">
      <el-button
        type="primary"
        size="large"
        class="organiser-create-btn"
        @click="handleCreateEvent"
      >
        <el-icon><Plus /></el-icon>
        Create New Event
      </el-button>
    </div>


      <span class="organiser-permission">
        Available to approved organiser accounts
      </span>
    </div>
  </div>
</section>

   <!-- Footer -->
<footer class="home-footer">
  <div class="footer-container">
    <div class="footer-brand">
      <div class="logo-group">
        <div class="logo-icon small">
          <el-icon><Calendar /></el-icon>
        </div>
        <span class="brand-name">Campus<span class="highlight">Hub</span></span>
      </div>
      <p class="footer-tagline">Empowering campus life with modern event discovery and registration tools.</p>
    </div>
    <div class="footer-links-group">
      <div class="link-col">
        <h4>Quick Links</h4>
        <router-link to="/dashboard">All Events</router-link>
        <router-link to="/create">Publish Event</router-link>
        <router-link to="/login">Sign In</router-link>
      </div>
      <div class="link-col">
        <h4>Portals</h4>
        <router-link to="/dashboard">Student Center</router-link>
        <router-link to="/profile">My Profile & Settings</router-link>
        <router-link to="/organiser/dashboard">Organiser Console</router-link>
        <router-link to="/admin">Admin Panel</router-link>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <p>© 2026 CampusHub. All Rights Reserved.</p>
  </div>
</footer>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EventCard from '@/components/EventCard.vue'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { categorySlug } from '@/lib/category'
import type { EventItem } from '@/types/event'

onMounted(() => {
  eventStore.searchQuery = ''
  eventStore.selectedCategory = 'All'
  eventStore.activeTab = 'all'
  void Promise.allSettled([
    eventStore.fetchEventsFromSupabase(),
    categoryStore.fetchCategories(),
  ])
})
import {
  Calendar,
  Location,
  User,
  UserFilled,
  Compass,
  Right,
  Plus
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()
const selectedHomeCategory = ref('All')
const categoryStore = useCategoryStore()

async function handleLogout() {
  try {
    await authStore.logout()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to sign out.')
  }
}

// Modal State
const showRegistrationModal = ref(false)
const selectedEvent = ref<EventItem | null>(null)
const isSubmitting = ref(false)
const homeCategoryTabs = computed(() => [
  { slug: 'All', name: 'All' },
  ...categoryStore.activeCategories,
])
const featuredEvents = computed(() => {
  const filteredEvents =
    selectedHomeCategory.value === 'All' ? eventStore.events : eventStore.events.filter(
          (event) => categorySlug(event.category) ===
            selectedHomeCategory.value,
        )
  return filteredEvents.slice(0, 3)
})


// Smart Navigation: Check Login State before View All or Category Filter
function handleViewAllEvents() {
  if (!authStore.isAuthenticated) {
    ElMessage.info('Please sign in first to view all events and access your student portal.')
    router.push('/login')
  } else {
    router.push('/dashboard')
  }
}



// Card Click Handle: Redirect to Login or Student Dashboard
function handleCardClick(event?: EventItem) {
  void event
  if (!authStore.isAuthenticated) {
    ElMessage.info('Please sign in first to view event details and register.')
    router.push('/login')
  } else {
    router.push('/dashboard')
  }
}

// Registration Dialog Handle: Require Login before Registration
function openRegistrationDialog(event: EventItem) {
  if (!authStore.isAuthenticated) {
    ElMessage.info('Please sign in first to register for campus events.')
    router.push('/login')
    return
  }
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
        duration: 4000
      })
    } else {
      ElMessage({
        type: 'success',
        message: `Registration confirmed for "${event.title}"! Access pass generated.`,
        duration: 4000
      })
    }
  } catch (e) {
    ElMessage({
      type: 'error',
      message: e instanceof Error ? e.message : 'Registration failed. Please try again.',
      duration: 5000
    })
  } finally {
    isSubmitting.value = false
  }
}
function handleCreateEvent() {
  if (!authStore.isAuthenticated) {
    ElMessage.info('Please sign in first to create an event.')
    router.push('/login')
    return
  }

  if (authStore.userRole !== 'ORGANISER') {
    ElMessage.warning(
      'Only organiser accounts have permission to create events.',
    )
    return
  }

  router.push('/create')
}

</script>

<style scoped>
@import '@/assets/styles/home.css';
</style>
