<template>
  <div class="admin-settings-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">System Configurations & Categories</h1>
        <p class="page-subtitle">Configure global event categories, approval workflows, and system rules.</p>
      </div>
      <el-button type="primary" size="large" @click="saveSettings">
        <el-icon><Check /></el-icon> Save Configurations
      </el-button>
    </div>

    <!-- Category Maintenance Section -->
    <div class="settings-panel">
      <div class="panel-title">
        <el-icon class="panel-icon"><Folder /></el-icon> Event Category Dictionary
      </div>
      <p class="panel-desc">Manage categories visible to students during event exploration and publishing.</p>

      <div class="category-tags-list">
        <el-tag
          v-for="cat in categories"
          :key="cat"
          closable
          size="large"
          effect="dark"
          class="cat-tag"
          @close="removeCategory(cat)"
        >
          {{ cat }}
        </el-tag>

        <el-input
          v-if="inputVisible"
          ref="InputRef"
          v-model="inputValue"
          class="new-cat-input"
          size="small"
          @keyup.enter="handleInputConfirm"
          @blur="handleInputConfirm"
        />
        <el-button v-else size="small" class="add-cat-btn" @click="showInput">
          + New Category
        </el-button>
      </div>
    </div>

    <!-- Workflow Rules Section -->
    <div class="settings-panel">
      <div class="panel-title">
        <el-icon class="panel-icon"><Operation /></el-icon> Workflow & Governance Rules
      </div>

      <div class="form-grid">
        <div class="form-item">
          <div class="item-label">
            <span>Require Manual Admin Approval for Events</span>
            <p>If disabled, newly created events will automatically be published without review.</p>
          </div>
          <el-switch v-model="settings.requireApproval" active-color="#ef4444" />
        </div>

        <el-divider />

        <div class="form-item">
          <div class="item-label">
            <span>Auto-Disable Reported Events Threshold</span>
            <p>Automatically suspend an event if it receives multiple violation reports.</p>
          </div>
          <el-input-number v-model="settings.reportThreshold" :min="1" :max="10" />
        </div>

        <el-divider />

        <div class="form-item">
          <div class="item-label">
            <span>Admin Alert Notification Email</span>
            <p>Receive immediate alerts when new event proposals or high-risk reports are filed.</p>
          </div>
          <el-input v-model="settings.adminEmail" style="width: 300px" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Folder, Operation } from '@element-plus/icons-vue'

const categories = ref(['Academic & Tech', 'Competition', 'Sports & Health', 'Culture & Arts', 'Career & Networking', 'Social'])
const inputVisible = ref(false)
const inputValue = ref('')
const InputRef = ref<HTMLInputElement>()

const settings = ref({
  requireApproval: true,
  reportThreshold: 3,
  adminEmail: 'admin-safety@campus.edu',
})

function removeCategory(cat: string) {
  categories.value = categories.value.filter((c) => c !== cat)
}

function showInput() {
  inputVisible.value = true
  nextTick(() => {
    InputRef.value?.focus()
  })
}

function handleInputConfirm() {
  if (inputValue.value) {
    categories.value.push(inputValue.value)
  }
  inputVisible.value = false
  inputValue.value = ''
}

function saveSettings() {
  ElMessage.success('System configuration and category dictionary saved successfully!')
}
</script>

<style scoped>
.admin-settings-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 6px;
}

.page-subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
}

.settings-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.panel-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.panel-icon {
  color: #ef4444;
}

.panel-desc {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0 0 16px;
}

.category-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.cat-tag {
  font-weight: 600;
}

.new-cat-input {
  width: 140px;
}

.form-grid {
  display: flex;
  flex-direction: column;
}

.form-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.item-label span {
  font-weight: 700;
  color: #0f172a;
  font-size: 0.95rem;
}

.item-label p {
  font-size: 0.82rem;
  color: #64748b;
  margin: 4px 0 0;
}
</style>
