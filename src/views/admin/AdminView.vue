<template>
  <div class="admin-container">
    <div class="header-section">
      <h2>Admin Console</h2>
      <p>Manage users, event approvals, and system-wide configurations.</p>
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
// Admin Console View Placeholder
</script>

<style scoped>
.admin-container {
  padding: 20px 0;
}

.header-section {
  margin-bottom: 24px;
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
