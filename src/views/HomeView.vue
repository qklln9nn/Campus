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
            <span class="brand-sub">EVENT NETWORK</span>
          </div>
        </router-link>

        <!-- Navbar Anchor Links -->
        <nav class="nav-links">
          <a href="#hero" class="nav-item active">Home</a>
          <a href="#categories" class="nav-item">Event Categories</a>
          <a href="#featured" class="nav-item">Featured Events</a>
          <a href="#features" class="nav-item">Platform Features</a>
        </nav>

        <!-- Right Single Auth Action Button -->
        <div class="header-actions">
          <template v-if="authStore.isAuthenticated">
            <el-button type="primary" class="login-btn" @click="handleViewAllEvents">
              <el-icon class="el-icon--left"><Compass /></el-icon> Student Portal
            </el-button>
            <el-button type="info" plain class="logout-btn" @click="authStore.logout()">
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
      <div class="hero-backdrop-glow"></div>
      <div class="hero-container">
        <div class="hero-badge">
          <el-icon><Lightning /></el-icon>
          <span>Campus EventHub Network 2026</span>
        </div>

        <h1 class="hero-title">
          Discover, Connect & <span class="gradient-text">Experience</span> Campus Events
        </h1>

        <p class="hero-subtitle">
          The ultimate central portal for students to discover hackathons, sports leagues, seminars and club events. Effortless registrations with real-time pass generation.
        </p>

        <div class="hero-cta-group">
          <el-button type="primary" size="large" class="hero-cta-primary" @click="handleViewAllEvents">
            <el-icon class="el-icon--left"><Compass /></el-icon>
            Explore All Events
          </el-button>
        </div>

        <!-- Dynamic Live Statistics Bar / Dashboard Overview -->
        <div class="hero-stats-grid">
          <div class="stat-card">
            <span class="stat-number">{{ eventStore.events.length }}</span>
            <span class="stat-label">Active Events</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-card">
            <span class="stat-number">{{ totalRegistrations }}</span>
            <span class="stat-label">Passes Issued</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-card">
            <span class="stat-number">100%</span>
            <span class="stat-label">Instant Pass Sync</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-card">
            <span class="stat-number">24/7</span>
            <span class="stat-label">Waitlist Auto-Queue</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 2. Event Categories Section -->
    <section id="categories" class="categories-section">
      <div class="section-container">
        <div class="section-header">
          <span class="section-tag">EXPLORE BY CATEGORY</span>
          <h2 class="section-title">Event Categories & Domains</h2>
          <p class="section-desc">Filter through diverse categories tailored for academics, tech enthusiasts, athletes, and club leaders.</p>
        </div>

        <div class="categories-grid">
          <div
            v-for="cat in categories"
            :key="cat.name"
            class="category-card"
            @click="navigateToCategory(cat.name)"
          >
            <div class="cat-icon-wrap" :style="{ background: cat.bg, color: cat.color }">
              <component :is="cat.icon" />
            </div>
            <h3 class="cat-name">{{ cat.name }}</h3>
            <p class="cat-count">{{ getCategoryCount(cat.name) }} Events</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Featured Events (Strictly 3 Events) -->
    <section id="featured" class="featured-section">
      <div class="section-container">
        <div class="featured-header-row">
          <div>
            <span class="section-tag">FEATURED EVENTS</span>
            <h2 class="section-title">Upcoming Highlight Events</h2>
          </div>
          <a class="view-all-link" @click.prevent="handleViewAllEvents">
            View All Events ({{ eventStore.events.length }})
            <el-icon><Right /></el-icon>
          </a>
        </div>

        <!-- Displays 3 Events -->
        <div class="featured-grid">
          <el-row :gutter="24">
            <el-col
              v-for="event in featuredEvents"
              :key="event.id"
              :xs="24"
              :sm="12"
              :md="8"
              class="card-col"
            >
              <div class="clickable-card-wrapper" @click="handleCardClick(event)">
                <EventCard
                  :event="event"
                  hide-action-btn
                  hide-overlay-actions
                />
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </section>

    <!-- 4. Platform Features Section (功能介绍) -->
    <section id="features" class="portals-section">
      <div class="section-container">
        <div class="section-header center">
          <span class="section-tag">PLATFORM FEATURES</span>
          <h2 class="section-title">Powerful Tools For Campus Community</h2>
        </div>

        <div class="portals-grid">
          <!-- Student Portal Card -->
          <div class="portal-card student-portal">
            <div class="portal-badge">STUDENT EXPERIENCE</div>
            <h3 class="portal-title">Seamless Event Discovery</h3>
            <ul class="portal-feature-list">
              <li>
                <el-icon><CircleCheckFilled /></el-icon>
                <span>Instant reservation with QR access pass generation</span>
              </li>
              <li>
                <el-icon><CircleCheckFilled /></el-icon>
                <span>Real-time waitlist notifications when seats free up</span>
              </li>
              <li>
                <el-icon><CircleCheckFilled /></el-icon>
                <span>One-click event bookmarking and pass management</span>
              </li>
            </ul>
            <el-button type="primary" size="large" class="portal-btn-unified" @click="handleViewAllEvents">
              Enter Student Portal
            </el-button>
          </div>

          <!-- Organiser Portal Card -->
          <div class="portal-card organiser-portal">
            <div class="portal-badge alt">ORGANISER PORTAL</div>
            <h3 class="portal-title">Powerful Tools For Event Hosts</h3>
            <ul class="portal-feature-list">
              <li>
                <el-icon><CircleCheckFilled /></el-icon>
                <span>Create and publish events in under 2 minutes</span>
              </li>
              <li>
                <el-icon><CircleCheckFilled /></el-icon>
                <span>Real-time registration tracking & attendance metrics</span>
              </li>
              <li>
                <el-icon><CircleCheckFilled /></el-icon>
                <span>Automated capacity management & waitlist handling</span>
              </li>
            </ul>
            <el-button type="success" size="large" class="portal-btn-unified" @click="handleOrganiserPortal">
              <el-icon class="el-icon--left"><Management /></el-icon> Enter Organiser Console
            </el-button>
          </div>
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
        <p>© 2026 Campus EventHub. All Rights Reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import EventCard from '@/components/EventCard.vue'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import type { EventItem, CategoryType } from '@/types/event'

onMounted(() => {
  eventStore.searchQuery = ''
  eventStore.selectedCategory = 'All'
  eventStore.activeTab = 'all'
  eventStore.fetchEventsFromSupabase()
})
import {
  Calendar,
  Location,
  User,
  Management,
  UserFilled,
  Lightning,
  Compass,
  Right,
  CircleCheckFilled,
  Reading,
  Collection,
  Trophy,
  Ticket
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()

// Modal State
const showRegistrationModal = ref(false)
const selectedEvent = ref<EventItem | null>(null)
const isSubmitting = ref(false)

// Category Definitions with Icons
const categories: { name: CategoryType; icon: Component; bg: string; color: string }[] = [
  { name: 'Academic', icon: Reading, bg: '#eff6ff', color: '#2563eb' },
  { name: 'Tech', icon: Lightning, bg: '#f0fdf4', color: '#16a34a' },
  { name: 'Sports', icon: Trophy, bg: '#fff7ed', color: '#ea580c' },
  { name: 'Cultural', icon: Collection, bg: '#faf5ff', color: '#9333ea' },
  { name: 'Club', icon: Ticket, bg: '#fdf2f8', color: '#db2777' },
  { name: 'Career', icon: User, bg: '#f1f5f9', color: '#475569' }
]

// Total Registrations Count Across All Events
const totalRegistrations = computed(() => {
  return eventStore.events.reduce((sum: number, e: EventItem) => sum + e.registeredCount, 0)
})

// Top Featured Events (Strictly 3 Events)
const featuredEvents = computed(() => {
  return eventStore.events.slice(0, 3)
})

// Category Events Count Helper
function getCategoryCount(catName: CategoryType) {
  return eventStore.events.filter((e: EventItem) => e.category === catName).length
}

// Smart Navigation: Check Login State before View All or Category Filter
function handleViewAllEvents() {
  if (!authStore.isAuthenticated) {
    ElMessage.info('Please sign in first to view all events and access your student portal.')
    router.push('/login')
  } else {
    router.push('/dashboard')
  }
}

// Smart Navigation: Organiser Console
function handleOrganiserPortal() {
  if (!authStore.isAuthenticated) {
    ElMessage.info('Please sign in first to access the Organiser Console.')
    router.push('/login')
  } else {
    router.push('/organiser/dashboard')
  }
}

// Navigate to Category with Login Inspection
function navigateToCategory(catName: CategoryType) {
  eventStore.selectedCategory = catName
  if (!authStore.isAuthenticated) {
    ElMessage.info(`Please sign in first to explore ${catName} events.`)
    router.push('/login')
  } else {
    router.push('/dashboard')
  }
}

// Card Click Handle: Redirect to Login or Student Dashboard
function handleCardClick(_event: EventItem) {
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

function handleCancelRegistration(eventId: string) {
  const event = eventStore.events.find((e: EventItem) => e.id === eventId)
  if (!event) return

  ElMessageBox.confirm(
    `Cancel registration for "${event.title}"?`,
    'Confirm Action',
    { confirmButtonText: 'Yes, Proceed', cancelButtonText: 'Keep Spot', type: 'warning' }
  ).then(() => {
    eventStore.cancelRegistration(eventId)
    ElMessage({ type: 'info', message: 'Registration updated.' })
  }).catch(() => {})
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #f8fafc;
  color: #0f172a;
}

/* Header Navbar */
.home-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.logo-icon.small {
  width: 32px;
  height: 32px;
  font-size: 1rem;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.brand-name .highlight {
  color: #2563eb;
}

.brand-sub {
  font-size: 0.65rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 1px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-item {
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  color: #475569;
  transition: color 0.2s ease;
}

.nav-item:hover, .nav-item.active {
  color: #2563eb;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Hero Section */
.hero-section {
  position: relative;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1e293b 100%);
  color: #ffffff;
  padding: 90px 24px 80px 24px;
  overflow: hidden;
}

.hero-backdrop-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(0, 0, 0, 0) 70%);
  pointer-events: none;
}

.hero-container {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  z-index: 1;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #93c5fd;
  margin-bottom: 24px;
}

.hero-title {
  font-size: 3.2rem;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -1px;
  margin-bottom: 20px;
}

.gradient-text {
  background: linear-gradient(135deg, #60a5fa 0%, #a855f7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: #94a3b8;
  max-width: 720px;
  margin: 0 auto 36px auto;
  line-height: 1.6;
}

.hero-cta-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 60px;
}

.hero-cta-primary {
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 10px;
}

.hero-cta-secondary {
  padding: 14px 32px;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hero-cta-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

/* Hero Stats Bar */
.hero-stats-grid {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 24px;
}

.stat-card {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 1.8rem;
  font-weight: 800;
  color: #38bdf8;
}

.stat-label {
  font-size: 0.78rem;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  margin-top: 4px;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(255, 255, 255, 0.12);
}

/* Common Section Layout */
.section-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 80px 24px;
}

.section-header {
  margin-bottom: 48px;
}

.section-header.center {
  text-align: center;
}

.section-tag {
  font-size: 0.75rem;
  font-weight: 800;
  color: #2563eb;
  letter-spacing: 1.5px;
  display: block;
  margin-bottom: 8px;
}

.section-title {
  font-size: 2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.section-desc {
  font-size: 1rem;
  color: #64748b;
  margin-top: 8px;
}

/* Categories Grid */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
}

.category-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e1;
}

.cat-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 14px;
}

.cat-name {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.cat-count {
  font-size: 0.8rem;
  color: #64748b;
  margin-top: 4px;
}

/* Featured Events Section */
.featured-section {
  background: #ffffff;
}

.featured-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
}

.card-col {
  margin-bottom: 24px;
}

.view-all-center-container {
  margin-top: 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.view-all-large-btn {
  padding: 14px 36px;
  font-size: 1.05rem;
  font-weight: 700;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.view-all-large-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
}

.view-all-subtext {
  font-size: 0.88rem;
  color: #64748b;
  margin: 0;
}

.view-all-link {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #2563eb;
  text-decoration: none;
  font-size: 0.95rem;
}

.view-all-link:hover {
  text-decoration: underline;
}

.card-col {
  margin-bottom: 24px;
}

.clickable-card-wrapper {
  cursor: pointer;
  height: 100%;
}

/* Portals Section */
.portals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 32px;
}

.portal-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 40px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.student-portal {
  background: linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%);
  border-color: #bfdbfe;
}

.organiser-portal {
  background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
  border-color: #bbf7d0;
}

.portal-badge {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 4px 12px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.portal-badge.alt {
  background: #dcfce7;
  color: #15803d;
}

.portal-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 24px;
}

.portal-feature-list {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.portal-feature-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  color: #334155;
}

.portal-feature-list .el-icon {
  color: #2563eb;
  font-size: 1.1rem;
}

.portal-btn-unified {
  width: 100% !important;
  height: 48px !important;
  font-size: 0.98rem !important;
  font-weight: 700 !important;
  border-radius: 12px !important;
  margin-top: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.portal-btn-unified:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

/* Footer */
.home-footer {
  background: #0f172a;
  color: #94a3b8;
  border-top: 1px solid #1e293b;
}

.footer-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 60px 24px 40px 24px;
  display: flex;
  justify-content: space-between;
  gap: 40px;
  flex-wrap: wrap;
}

.footer-brand {
  max-width: 400px;
}

.footer-brand .brand-name {
  color: #ffffff;
}

.footer-tagline {
  font-size: 0.9rem;
  margin-top: 16px;
  line-height: 1.6;
}

.footer-links-group {
  display: flex;
  gap: 60px;
}

.link-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.link-col h4 {
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.link-col a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.88rem;
  transition: color 0.2s ease;
}

.link-col a:hover {
  color: #38bdf8;
}

.footer-bottom {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  border-top: 1px solid #1e293b;
  text-align: center;
  font-size: 0.82rem;
}

/* Modal styles */
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

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.2rem;
  }
  .nav-links {
    display: none;
  }
  .hero-stats-grid {
    flex-direction: column;
    gap: 16px;
  }
  .stat-divider {
    width: 100%;
    height: 1px;
  }
}
</style>
