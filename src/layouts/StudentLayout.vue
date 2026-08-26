<template>
  <div class="student-layout">
    <!-- Top Navbar -->
    <header class="top-navbar">
      <div class="navbar-left">
        <!-- Sidebar Collapse Toggle Button -->
        <button class="icon-toggle-btn" @click="isSidebarCollapsed = !isSidebarCollapsed">
          <el-icon><Expand v-if="isSidebarCollapsed" /><Fold v-else /></el-icon>
        </button>

        <!-- Brand Logo -->
        <router-link to="/dashboard" class="brand-logo">
          <div class="logo-icon-bg">
            <el-icon><Calendar /></el-icon>
          </div>
          <span class="brand-title">Campus <span class="highlight">EventHub</span></span>
        </router-link>
      </div>

      <!-- Center Search Bar -->
      <div class="navbar-center">
        <el-input
          v-model="eventStore.searchQuery"
          placeholder="Search events by title, topic, or location..."
          clearable
          class="global-search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <!-- Right Action Items & Profile -->
      <div class="navbar-right">
        <!-- Quick Notification Bell with Interactive Read/Unread -->
        <el-popover placement="bottom-end" :width="320" trigger="click">
          <template #reference>
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge" type="danger">
              <button class="nav-icon-btn" title="Notifications">
                <el-icon><Bell /></el-icon>
              </button>
            </el-badge>
          </template>
          <div class="notification-panel">
            <div class="notification-header">
              <div class="notif-header-title">
                <h4>Notifications</h4>
                <el-tag v-if="unreadCount > 0" size="small" type="danger" round>{{ unreadCount }} New</el-tag>
              </div>
              <el-button 
                v-if="unreadCount > 0" 
                type="primary" 
                link 
                size="small" 
                @click="markAllAsRead"
              >
                Mark all read
              </el-button>
            </div>
            
            <ul v-if="notifications.length > 0" class="notification-list">
              <li 
                v-for="item in notifications" 
                :key="item.id" 
                :class="{ unread: !item.read }"
                @click="markAsRead(item.id)"
              >
                <div class="notif-item-header">
                  <div class="notif-item-title">
                    <span v-if="!item.read" class="unread-dot" />
                    <span>{{ item.title }}</span>
                  </div>
                  <span class="notif-time">{{ item.time }}</span>
                </div>
                <div class="notif-desc">{{ item.desc }}</div>
              </li>
            </ul>
            <div v-else class="empty-notif">
              <el-empty description="All caught up! No notifications." :image-size="60" />
            </div>
          </div>
        </el-popover>

        <!-- Role Badge -->
        <el-tag type="success" effect="plain" round class="role-tag">
          Student Portal
        </el-tag>

        <!-- User Profile Dropdown -->
        <el-dropdown trigger="click">
          <div class="profile-avatar-wrapper">
            <el-avatar v-if="authStore.currentUser?.avatar" :size="36" :src="authStore.currentUser.avatar" />
            <div v-else class="default-avatar-student">
              <el-icon><UserFilled /></el-icon>
            </div>
            <span class="user-name">{{ authStore.currentUser?.name || 'Campus User' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/profile')">
                <el-icon><User /></el-icon> My Profile
              </el-dropdown-item>
              <el-dropdown-item @click="eventStore.activeTab = 'registered'; router.push('/dashboard')">
                <el-icon><Ticket /></el-icon> My Registrations ({{ eventStore.userRegisteredCount }})
              </el-dropdown-item>
              <el-dropdown-item @click="eventStore.activeTab = 'saved'; router.push('/dashboard')">
                <el-icon><Star /></el-icon> Saved Events ({{ eventStore.userBookmarkedCount }})
              </el-dropdown-item>
              <el-dropdown-item divided style="color: #f56c6c;" @click="handleLogout">
                <el-icon><SwitchButton /></el-icon> Log Out
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- Layout Body: Sidebar + Main Content -->
    <div class="layout-body">
      <!-- Collapsible Sidebar -->
      <aside class="sidebar-wrapper" :class="{ collapsed: isSidebarCollapsed }">
        <el-menu
          :default-active="activeMenuIndex"
          class="sidebar-menu"
          :collapse="isSidebarCollapsed"
          :collapse-transition="false"
        >
          <!-- Main Section Header -->
          <div class="menu-section-label" v-if="!isSidebarCollapsed">DISCOVER</div>

          <el-menu-item index="all" @click="setTab('all')">
            <el-icon><Grid /></el-icon>
            <template #title>All Events</template>
          </el-menu-item>

          <el-menu-item index="registered" @click="setTab('registered')">
            <el-icon><Ticket /></el-icon>
            <template #title>
              <div class="menu-item-inner">
                <span>My Registrations</span>
                <el-tag 
                  v-if="eventStore.userRegisteredCount > 0" 
                  size="small" 
                  type="success" 
                  round 
                  class="menu-tag"
                >
                  {{ eventStore.userRegisteredCount }}
                </el-tag>
              </div>
            </template>
          </el-menu-item>

          <el-menu-item index="waitlisted" @click="setTab('waitlisted')">
            <el-icon><Clock /></el-icon>
            <template #title>
              <div class="menu-item-inner">
                <span>Waitlist Queue</span>
                <el-tag 
                  v-if="eventStore.userWaitlistedCount > 0" 
                  size="small" 
                  type="warning" 
                  round 
                  class="menu-tag"
                >
                  {{ eventStore.userWaitlistedCount }}
                </el-tag>
              </div>
            </template>
          </el-menu-item>

          <el-menu-item index="saved" @click="setTab('saved')">
            <el-icon><Star /></el-icon>
            <template #title>
              <div class="menu-item-inner">
                <span>Saved Events</span>
                <el-tag 
                  v-if="eventStore.userBookmarkedCount > 0" 
                  size="small" 
                  type="info" 
                  round 
                  class="menu-tag"
                >
                  {{ eventStore.userBookmarkedCount }}
                </el-tag>
              </div>
            </template>
          </el-menu-item>

          <!-- Categories Submenu -->
          <div class="menu-section-label" v-if="!isSidebarCollapsed" style="margin-top: 16px;">CATEGORIES</div>
          
          <el-sub-menu index="categories">
            <template #title>
              <el-icon><Filter /></el-icon>
              <span>Browse Category</span>
            </template>
            <el-menu-item 
              v-for="cat in categories" 
              :key="cat" 
              :index="`cat-${cat}`"
              @click="setCategory(cat)"
            >
              <span>{{ cat }}</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>

        <!-- Sidebar Bottom Quick Stats Widget -->
        <div v-if="!isSidebarCollapsed" class="sidebar-stats-widget">
          <div class="stats-title">Your Portal Quick Stats</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-num">{{ eventStore.userRegisteredCount }}</div>
              <div class="stat-lbl">Active Passes</div>
            </div>
            <div class="stat-box">
              <div class="stat-num">{{ eventStore.userWaitlistedCount }}</div>
              <div class="stat-lbl">Waitlist</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Outlet Area -->
      <main class="main-content-area">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEventStore } from '@/stores/eventStore'
import { useAuthStore } from '@/stores/authStore'
import type { CategoryType } from '@/types/event'
import {
  Calendar,
  Search,
  Bell,
  Expand,
  Fold,
  Grid,
  Ticket,
  Clock,
  Star,
  Filter,
  ArrowDown,
  User,
  UserFilled,
  Setting,
  SwitchButton,
} from '@element-plus/icons-vue'

const router = useRouter()
const eventStore = useEventStore()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
const isSidebarCollapsed = ref(false)

const categories: CategoryType[] = ['Academic', 'Club', 'Sports', 'Tech', 'Cultural', 'Career']

// Dynamic Notifications State
interface NotificationItem {
  id: string
  title: string
  desc: string
  time: string
  read: boolean
}

const notifications = ref<NotificationItem[]>([
  {
    id: 'n1',
    title: 'Registration Confirmed',
    desc: 'You are registered for Inter-Department Football Championship.',
    time: '10 mins ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'Waitlist Status Update',
    desc: 'You are #3 in queue for Photography Club Workshop.',
    time: '1 hour ago',
    read: false,
  },
])

const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length)

function markAsRead(id: string) {
  const notif = notifications.value.find((n) => n.id === id)
  if (notif) {
    notif.read = true
  }
}

function markAllAsRead() {
  notifications.value.forEach((n) => (n.read = true))
}

const activeMenuIndex = computed(() => {
  return eventStore.activeTab
})

function setTab(tab: 'all' | 'registered' | 'waitlisted' | 'saved') {
  eventStore.activeTab = tab
  if (router.currentRoute.value.path !== '/dashboard') {
    router.push('/dashboard')
  }
}

function setCategory(cat: CategoryType) {
  eventStore.selectedCategory = cat
  eventStore.activeTab = 'all'
  if (router.currentRoute.value.path !== '/dashboard') {
    router.push('/dashboard')
  }
}
</script>

<style scoped>
.student-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f6f8fa;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Top Navbar */
.top-navbar {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e5e9f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 220px;
}

.icon-toggle-btn {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: #606266;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.icon-toggle-btn:hover {
  background-color: #f0f2f5;
  color: #409eff;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.logo-icon-bg {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(135deg, #409eff, #3b82f6);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.3);
}

.brand-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.5px;
}

.brand-title .highlight {
  color: #409eff;
}

/* Search Bar */
.navbar-center {
  flex: 1;
  max-width: 480px;
  margin: 0 24px;
}

.global-search-input :deep(.el-input__wrapper) {
  border-radius: 20px;
  background-color: #f1f5f9;
  box-shadow: none !important;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.global-search-input :deep(.el-input__wrapper.is-focus) {
  background-color: #ffffff;
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15) !important;
}

/* Navbar Right */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 18px;
}

.notification-badge :deep(.el-badge__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #ffffff;
  padding: 0 5px;
  font-size: 0.72rem;
  font-weight: 700;
  height: 18px;
  min-width: 18px;
  line-height: 1;
  border-radius: 10px;
}

.nav-icon-btn {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #64748b;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.nav-icon-btn:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.role-tag {
  font-weight: 600;
}

.profile-avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  transition: background-color 0.2s ease;
}

.profile-avatar-wrapper:hover {
  background-color: #f1f5f9;
}

.default-avatar-student {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #3b82f6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #ffffff;
  flex-shrink: 0;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
}

/* Notifications Panel */
.notification-panel {
  padding: 4px;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f1f5f9;
}

.notif-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-header h4 {
  margin: 0;
  font-size: 0.95rem;
  color: #0f172a;
}

.notification-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.notification-list li {
  padding: 10px 12px;
  border-radius: 8px;
  background-color: #ffffff;
  border: 1px solid #f1f5f9;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-list li:hover {
  background-color: #f8fafc;
  border-color: #e2e8f0;
}

.notification-list li.unread {
  background-color: #eff6ff;
  border-color: #bfdbfe;
}

.notif-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.notif-item-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
}

.unread-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #3b82f6;
  display: inline-block;
  flex-shrink: 0;
}

.notif-time {
  font-size: 0.7rem;
  color: #94a3b8;
}

.notif-desc {
  font-size: 0.78rem;
  color: #475569;
  line-height: 1.4;
}

.empty-notif {
  padding: 12px 0;
}

/* Layout Body */
.layout-body {
  display: flex;
  flex: 1;
}

/* Collapsible Sidebar */
.sidebar-wrapper {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e5e9f0;
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-wrapper.collapsed {
  width: 64px;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  padding-top: 12px;
}

.menu-section-label {
  padding: 12px 20px 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.8px;
}

/* Align text and tag badge inside sidebar menu items */
.menu-item-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 4px;
}

.menu-tag {
  font-weight: 700;
  height: 20px;
  padding: 0 7px;
  line-height: 18px;
}

.sidebar-stats-widget {
  margin: 16px;
  padding: 14px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border-radius: 10px;
  border: 1px solid #bfdbfe;
}

.stats-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.stats-grid {
  display: flex;
  gap: 12px;
}

.stat-box {
  flex: 1;
  background: #ffffff;
  padding: 8px;
  border-radius: 6px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-num {
  font-size: 1.1rem;
  font-weight: 800;
  color: #2563eb;
}

.stat-lbl {
  font-size: 0.68rem;
  color: #64748b;
}

/* Main Content Area */
.main-content-area {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}
</style>
