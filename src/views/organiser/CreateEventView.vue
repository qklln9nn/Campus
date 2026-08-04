<template>
  <div class="create-event-container">
    <div class="header-section">
      <h2>Create New Event</h2>
      <p>Organisers can fill out the form below to publish a new campus event.</p>
    </div>

    <el-card class="form-card">
      <el-form label-position="top">
        <el-form-item label="Event Title">
          <el-input placeholder="Enter the title of the event" />
        </el-form-item>

        <el-form-item label="Category">
          <el-select placeholder="Select category" style="width: 100%">
            <el-option label="Academic" value="academic" />
            <el-option label="Sports" value="sports" />
            <el-option label="Cultural" value="cultural" />
            <el-option label="Tech" value="tech" />
          </el-select>
        </el-form-item>

        <el-form-item label="Location">
          <el-input placeholder="Enter event location or online link" />
        </el-form-item>

        <el-form-item label="Description">
          <el-input type="textarea" :rows="4" placeholder="Describe the details of your event..." />
        </el-form-item>

        <el-form-item>
          <el-button type="primary">Publish Event</el-button>
          <el-button>Save as Draft</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// Organiser Create Event View Placeholder
</script>

<style scoped>
.create-event-container {
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

.form-card {
  max-width: 700px;
}
</style>
