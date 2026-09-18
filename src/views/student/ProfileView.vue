<template>
  <component :is="profileLayout">
    <div class="profile-page">
      <header class="profile-heading">
        <h1>My Profile</h1>
        <p>Manage your basic account information.</p>
      </header>

      <section v-if="user" class="profile-panel">
        <!-- 账号信息：只读 -->
        <div class="profile-account">
          <el-avatar
            :size="64"
            :src="user.avatar || undefined"
            class="profile-avatar"
          >
            {{ userInitial }}
          </el-avatar>

          <div class="profile-identity">
            <h2>{{ user.name }}</h2>
            <p>{{ user.email }}</p>
            <span class="profile-role">{{ roleLabel }}</span>
          </div>
        </div>

        <dl
          v-if="user.role === 'STUDENT' && user.studentId"
          class="profile-student-id"
        >
          <dt>Student ID</dt>
          <dd>{{ user.studentId }}</dd>
        </dl>

        <!-- 可修改的信息 -->
        <el-form
          class="profile-form"
          label-position="top"
          :disabled="isSaving"
          @submit.prevent="saveProfile"
        >
          <el-form-item
            label="Full name"
            required
            :error="nameError"
          >
            <el-input
              v-model="profileForm.name"
              autocomplete="name"
              placeholder="Enter your full name"
              @input="nameError = ''"
            />
          </el-form-item>

          <div class="profile-fields-row">
            <el-form-item
              :label="user.role === 'STUDENT' ? 'Major' : 'Department'"
            >
              <el-input
                v-model="profileForm.major"
                placeholder="e.g. Computer Science"
              />
            </el-form-item>

            <el-form-item
              v-if="user.role === 'STUDENT'"
              label="Year of study"
            >
              <el-select
                v-model="profileForm.grade"
                placeholder="Select your year"
                clearable
              >
                <el-option
                  v-for="option in yearOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </div>

          <div class="profile-actions">
            <span class="profile-save-note" role="status">
              {{ hasChanges ? 'You have unsaved changes.' : '' }}
            </span>

            <div class="profile-buttons">
              <el-button
                native-type="button"
                :disabled="!hasChanges || isSaving"
                @click="resetForm"
              >
                Reset
              </el-button>

              <el-button
                native-type="submit"
                type="primary"
                class="profile-save-button"
                :loading="isSaving"
                :disabled="!hasChanges || isSaving"
              >
                Save Changes
              </el-button>
            </div>
          </div>
        </el-form>
      </section>

      <el-empty
        v-else
        description="Your profile is unavailable. Please sign in again."
      />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import StudentLayout from '@/layouts/StudentLayout.vue'
import OrganiserLayout from '@/layouts/OrganiserLayout.vue'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

const user = computed(() => authStore.currentUser)

const profileLayout = computed(() =>
  authStore.userRole === 'ORGANISER'
    ? OrganiserLayout
    : StudentLayout,
)

const userInitial = computed(
  () => user.value?.name?.trim().charAt(0).toUpperCase() || 'U',
)

const roleLabel = computed(() => {
  if (user.value?.role === 'ORGANISER') return 'Organiser'
  if (user.value?.role === 'ADMIN') return 'Administrator'
  return 'Student'
})

// 页面只管理这三个输入框
const profileForm = reactive({
  name: '',
  major: '',
  grade: '',
})

const isSaving = ref(false)
const nameError = ref('')

// value 沿用现有项目的数据格式，label 简化显示
const yearOptions = [
  { label: 'Year 1', value: 'Freshman (Year 1)' },
  { label: 'Year 2', value: 'Sophomore (Year 2)' },
  { label: 'Year 3', value: 'Junior (Year 3)' },
  { label: 'Year 4', value: 'Senior (Year 4)' },
  { label: 'Postgraduate', value: 'Postgraduate' },
]

const hasChanges = computed(() => {
  if (!user.value) return false

  return (
    profileForm.name.trim() !== user.value.name ||
    profileForm.major.trim() !== (user.value.major || '') ||
    (
      user.value.role === 'STUDENT' &&
      profileForm.grade !== (user.value.grade || '')
    )
  )
})

// 从已保存的资料恢复输入框
function resetForm() {
  profileForm.name = user.value?.name || ''
  profileForm.major = user.value?.major || ''
  profileForm.grade = user.value?.grade || ''
  nameError.value = ''
}

// 初次加载或切换账号时初始化表单
watch(
  () => user.value?.id,
  resetForm,
  { immediate: true },
)

async function saveProfile() {
  if (!user.value || isSaving.value) return

  const name = profileForm.name.trim()

  if (!name) {
    nameError.value = 'Please enter your name.'
    return
  }

  if (!hasChanges.value) return

  isSaving.value = true

  try {
    await authStore.updateProfile({
      name,
      major: profileForm.major.trim(),
      ...(user.value.role === 'STUDENT'
        ? { grade: profileForm.grade }
        : {}),
    })

    resetForm()
    ElMessage.success('Profile updated.')
  } catch (error) {
    ElMessage.error(
      error instanceof Error
        ? error.message
        : 'Unable to update your profile.',
    )
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped src="../../assets/styles/StudentProfile.css"></style>
