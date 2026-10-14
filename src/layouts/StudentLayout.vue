<template>
  <!-- StudentLayout is the shared shell for student pages.
   It contains the header, search bar and sidebar,
   while DashboardView provides the main event content through the slot. -->
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
          placeholder="Search events or ask AI (e.g. 'badminton', 'AI talks')..."
          clearable
          @clear="eventStore.clearAiSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
          <template #append>
            <el-button
              :loading="eventStore.isAiSearching"
              style="display: flex; align-items: center; gap: 4px;"
              @click="handleSearch"
            >
              <el-icon><MagicStick /></el-icon>
              <span>AI Search</span>
            </el-button>
          </template>
        </el-input>
      </div>

      <div style="display: flex; align-items: center; gap: 20px;">
        <el-popover
          placement="bottom-end"
          :width="340"
          trigger="click"
        >
          <template #reference>
            <button type="button" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; color:#555; padding: 4px;" aria-label="Notifications">
              <el-badge :value="notifications.length" :hidden="notifications.length === 0" :type="hasPromotion ? 'success' : 'primary'">
                <el-icon :size="22"><Bell /></el-icon>
              </el-badge>
            </button>
          </template>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 600;">Notifications</h4>
              <button
                v-if="notifications.length > 0"
                type="button"
                style="background: none; border: none; font-size: 12px; color: var(--el-color-primary); cursor: pointer; padding: 2px 6px;"
                @click="clearAllNotifications"
              >
                Clear all
              </button>
            </div>
            <div v-if="notifications.length === 0" style="text-align:center; color:#999; padding:20px 0; font-size: 14px;">
              No new notifications
            </div>
            <div v-else style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
              <div
                v-for="item in notifications"
                :key="item.id"
                :style="item.type === 'promotion'
                  ? 'padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; position: relative;'
                  : 'padding: 10px 12px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; position: relative;'"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; padding-right: 18px;">
                  <span
                    :style="item.type === 'promotion'
                      ? 'font-weight: 600; font-size: 13px; color: #16a34a;'
                      : 'font-weight: 600; font-size: 13px; color: #1e293b;'"
                  >
                    {{ item.title }}
                  </span>
                  <span style="font-size: 11px; color: #94a3b8;">{{ item.time }}</span>
                </div>

                <!-- 单条清除按钮 -->
                <button
                  type="button"
                  style="position: absolute; top: 8px; right: 8px; background: none; border: none; font-size: 14px; color: #94a3b8; cursor: pointer; line-height: 1; padding: 2px;"
                  aria-label="Dismiss notification"
                  @click.stop="dismissNotification(item.id)"
                >
                  &times;
                </button>

                <div style="font-size: 13px; color: #475569; line-height: 1.4;">{{ item.message }}</div>
              </div>
            </div>
          </div>
        </el-popover>

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
      </div>
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
  Bell,
  Calendar,
  CircleCheck,
  Clock,
  Grid,
  Search,
  Star,
  SwitchButton,
  Ticket,
  User,
  MagicStick,
} from '@element-plus/icons-vue'

import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'

type EventTab = 'all' | 'registered' | 'waitlisted' | 'saved' | 'completed'

interface StudentNotification {
  id: string
  title: string
  message: string
  time: string
  type?: 'promotion' | 'reminder' | 'waitlist'
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const eventStore = useEventStore()

async function handleSearch() {
  if (!eventStore.searchQuery.trim()) {
    eventStore.clearAiSearch()
    return
  }
  try {
    await eventStore.performAiSearch(eventStore.searchQuery)
  } catch (err: any) {
    ElMessage.error(err?.message || 'Search failed')
  }
}

const isSigningOut = ref(false)
const promotionRefreshKey = ref(0)

const hasPromotion = computed(() => {
  return notifications.value.some((n) => n.type === 'promotion')
})

function getDismissedNotificationIds(): string[] {
  promotionRefreshKey.value // reactive dependency
  const userId = authStore.currentUser?.id
  if (!userId) return []
  try {
    return JSON.parse(localStorage.getItem(`user_dismissed_notifs_${userId}`) || '[]')
  } catch {
    return []
  }
}

function dismissNotification(id: string) {
  const userId = authStore.currentUser?.id
  if (!userId) return

  // If it's a promotion, remove from promotions list as well
  try {
    const promoKey = `user_promotions_${userId}`
    const storedPromos = JSON.parse(localStorage.getItem(promoKey) || '[]')
    const nextPromos = storedPromos.filter((p: any) => p.id !== id)
    localStorage.setItem(promoKey, JSON.stringify(nextPromos))
  } catch {
    // ignore
  }

  // Add to dismissed IDs
  const dismissed = getDismissedNotificationIds()
  if (!dismissed.includes(id)) {
    dismissed.push(id)
    localStorage.setItem(`user_dismissed_notifs_${userId}`, JSON.stringify(dismissed))
  }

  promotionRefreshKey.value++
}

function clearAllNotifications() {
  const userId = authStore.currentUser?.id
  if (!userId) return

  // Clear promotions
  localStorage.removeItem(`user_promotions_${userId}`)

  // Mark all current notification IDs as dismissed
  const dismissed = getDismissedNotificationIds()
  notifications.value.forEach((n) => {
    if (!dismissed.includes(n.id)) {
      dismissed.push(n.id)
    }
  })
  localStorage.setItem(`user_dismissed_notifs_${userId}`, JSON.stringify(dismissed))

  promotionRefreshKey.value++
}

const notifications = computed<StudentNotification[]>(() => {
  promotionRefreshKey.value // reactive dependency
  const list: StudentNotification[] = []
  const userId = authStore.currentUser?.id
  const dismissedIds = new Set(getDismissedNotificationIds())

  // 1. Persistent waitlist promotions
  if (userId) {
    try {
      const storedPromos = JSON.parse(localStorage.getItem(`user_promotions_${userId}`) || '[]')
      storedPromos.forEach((p: any) => {
        if (!dismissedIds.has(p.id)) {
          list.push({
            id: p.id,
            title: p.title || '🎉 Spot Confirmed',
            message: p.message,
            time: p.time || 'Recently',
            type: 'promotion',
          })
        }
      })
    } catch {
      // ignore
    }
  }

  // 2. Upcoming reminders for registered events
  eventStore.events.filter(e => e.isRegistered && e.status !== 'COMPLETED').forEach(e => {
    const isPast = e.startsAt ? new Date(e.startsAt).getTime() < Date.now() : false;
    const isActive = e.status !== 'COMPLETED' && e.status !== 'CANCELLED' && e.status !== 'CLOSED';
    const notifId = `rem-${e.id}`

    if (!isPast && isActive && !dismissedIds.has(notifId)) {
      list.push({
        id: notifId,
        title: 'Upcoming Event Reminder',
        message: `"${e.title}" is happening on ${e.startTime} at ${e.location}. See you there!`,
        time: 'Scheduled',
        type: 'reminder',
      })
    }
  })

  // 3. Waitlist updates
  eventStore.events.filter(e => e.isWaitlisted).forEach(e => {
    const isPast = e.startsAt ? new Date(e.startsAt).getTime() < Date.now() : false;
    const isActive = e.status !== 'COMPLETED' && e.status !== 'CANCELLED' && e.status !== 'CLOSED';
    const notifId = `wl-${e.id}`

    if (!isPast && isActive && !dismissedIds.has(notifId)) {
      list.push({
        id: notifId,
        title: 'Waitlist Status',
        message: `You are on the waitlist for "${e.title}" (${e.startTime}). We'll notify you if a spot opens up.`,
        time: 'In Queue',
        type: 'waitlist',
      })
    }
  })

  return list.slice(0, 8)
})

const isDashboard = computed(
  () => route.path === '/dashboard',
)

const userInitial = computed(() => {
  return authStore.currentUser?.name?.trim().charAt(0).toUpperCase() || 'U'
})

// 五个入口统一放在数组里
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
  {
    key: 'completed' as const,
    label: 'Completed Events',
    icon: CircleCheck,
    count: eventStore.userCompletedCount,
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
