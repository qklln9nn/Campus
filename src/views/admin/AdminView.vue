<template>
  <div class="admin-container">
    <div class="header-section">
      <div>
        <h2>Admin Console</h2>
        <p>Manage users, event approvals, and system-wide configurations.</p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/')">Home</el-button>
        <el-button type="danger" plain @click="handleLogout">Sign out</el-button>
      </div>
    </div>

    <el-row :gutter="20" class="stat-cards">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-title">Total Users</div>
          <div class="stat-value">1,248</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-title">Pending Events</div>
          <div class="stat-value">12</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-title">Active Events</div>
          <div class="stat-value">45</div>
        </el-card>
      </el-col>
    </el-row>

    <div class="admin-placeholder">
      <el-alert
        title="Admin Management Console Placeholder"
        type="info"
        description="Event approvals and user management tables will be implemented here."
        show-icon
        :closable="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  try {
    await authStore.logout()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to sign out.')
  } finally {
    await router.replace('/login')
  }
}
</script>

<style scoped>
.admin-container {
  padding: 20px 0;
}

.header-section {
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-section h2 {
  font-size: 1.8rem;
  margin-bottom: 8px;
  color: #303133;
}

.header-section p {
  color: #606266;
}

.stat-cards {
  margin-bottom: 24px;
}

.stat-title {
  font-size: 0.9rem;
  color: #909399;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #303133;
  margin-top: 8px;
}

.admin-placeholder {
  margin-top: 20px;
}
</style>
