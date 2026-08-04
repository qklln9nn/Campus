<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>Login</h2>
        </div>
      </template>
      <p class="login-subtitle">Welcome to Campus EventHub. Please sign in.</p>
      
      <el-form label-position="top">
        <el-form-item label="Email">
          <el-input placeholder="Enter your email" />
        </el-form-item>
        <el-form-item label="Password">
          <el-input type="password" placeholder="Enter your password" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="submit-btn">Sign In</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// Authentication Login View Placeholder
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #303133;
}

.login-subtitle {
  color: #606266;
  margin-bottom: 20px;
}

.submit-btn {
  width: 100%;
}
</style>
