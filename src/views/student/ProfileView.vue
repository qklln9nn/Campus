<template>
  <component :is="profileLayout">
    <div class="profile-page">
      <header class="profile-heading">
        <h1>My Profile</h1>
        <p>Manage your basic account information.</p>
      </header>

      <section v-if="user" class="profile-panel">
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

          <el-form-item label="Interests">
            <el-select
              v-model="profileForm.interests"
              multiple
              filterable
              allow-create
              placeholder="e.g. Technology, Music, Sports"
              style="width: 100%"
            >
              <el-option label="Technology" value="Technology" />
              <el-option label="Music" value="Music" />
              <el-option label="Sports" value="Sports" />
              <el-option label="Arts & Design" value="Arts & Design" />
              <el-option label="Business" value="Business" />
              <el-option label="Science" value="Science" />
              <el-option label="Photography" value="Photography" />
            </el-select>
          </el-form-item>

          <el-form-item label="Clubs & Societies">
            <el-select
              v-model="profileForm.clubs"
              multiple
              filterable
              allow-create
              placeholder="e.g. Computer Science Club, Drama Society"
              style="width: 100%"
            >
              <el-option label="Computer Science Club" value="Computer Science Club" />
              <el-option label="Drama Society" value="Drama Society" />
              <el-option label="Engineering Society" value="Engineering Society" />
              <el-option label="Debate Club" value="Debate Club" />
              <el-option label="Film Club" value="Film Club" />
              <el-option label="Music Society" value="Music Society" />
            </el-select>
          </el-form-item>

          <el-form-item label="Availability">
            <el-select
              v-model="profileForm.availableTime"
              multiple
              placeholder="Select your free time"
              style="width: 100%"
            >
              <el-option label="Weekdays Morning" value="Weekdays Morning" />
              <el-option label="Weekdays Afternoon" value="Weekdays Afternoon" />
              <el-option label="Weekdays Evening" value="Weekdays Evening" />
              <el-option label="Weekends" value="Weekends" />
            </el-select>
          </el-form-item>

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

//this computed property is used to determine the layout of the profile page
//if the user role is 'ORGANISER', it will display the organiser layout
//otherwise, it will display the student layout
//如果是org，就会用organiser的layout，否则就是student的layout
const profileLayout = computed(() =>
  authStore.userRole === 'ORGANISER'
    ? OrganiserLayout
    : StudentLayout,
)

//it is used to display the user initial
const userInitial = computed(
  () => user.value?.name?.trim().charAt(0).toUpperCase() || 'U',
)

//it is used to display the user role
const roleLabel = computed(() => {
  if (user.value?.role === 'ORGANISER') return 'Organiser'
  if (user.value?.role === 'ADMIN') return 'Administrator'
  return 'Student'
})

const profileForm = reactive({
  name: '',
  major: '',
  grade: '',
  interests: [] as string[],
  clubs: [] as string[],
  availableTime: [] as string[],
  notificationPreferences: {
    emailAlerts: true,
    pushNotifications: true,
    eventReminders: true,
    waitlistUpdates: true,
    weeklyDigest: false,
  }
})

const isSaving = ref(false)
const nameError = ref('')

//it is used to store the year options,
//the value is used to store in the backend,
//the label is used to display in the frontend
const yearOptions = [
  { label: 'Year 1', value: 'Freshman (Year 1)' },
  { label: 'Year 2', value: 'Sophomore (Year 2)' },
  { label: 'Year 3', value: 'Junior (Year 3)' },
  { label: 'Year 4', value: 'Senior (Year 4)' },
  { label: 'Postgraduate', value: 'Postgraduate' },
]

//it is used to check if the user has made any changes to the profile
//if the user has made any changes to the profile, the save changes button will be enabled
//if the user has not made any changes to the profile, the save changes button will be disabled
const hasChanges = computed(() => {
  if (!user.value) return false

  return (
    profileForm.name.trim() !== user.value.name ||
    profileForm.major.trim() !== (user.value.major || '') ||
    (user.value.role === 'STUDENT' && profileForm.grade !== (user.value.grade || '')) ||
    JSON.stringify(profileForm.interests) !== JSON.stringify(user.value.interests) ||
    JSON.stringify(profileForm.clubs) !== JSON.stringify(user.value.clubs) ||
    JSON.stringify(profileForm.availableTime) !== JSON.stringify(user.value.availableTime) ||
    JSON.stringify(profileForm.notificationPreferences) !== JSON.stringify(user.value.notificationPreferences)
  )
})

// 把输入框里的字全部恢复成数据库里原本保存的值
function resetForm() {
  profileForm.name = user.value?.name || ''
  profileForm.major = user.value?.major || ''
  profileForm.grade = user.value?.grade || ''
  profileForm.interests = [...(user.value?.interests || [])]
  profileForm.clubs = [...(user.value?.clubs || [])]
  profileForm.availableTime = [...(user.value?.availableTime || [])]
  profileForm.notificationPreferences = {
    emailAlerts: user.value?.notificationPreferences?.emailAlerts ?? true,
    pushNotifications: user.value?.notificationPreferences?.pushNotifications ?? true,
    eventReminders: user.value?.notificationPreferences?.eventReminders ?? true,
    waitlistUpdates: user.value?.notificationPreferences?.waitlistUpdates ?? true,
    weeklyDigest: user.value?.notificationPreferences?.weeklyDigest ?? false,
  }
  nameError.value = ''
}


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

  //this function is used to update the user profile, the data is stored in the backend
  //and authStore call the backend to update the user profile
  //the backend will return the updated user profile, which will be stored in the authStore
  //then the user profile will be updated in the frontend
  try {
    await authStore.updateProfile({
      name,
      major: profileForm.major.trim(),
      ...(user.value.role === 'STUDENT'
        ? { grade: profileForm.grade }
        : {}),
      interests: profileForm.interests,
      clubs: profileForm.clubs,
      availableTime: profileForm.availableTime,
      notificationPreferences: profileForm.notificationPreferences,
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
