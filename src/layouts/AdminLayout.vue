<template>
  <div class="admin-layout">
    <!-- Top Navbar -->
    <header class="top-navbar">
      <div class="navbar-left">
        <!-- Sidebar Collapse Toggle Button -->
        <button class="icon-toggle-btn" @click="isSidebarCollapsed = !isSidebarCollapsed" title="Toggle Sidebar">
          <el-icon><Expand v-if="isSidebarCollapsed" /><Fold v-else /></el-icon>
        </button>

        <!-- Brand Logo -->
        <router-link to="/admin/dashboard" class="brand-logo">
          <div class="logo-icon-bg">
            <el-icon><Management /></el-icon>
          </div>
          <span class="brand-title">Campus <span class="highlight">EventHub</span></span>
        </router-link>

        <!-- Admin Portal Tag -->
        <el-tag type="danger" effect="dark" round class="portal-tag">
          <el-icon class="tag-icon"><Setting /></el-icon> System Admin Console
        </el-tag>
      </div>

      <!-- Right Actions -->
      <div class="navbar-right">
        <!-- Return to Main Site Link -->
        <router-link to="/" class="portal-home-link" title="Return to Main Campus Portal">
          <el-icon><HomeFilled /></el-icon>
          <span class="link-text">Main Portal</span>
        </router-link>

        <!-- System Alerts / Pending Count Badge -->
        <el-dropdown trigger="click">
          <div class="notification-badge" title="Pending Notifications">
            <el-badge :value="14" class="item" type="danger">
              <el-icon class="bell-icon"><Bell /></el-icon>
            </el-badge>
          </div>
          <template #dropdown>
            <el-dropdown-menu class="notification-dropdown">
              <div class="dropdown-header">System Alerts</div>
              <el-dropdown-item @click="router.push('/admin/events')">
                <el-icon color="#e6a23c"><WarningFilled /></el-icon>
                <span>12 Event approvals pending</span>
              </el-dropdown-item>
              <el-dropdown-item @click="router.push('/admin/reports')">
                <el-icon color="#f56c6c"><CircleCloseFilled /></el-icon>
                <span>2 Violation reports received</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- Admin Profile & Logout Dropdown -->
        <el-dropdown trigger="click">
          <div class="profile-avatar-wrapper">
            <el-avatar v-if="authStore.currentUser?.avatar" :size="34" :src="authStore.currentUser.avatar" />
            <div v-else class="default-avatar">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="user-meta">
              <span class="user-name">{{ authStore.currentUser?.name || 'Chief Admin' }}</span>
            </div>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/admin/settings')">
                <el-icon><Operation /></el-icon> System Configurations
              </el-dropdown-item>
              <el-dropdown-item divided style="color: #ef4444;" @click="handleLogout">
                <el-icon><SwitchButton /></el-icon> Log Out
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- Layout Body: Sidebar + Content -->
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
          <div class="menu-section-label" v-if="!isSidebarCollapsed">CORE MANAGEMENT</div>

          <el-menu-item index="/admin/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>Dashboard Overview</template>
          </el-menu-item>

          <el-menu-item index="/admin/events">
            <el-icon><Tickets /></el-icon>
            <template #title>Event Approvals</template>
          </el-menu-item>

          <el-menu-item index="/admin/users">
            <el-icon><UserFilled /></el-icon>
            <template #title>User & Role Control</template>
          </el-menu-item>

          <div class="menu-section-label" v-if="!isSidebarCollapsed">GOVERNANCE & CONFIG</div>

          <el-menu-item index="/admin/reports">
            <el-icon><Warning /></el-icon>
            <template #title>Violation Reports</template>
          </el-menu-item>

          <el-menu-item index="/admin/settings">
            <el-icon><Tools /></el-icon>
            <template #title>System Configurations</template>
          </el-menu-item>
        </el-menu>

        <!-- Sidebar Status Footer Widget -->
        <div v-if="!isSidebarCollapsed" class="sidebar-footer-widget">
          <div class="widget-title">SYSTEM HEALTH</div>
          <div class="widget-status">
            <span class="status-dot green" /> All Systems Operational
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
  Management,
  Expand,
  Fold,
  HomeFilled,
  Bell,
  Setting,
  User,
  UserFilled,
  ArrowDown,
  SwitchButton,
  DataAnalysis,
  Tickets,
  Warning,
  WarningFilled,
  CircleCloseFilled,
  Tools,
  Operation,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isSidebarCollapsed = ref(false)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

const activeMenuIndex = computed(() => {
  // Handle root /admin redirection highlight
  if (route.path === '/admin') return '/admin/dashboard'
  return route.path
})
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  color: #0f172a;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* Top Navbar */
.top-navbar {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
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
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.icon-toggle-btn:hover {
  background-color: #f1f5f9;
  color: #0f172a;
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
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.brand-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.5px;
}

.brand-title .highlight {
  color: #ef4444;
}

.portal-tag {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Navbar Right */
.navbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.client-link-btn {
  border-radius: 8px;
  font-weight: 600;
}

.notification-badge {
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.notification-badge:hover {
  background-color: #f1f5f9;
}

.bell-icon {
  font-size: 1.25rem;
  color: #64748b;
}

.notification-dropdown {
  width: 280px;
}

.dropdown-header {
  padding: 10px 16px;
  font-weight: 700;
  font-size: 0.85rem;
  border-bottom: 1px solid #e2e8f0;
  color: #475569;
}

.profile-avatar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 20px;
  transition: background-color 0.2s ease;
  background-color: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.profile-avatar-wrapper:hover {
  background-color: #e2e8f0;
}

.default-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #ffffff;
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
  color: #0f172a;
}

.user-role {
  font-size: 0.68rem;
  color: #ef4444;
  font-weight: 600;
}

/* Layout Body */
.layout-body {
  display: flex;
  flex: 1;
}

.portal-home-link {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.portal-home-link:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

/* Collapsible Sidebar */
.sidebar-wrapper {
  width: 250px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.2, 0, 0, 1);
  overflow: hidden;
  flex-shrink: 0;
  user-select: none;
}

.sidebar-wrapper.collapsed {
  width: 64px;
}

.sidebar-menu {
  background: transparent;
  border-right: none;
  flex: 1;
  padding-top: 12px;
}

:deep(.el-menu) {
  background-color: transparent !important;
  border-right: none !important;
}

:deep(.el-menu-item) {
  color: #64748b !important;
  height: 48px;
  line-height: 48px;
  margin: 4px 12px;
  border-radius: 8px;
  font-weight: 600;
  transition: background-color 0.2s ease, color 0.2s ease;
}

:deep(.el-menu-item:hover) {
  background-color: #f1f5f9 !important;
  color: #0f172a !important;
}

:deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #ef4444, #dc2626) !important;
  color: #ffffff !important;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
}

/* Collapsed Element Plus Overrides to prevent squishing */
:deep(.el-menu--collapse) {
  width: 64px !important;
}

:deep(.el-menu--collapse .el-menu-item) {
  margin: 4px 8px !important;
  padding: 0 !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

:deep(.el-menu--collapse .el-menu-item .el-icon) {
  margin: 0 !important;
  font-size: 1.2rem !important;
}

.menu-section-label {
  padding: 16px 20px 6px;
  font-size: 0.68rem;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 1px;
}

.sidebar-footer-widget {
  margin: 16px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.widget-title {
  font-size: 0.65rem;
  font-weight: 800;
  color: #94a3b8;
  margin-bottom: 6px;
  letter-spacing: 0.8px;
}

.widget-status {
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.green {
  background-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

/* Main Content Area */
.main-content-area {
  flex: 1;
  padding: 28px 36px;
  background-color: #f8fafc;
  overflow-y: auto;
  min-height: calc(100vh - 64px);
}
</style>
