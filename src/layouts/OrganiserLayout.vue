<template>
  <div class="organiser-layout">
    <header class="organiser-header">
      <router-link to="/" class="brand" aria-label="CampusHub home">
        <span class="brand-icon"><el-icon><Calendar /></el-icon></span>
        <span>Campus<span class="brand-accent">Hub</span><small>ORGANISER</small></span>
      </router-link>
      <nav class="organiser-nav" aria-label="Organiser navigation">
        <router-link to="/organiser/dashboard">My Events</router-link>
        <router-link to="/create">Create Event</router-link>
      </nav>
      <div class="header-actions" style="display:flex; align-items:center; gap: 24px;">
        <!-- Notification Bell (Mocked) -->
        <el-dropdown trigger="click">
          <el-badge :is-dot="unreadCount > 0" class="notification-badge" style="cursor: pointer; display:flex; align-items:center;">
            <el-icon :size="22" color="#64748b"><BellFilled /></el-icon>
          </el-badge>
          <template #dropdown>
            <el-dropdown-menu style="width: 320px; padding: 8px;">
              <div style="font-weight:600; padding: 4px 12px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; color:#1e293b; display: flex; justify-content: space-between;">
                <span>Notifications</span>
                <span v-if="unreadCount > 0" style="font-size: 12px; color: #3b82f6; cursor: pointer;" @click="notificationStore.markAllAsRead()">Mark all as read</span>
              </div>
              <div v-if="notificationStore.notifications.length === 0" style="padding: 16px; text-align: center; color: #94a3b8; font-size: 14px;">
                No notifications yet.
              </div>
              <el-dropdown-item v-for="notif in notificationStore.notifications" :key="notif.id" @click="notificationStore.markAsRead(notif.id)" :style="{ opacity: notif.is_read ? 0.6 : 1 }">
                <div style="display: flex; flex-direction: column; gap: 4px; white-space: normal; line-height: 1.4;">
                  <strong style="color: #1e293b; font-size: 13px;">{{ notif.title }}</strong>
                  <span style="color: #64748b; font-size: 12px;">{{ notif.content }}</span>
                  <span style="color: #94a3b8; font-size: 11px;">{{ new Date(notif.created_at).toLocaleString() }}</span>
                </div>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-dropdown trigger="click">
          <button type="button" class="account-button">
            <el-icon><User /></el-icon>
            <span>{{ authStore.currentUser?.name || 'My account' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/profile')">My Profile</el-dropdown-item>
              <el-dropdown-item divided :disabled="signingOut" @click="logout">Sign Out</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>
    <main class="organiser-main"><slot /></main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, User, ArrowDown, BellFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const signingOut = ref(false)
const unreadCount = computed(() => notificationStore.notifications.filter(n => !n.is_read).length)

onMounted(() => {
  notificationStore.fetchNotifications()
})

async function logout() {
  if (signingOut.value) return
  signingOut.value = true
  try {
    await authStore.logout()
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to sign out.')
  } finally {
    signingOut.value = false
  }
}
</script>

<style scoped src="@/assets/styles/OrganiserLayout.css"></style>
