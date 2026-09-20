<template>
  <div class="admin-layout">
    <!-- Header: Brand, Search, Account -->
    <header class="admin-header">
      <router-link to="/admin/dashboard" class="admin-brand">
        <span class="admin-brand-icon">
          <el-icon><Management /></el-icon>
        </span>
        <span class="admin-brand-text">
          <strong>Campus<span>Hub</span></strong>
          <small>System Admin Console</small>
        </span>
      </router-link>


      <el-dropdown trigger="click">
        <button type="button" class="admin-account">
          <el-avatar
            :size="34"
            :src="authStore.currentUser?.avatar || undefined"
          >
            {{ userInitial }}
          </el-avatar>

          <span class="admin-account-name">
            {{ authStore.currentUser?.name || 'Chief Admin' }}
          </span>

          <el-icon><ArrowDown /></el-icon>
        </button>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              :disabled="isSigningOut"
              @click="handleLogout"
            >
              <el-icon><SwitchButton /></el-icon>
              {{ isSigningOut ? 'Signing out...' : 'Sign Out' }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>

    <div class="admin-body">
      <!-- Sidebar -->
      <aside class="admin-sidebar">
        <p class="admin-nav-label">ADMINISTRATION</p>
        <nav class="admin-navigation" aria-label="Admin modules">
          <router-link
            to="/admin/dashboard"
            class="admin-nav-item"
            exact-active-class="is-active"
          >
            <el-icon><Tickets /></el-icon>
            <span class="admin-nav-text">Event Management</span>
            <span v-if="pendingEventCount > 0" class="admin-nav-count">{{ pendingEventCount }}</span>
          </router-link>

          <router-link
            to="/admin/reports"
            class="admin-nav-item"
            exact-active-class="is-active"
          >
            <el-icon><Warning /></el-icon>
            <span class="admin-nav-text">Violation Reports</span>
            <span v-if="pendingReportCount > 0" class="admin-nav-count">{{ pendingReportCount }}</span>
          </router-link>

          <router-link
            to="/admin/users"
            class="admin-nav-item"
            exact-active-class="is-active"
          >
            <el-icon><UserFilled /></el-icon>
            <span class="admin-nav-text">User Control</span>
          </router-link>

          <router-link
            to="/admin/settings"
            class="admin-nav-item"
            exact-active-class="is-active"
          >
            <el-icon><Tools /></el-icon>
            <span class="admin-nav-text">System Configurations</span>
          </router-link>
        </nav>

        <router-link to="/" class="admin-home-link">
          Return to Main Portal
        </router-link>
      </aside>

      <!-- Main Content -->
      <div class="admin-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useAdminStore } from '@/stores/adminStore'
import { useModerationStore } from '@/stores/moderationStore'
import {
  Management,
  ArrowDown,
  UserFilled,
  SwitchButton,
  DataAnalysis,
  Tickets,
  Warning,
  Tools
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const adminStore = useAdminStore()
const moderationStore = useModerationStore()

const { pendingEventCount, pendingReportCount } = storeToRefs(moderationStore)
const isSigningOut = ref(false)

const userInitial = computed(() => {
  return authStore.currentUser?.name?.trim().charAt(0).toUpperCase() || 'A'
})

async function handleLogout() {
  if (isSigningOut.value) return
  isSigningOut.value = true

  try {
    await authStore.logout()
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to sign out.')
  } finally {
    isSigningOut.value = false
  }
}

onMounted(() => {
  void Promise.allSettled([
    moderationStore.fetchEvents(),
    moderationStore.fetchReports(),
    adminStore.checkSystemHealth(),
  ])
})
</script>

<style scoped src="../assets/styles/AdminLayout.css"></style>
