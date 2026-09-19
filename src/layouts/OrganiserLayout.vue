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
    </header>
    <main class="organiser-main"><slot /></main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, User, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const signingOut = ref(false)

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
