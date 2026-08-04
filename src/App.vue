<template>
  <div class="app-layout">
    <!-- Main Navigation Header -->
    <el-header class="app-header">
      <div class="header-inner">
        <!-- Logo and Brand Title -->
        <div class="logo">
          <router-link to="/" class="logo-link">
            <el-icon class="logo-icon"><Calendar /></el-icon>
            <span class="logo-text">Campus EventHub</span>
          </router-link>
        </div>

        <!-- Navigation Menu for Switching Views -->
        <el-menu
          :default-active="activeRoute"
          mode="horizontal"
          :router="true"
          class="nav-menu"
          :ellipsis="false"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataBoard /></el-icon>
            <span>Dashboard</span>
          </el-menu-item>
          <el-menu-item index="/create">
            <el-icon><Plus /></el-icon>
            <span>Create Event</span>
          </el-menu-item>
          <el-menu-item index="/admin">
            <el-icon><Setting /></el-icon>
            <span>Admin</span>
          </el-menu-item>
          <el-menu-item index="/login">
            <el-icon><User /></el-icon>
            <span>Login</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>

    <!-- Main View Outlet -->
    <el-main class="app-main">
      <div class="main-container">
        <router-view />
      </div>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Calendar, DataBoard, Plus, Setting, User } from '@element-plus/icons-vue'

// Synchronize current route path with the active navigation menu item
const route = useRoute()
const activeRoute = computed(() => route.path)
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.app-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 24px;
  height: 60px;
  width: 100%;
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  width: 100%;
}

.logo {
  flex-shrink: 0;
  margin-right: 32px;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #409eff;
  font-weight: bold;
  font-size: 1.25rem;
  white-space: nowrap;
}

.logo-icon {
  font-size: 1.5rem;
}

.nav-menu {
  border-bottom: none;
  background: transparent;
  flex: 1;
  justify-content: flex-end;
}

.app-main {
  flex: 1;
  padding: 24px;
  width: 100%;
}

.main-container {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>
