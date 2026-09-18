<template>
  <div class="student-layout">
    <!-- 顶部：品牌、搜索、账号 -->
    <header class="student-header">
      <router-link to="/" class="student-brand">
        <span class="student-brand-icon">
          <el-icon><Calendar /></el-icon>
        </span>

        <span class="student-brand-text">
          <strong>Campus<span>Hub</span></strong>
          <small>Connect. Explore. Meet.</small>
        </span>
      </router-link>

      <div v-if="isDashboard" class="student-search">
        <el-input
          v-model="eventStore.searchQuery"
          aria-label="Search campus events"
          placeholder="Search campus events..."
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>

      <el-dropdown trigger="click">
        <button type="button" class="student-account">
          <el-avatar
            :size="34"
            :src="authStore.currentUser?.avatar || undefined"
          >
            {{ userInitial }}
          </el-avatar>

          <span class="student-account-name">
            {{ authStore.currentUser?.name || 'My account' }}
          </span>

          <el-icon><ArrowDown /></el-icon>
        </button>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="router.push('/profile')">
              <el-icon><User /></el-icon>
              My Profile
            </el-dropdown-item>

            <el-dropdown-item
              divided
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

    <div class="student-body">
      <!-- 侧栏只负责切换活动列表 -->
      <aside class="student-sidebar">
        <p class="student-nav-label">MY CAMPUS</p>

        <nav class="student-navigation" aria-label="Student events">
          <button
            v-for="item in navigationItems"
            :key="item.key"
            type="button"
            class="student-nav-item"
            :class="{
              'is-active':
                isDashboard && eventStore.activeTab === item.key,
            }"
            :aria-current="
              isDashboard && eventStore.activeTab === item.key
                ? 'page'
                : undefined
            "
            @click="setTab(item.key)"
          >
            <el-icon>
              <component :is="item.icon" />
            </el-icon>

            <span class="student-nav-text">
              {{ item.label }}
            </span>

            <span
              v-if="item.count !== null"
              class="student-nav-count"
            >
              {{ item.count }}
            </span>
          </button>
        </nav>

        <router-link to="/" class="student-home-link">
          Back to homepage
        </router-link>
      </aside>

      <!-- Dashboard 或 Profile 的内容显示在这里 -->
      <div class="student-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  Calendar,
  Clock,
  Grid,
  Search,
  Star,
  SwitchButton,
  Ticket,
  User,
} from '@element-plus/icons-vue'

import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'

type EventTab = 'all' | 'registered' | 'waitlisted' | 'saved'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const eventStore = useEventStore()

const isSigningOut = ref(false)

const isDashboard = computed(
  () => route.path === '/dashboard',
)

const userInitial = computed(() => {
  return authStore.currentUser?.name?.trim().charAt(0).toUpperCase() || 'U'
})

// 四个入口统一放在数组里，避免重复写四套模板
const navigationItems = computed(() => [
  {
    key: 'all' as const,
    label: 'All Events',
    icon: Grid,
    count: null,
  },
  {
    key: 'registered' as const,
    label: 'My Registrations',
    icon: Ticket,
    count: eventStore.userRegisteredCount,
  },
  {
    key: 'waitlisted' as const,
    label: 'Waitlist',
    icon: Clock,
    count: eventStore.userWaitlistedCount,
  },
  {
    key: 'saved' as const,
    label: 'Saved Events',
    icon: Star,
    count: eventStore.userBookmarkedCount,
  },
])

function setTab(tab: EventTab) {
  // 切换列表时清除旧搜索和分类，避免把已报名活动过滤掉
  eventStore.searchQuery = ''
  eventStore.selectedCategory = 'All'
  eventStore.activeTab = tab

  if (!isDashboard.value) {
    void router.push('/dashboard')
  }
}

async function handleLogout() {
  if (isSigningOut.value) return

  isSigningOut.value = true

  try {
    await authStore.logout()
    await router.replace('/login')
  } catch (error) {
    ElMessage.error(
      error instanceof Error
        ? error.message
        : 'Unable to sign out.',
    )
  } finally {
    isSigningOut.value = false
  }
}
</script>

<style scoped src="../assets/styles/StudentLayout.css"></style>
