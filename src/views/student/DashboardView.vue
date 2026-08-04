<template>
  <div class="dashboard-container">
    <div class="header-section">
      <h2>Student Dashboard & Events</h2>
      <p>Browse upcoming campus events and keep track of your registrations.</p>
    </div>

    <el-row :gutter="20" class="filter-section">
      <el-col :span="12">
        <el-input placeholder="Search events by title or location..." clearable />
      </el-col>
      <el-col :span="6">
        <el-select placeholder="All Categories" style="width: 100%">
          <el-option label="Academic" value="academic" />
          <el-option label="Sports" value="sports" />
          <el-option label="Cultural" value="cultural" />
          <el-option label="Tech" value="tech" />
        </el-select>
      </el-col>
    </el-row>

    <div class="events-placeholder">
      <el-empty description="No events loaded yet. Event list placeholder." />
    </div>
  </div>
</template>

<script setup lang="ts">
// Student Dashboard & Event List View Placeholder
</script>

<style scoped>
.dashboard-container {
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

.filter-section {
  margin-bottom: 24px;
}

.events-placeholder {
  margin-top: 40px;
  background: #ffffff;
  padding: 40px;
  border-radius: 8px;
}
</style>
