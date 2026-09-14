<template>
  <div class="admin-settings-view">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">System Configurations & Categories</h1>
        <p class="page-subtitle">Configure global event categories, approval workflows, and system rules.</p>
      </div>
      <el-button type="primary" size="large" :loading="saving || loadingSettings" @click="saveSettings">
        <el-icon><Check /></el-icon> Save Configurations
      </el-button>
    </div>

    <el-alert v-if="pageError" :title="pageError" type="error" show-icon :closable="false" />

    <!-- Category Maintenance Section -->
    <div class="settings-panel">
      <div class="panel-title">
        <el-icon class="panel-icon"><Folder /></el-icon> Event Category Dictionary
      </div>
      <p class="panel-desc">Manage categories visible to students during event exploration and publishing.</p>

      <div v-loading="categoryLoading" class="category-tags-list">
        <el-tag
          v-for="cat in activeCategories"
          :key="cat.slug"
          closable
          size="large"
          effect="dark"
          class="cat-tag"
          @close="removeCategory(cat.slug, cat.name)"
        >
          {{ cat.name }}
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

      <div v-if="inactiveCategories.length" class="inactive-categories">
        <span>Inactive:</span>
        <el-button
          v-for="cat in inactiveCategories"
          :key="cat.slug"
          link
          type="primary"
          @click="restoreCategory(cat.slug, cat.name)"
        >Restore {{ cat.name }}</el-button>
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
            <p>Enforced by database policy. Organiser submissions remain private until an administrator approves them.</p>
          </div>
          <el-switch v-model="formSettings.requireApproval" active-color="#ef4444" disabled />
        </div>

        <el-divider />

        <div class="form-item">
          <div class="item-label">
            <span>High-Risk Report Escalation Threshold</span>
            <p>Store the number of reports used by moderators to identify high-priority cases.</p>
          </div>
          <el-input-number v-model="formSettings.reportThreshold" :min="1" :max="10" />
        </div>

        <el-divider />

        <div class="form-item">
          <div class="item-label">
            <span>Admin Alert Notification Email</span>
            <p>Store the moderation contact address used by administrator alert integrations.</p>
          </div>
          <el-input v-model="formSettings.adminEmail" type="email" style="width: 300px" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Check, Folder, Operation } from '@element-plus/icons-vue'
import { useAdminStore } from '@/stores/adminStore'
import { useCategoryStore } from '@/stores/categoryStore'

const adminStore = useAdminStore()
const categoryStore = useCategoryStore()
const { settings, loadingSettings, errorMessage } = storeToRefs(adminStore)
const { activeCategories, inactiveCategories, loading: categoryLoading, error: categoryError } = storeToRefs(categoryStore)
const inputVisible = ref(false)
const inputValue = ref('')
const InputRef = ref<HTMLInputElement>()
const saving = ref(false)
const pageError = ref('')

const formSettings = reactive({
  requireApproval: true,
  reportThreshold: 3,
  adminEmail: '',
})

async function removeCategory(slug: string, name: string) {
  try {
    await categoryStore.setCategory(name, false, slug)
    ElMessage.success(`Category "${name}" disabled.`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to disable the category.')
  }
}

async function restoreCategory(slug: string, name: string) {
  try {
    await categoryStore.setCategory(name, true, slug)
    ElMessage.success(`Category "${name}" restored.`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to restore the category.')
  }
}

function showInput() {
  inputVisible.value = true
  nextTick(() => {
    InputRef.value?.focus()
  })
}

async function handleInputConfirm() {
  const name = inputValue.value.trim()
  inputVisible.value = false
  inputValue.value = ''
  if (!name) return
  try {
    await categoryStore.setCategory(name, true)
    ElMessage.success(`Category "${name}" saved.`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to save the category.')
  }
}

async function saveSettings() {
  saving.value = true
  try {
    await adminStore.saveSettings(formSettings.reportThreshold, formSettings.adminEmail)
    ElMessage.success('System configuration saved successfully!')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to save system settings.')
  } finally {
    saving.value = false
  }
}

async function loadSettingsPage() {
  pageError.value = ''
  const results = await Promise.allSettled([
    adminStore.fetchSettings(),
    categoryStore.fetchCategories(true),
  ])
  if (settings.value) Object.assign(formSettings, settings.value)
  if (results.some((result) => result.status === 'rejected')) {
    pageError.value = errorMessage.value || categoryError.value || 'Unable to load all system settings.'
  }
}

onMounted(loadSettingsPage)
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

.inactive-categories {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  color: #64748b;
  font-size: 0.8rem;
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
