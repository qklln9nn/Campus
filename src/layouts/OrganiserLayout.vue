<template>
  <div class="organiser-layout">
    <!-- Top Navbar -->
    <header class="top-navbar">
      <div class="navbar-left">
        <!-- Sidebar Collapse Toggle Button -->
        <button class="icon-toggle-btn" @click="isSidebarCollapsed = !isSidebarCollapsed">
          <el-icon><Expand v-if="isSidebarCollapsed" /><Fold v-else /></el-icon>
        </button>

        <!-- Brand Logo -->
        <router-link to="/organiser/dashboard" class="brand-logo">
          <div class="logo-icon-bg">
            <el-icon><Calendar /></el-icon>
          </div>
          <span class="brand-title">Campus <span class="highlight">EventHub</span></span>
        </router-link>

        <!-- Organiser Portal Tag -->
        <el-tag type="warning" effect="dark" round class="portal-tag">
          Organiser Console
        </el-tag>
      </div>

      <!-- Right Actions: Create Event, User Profile -->
      <div class="navbar-right">
        <!-- Quick Create Event Button -->
        <router-link to="/create">
          <el-button type="primary" size="default" class="create-btn">
            <el-icon><Plus /></el-icon> Publish New Event
          </el-button>
        </router-link>

        <!-- Organiser User Profile -->
        <el-dropdown trigger="click">
          <div class="profile-avatar-wrapper">
            <div class="default-avatar">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="user-meta">
              <span class="user-name">{{ authStore.currentUser?.name || 'Dr. Sarah Jenkins' }}</span>
              <span class="user-role">Host & Administrator</span>
            </div>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/profile')">
                <el-icon><User /></el-icon> Profile & Account
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
          router
        >
          <div class="menu-section-label" v-if="!isSidebarCollapsed">MANAGEMENT</div>

          <el-menu-item index="/organiser/dashboard">
            <el-icon><DataBoard /></el-icon>
            <template #title>Organiser Dashboard</template>
          </el-menu-item>

          <el-menu-item index="/create">
            <el-icon><Plus /></el-icon>
            <template #title>Create New Event</template>
          </el-menu-item>
        </el-menu>

        <!-- Sidebar Footer Info -->
        <div v-if="!isSidebarCollapsed" class="sidebar-footer-widget">
          <div class="widget-title">Active Host Status</div>
          <div class="widget-badge">
            <span class="status-dot" /> School of CS & Eng
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
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import {
  Calendar,
  Expand,
  Fold,
  Plus,
  DataBoard,
  ArrowDown,
  User,
  UserFilled,
  SwitchButton,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

const isSidebarCollapsed = ref(false)

const activeMenuIndex = computed(() => route.path)
</script>

<style scoped>
.organiser-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Top Navbar */
.top-navbar {
  height: 64px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-toggle-btn {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.icon-toggle-btn:hover {
  background-color: #1e293b;
  color: #ffffff;
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
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
}

.brand-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.brand-title .highlight {
  color: #a78bfa;
}

.portal-tag {
  font-weight: 700;
  margin-left: 4px;
}

/* Navbar Right */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.create-btn {
  font-weight: 700;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
}

.create-btn:hover {
  background: linear-gradient(135deg, #4f46e5, #4338ca);
}

.profile-avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 20px;
  transition: background-color 0.2s ease;
  color: #ffffff;
}

.profile-avatar-wrapper:hover {
  background-color: #1e293b;
}

.default-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #e2e8f0;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #f8fafc;
}

.user-role {
  font-size: 0.68rem;
  color: #94a3b8;
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
  border-right: 1px solid #e2e8f0;
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

.sidebar-footer-widget {
  margin: 16px;
  padding: 12px;
  background: #f1f5f9;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.widget-title {
  font-size: 0.7rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.widget-badge {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
}

/* Main Content Area */
.main-content-area {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
}
</style>
