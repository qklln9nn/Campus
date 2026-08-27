<template>
  <component :is="profileLayout">
    <div class="profile-page">
    <div class="profile-header-banner">
      <div class="banner-overlay"></div>
      <div class="banner-content">
        <div class="user-avatar-section">
          <el-avatar :size="96" :src="profileForm.avatar" class="profile-avatar">
            <el-icon :size="48"><UserFilled /></el-icon>
          </el-avatar>
          <button class="change-avatar-btn" title="Change Avatar" @click="showAvatarPicker = true">
            <el-icon><Camera /></el-icon>
          </button>
        </div>

        <div class="user-identity">
          <div class="name-row">
            <h2>{{ profileForm.name }}</h2>
            <el-tag type="success" effect="dark" round class="role-badge">
              {{ profileForm.role === 'STUDENT' ? 'Student' : profileForm.role }}
            </el-tag>
          </div>
          <p class="user-subtext">
            <span class="user-id">ID: {{ profileForm.studentId || 'Not assigned' }}</span> •
            <span class="user-email">{{ profileForm.email }}</span>
          </p>
          <p class="user-bio-preview">{{ profileForm.bio || 'No bio provided yet.' }}</p>
        </div>

        <div class="profile-actions">
          <el-button type="primary" size="large" :loading="isSaving" @click="saveProfile">
            <el-icon class="el-icon--left"><Check /></el-icon> Save Changes
          </el-button>
        </div>
      </div>
    </div>

    <!-- Quick Stats Cards Bar -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon bg-blue"><el-icon><Ticket /></el-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ eventStore.userRegisteredCount }}</span>
          <span class="stat-label">Registered Events</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-purple"><el-icon><Star /></el-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ eventStore.userBookmarkedCount }}</span>
          <span class="stat-label">Saved Events</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-orange"><el-icon><Collection /></el-icon></div>
        <div class="stat-info">
          <span class="stat-value">{{ profileForm.clubs.length }}</span>
          <span class="stat-label">Joined Clubs</span>
        </div>
      </div>
    </div>

    <!-- Profile Edit Forms Grid -->
    <div class="profile-grid">
      <!-- Section 1: Academic & Personal Information -->
      <el-card class="profile-card" shadow="hover">
        <template #header>
          <div class="card-title">
            <el-icon><User /></el-icon> Basic & Academic Info (基本与学术信息)
          </div>
        </template>

        <el-form label-position="top" class="profile-form">
          <el-form-item label="Full Name (姓名)">
            <el-input v-model="profileForm.name" placeholder="Full name" />
          </el-form-item>

          <el-form-item label="Campus Email (校园邮箱)">
            <el-input v-model="profileForm.email" disabled placeholder="email@campus.edu">
              <template #append>Verified</template>
            </el-input>
          </el-form-item>

          <div class="form-row">
            <el-form-item label="Major (专业)" class="half-width">
              <el-input v-model="profileForm.major" placeholder="e.g. Computer Science" />
            </el-form-item>

            <el-form-item label="Grade (年级)" class="half-width">
              <el-select v-model="profileForm.grade" placeholder="Select grade" class="full-width">
                <el-option label="Freshman (Year 1)" value="Freshman (Year 1)" />
                <el-option label="Sophomore (Year 2)" value="Sophomore (Year 2)" />
                <el-option label="Junior (Year 3)" value="Junior (Year 3)" />
                <el-option label="Senior (Year 4)" value="Senior (Year 4)" />
                <el-option label="Postgraduate (Master/PhD)" value="Postgraduate" />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item label="Personal Bio (个人简介)">
            <el-input 
              v-model="profileForm.bio" 
              type="textarea" 
              :rows="3" 
              placeholder="Tell others about your research interests, projects, or hobbies..." 
            />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Section 2: Campus Life & Interests (社团, 兴趣, 空闲时间) -->
      <el-card class="profile-card" shadow="hover">
        <template #header>
          <div class="card-title">
            <el-icon><Compass /></el-icon> Campus Life & Schedule (社团、兴趣与空闲时间)
          </div>
        </template>

        <el-form label-position="top" class="profile-form">
          <!-- 兴趣 (Interests) -->
          <el-form-item label="Interests & Topics (个人兴趣)">
            <div class="tags-container">
              <el-tag
                v-for="interest in profileForm.interests"
                :key="interest"
                closable
                type="primary"
                effect="light"
                class="custom-tag"
                @close="removeInterest(interest)"
              >
                {{ interest }}
              </el-tag>
              <div class="add-tag-box">
                <el-input
                  v-if="inputInterestVisible"
                  ref="interestInputRef"
                  v-model="inputInterestValue"
                  size="small"
                  class="tag-input"
                  @keyup.enter="handleInterestInputConfirm"
                  @blur="handleInterestInputConfirm"
                />
                <el-button v-else size="small" type="primary" plain @click="showInterestInput">
                  + Add Interest
                </el-button>
              </div>
            </div>
            <div class="suggested-tags">
              <span class="suggest-label">Quick Suggestions:</span>
              <span 
                v-for="sug in suggestedInterests" 
                :key="sug" 
                class="suggest-chip" 
                @click="addInterest(sug)"
              >
                + {{ sug }}
              </span>
            </div>
          </el-form-item>

          <!-- 所属社团 (Clubs & Organizations) -->
          <el-form-item label="Clubs & Organizations (所属社团)">
            <div class="tags-container">
              <el-tag
                v-for="club in profileForm.clubs"
                :key="club"
                closable
                type="success"
                effect="light"
                class="custom-tag"
                @close="removeClub(club)"
              >
                {{ club }}
              </el-tag>
              <div class="add-tag-box">
                <el-input
                  v-if="inputClubVisible"
                  ref="clubInputRef"
                  v-model="inputClubValue"
                  size="small"
                  class="tag-input"
                  @keyup.enter="handleClubInputConfirm"
                  @blur="handleClubInputConfirm"
                />
                <el-button v-else size="small" type="success" plain @click="showClubInput">
                  + Join Club
                </el-button>
              </div>
            </div>
          </el-form-item>

          <!-- 空闲时间 (Available Time) -->
          <el-form-item label="Available Time Slots (空闲时间)">
            <el-select
              v-model="profileForm.availableTime"
              multiple
              collapse-tags
              collapse-tags-tooltip
              placeholder="Select your free availability slots"
              class="full-width"
            >
              <el-option label="Weekday Mornings (8:00 - 12:00)" value="Weekday Mornings (8:00 - 12:00)" />
              <el-option label="Weekday Afternoons (12:00 - 17:00)" value="Weekday Afternoons (12:00 - 17:00)" />
              <el-option label="Weekday Evenings (After 17:00)" value="Weekday Evenings (After 5 PM)" />
              <el-option label="Friday Afternoons" value="Friday Afternoons" />
              <el-option label="Saturday All Day" value="Saturday All Day" />
              <el-option label="Sunday Afternoons" value="Sunday Afternoons" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Section 3: Notification Preferences (通知偏好设置) -->
      <el-card class="profile-card full-span" shadow="hover">
        <template #header>
          <div class="card-title">
            <el-icon><Bell /></el-icon> Notification Preferences (通知偏好设置)
          </div>
        </template>

        <div class="notifications-settings-grid">
          <div class="setting-item">
            <div class="setting-text">
              <h4>Email Event Alerts (邮件通知)</h4>
              <p>Receive event registration passes, tickets, and status confirmations via email.</p>
            </div>
            <el-switch v-model="profileForm.notificationPreferences.emailAlerts" size="large" />
          </div>

          <div class="setting-item">
            <div class="setting-text">
              <h4>In-App Push Notifications (应用内推送)</h4>
              <p>Receive real-time popups for sudden venue changes, schedule updates, or urgent notices.</p>
            </div>
            <el-switch v-model="profileForm.notificationPreferences.pushNotifications" size="large" />
          </div>

          <div class="setting-item">
            <div class="setting-text">
              <h4>Event Reminders (活动提醒)</h4>
              <p>Get automated reminders 24 hours and 1 hour before registered events start.</p>
            </div>
            <el-switch v-model="profileForm.notificationPreferences.eventReminders" size="large" />
          </div>

          <div class="setting-item">
            <div class="setting-text">
              <h4>Waitlist Status Updates (候补名额通知)</h4>
              <p>Instant notification when a spot opens up for waitlisted events.</p>
            </div>
            <el-switch v-model="profileForm.notificationPreferences.waitlistUpdates" size="large" />
          </div>

          <div class="setting-item">
            <div class="setting-text">
              <h4>Weekly Campus Digest (每周精选推送)</h4>
              <p>Receive a curated roundup of top recommended events tailored to your interests.</p>
            </div>
            <el-switch v-model="profileForm.notificationPreferences.weeklyDigest" size="large" />
          </div>
        </div>
      </el-card>
    </div>

    <!-- Avatar Picker Dialog -->
    <el-dialog v-model="showAvatarPicker" title="Choose Avatar" width="440px">
      <div class="avatar-options-grid">
        <img 
          v-for="(img, idx) in presetAvatars" 
          :key="idx" 
          :src="img" 
          :class="{ selected: profileForm.avatar === img }"
          class="avatar-option-img"
          @click="selectAvatar(img)" 
        />
      </div>
      <template #footer>
        <el-button @click="showAvatarPicker = false">Cancel</el-button>
        <el-button type="primary" @click="showAvatarPicker = false">Confirm</el-button>
      </template>
    </el-dialog>
  </div>
  </component>
</template>

<script setup lang="ts">
import StudentLayout from '@/layouts/StudentLayout.vue'
import OrganiserLayout from '@/layouts/OrganiserLayout.vue'
import { computed, ref, reactive, nextTick, watch } from 'vue'
import { 
  User, 
  UserFilled, 
  Camera, 
  Check, 
  Ticket, 
  Star, 
  Collection, 
  Compass, 
  Bell 
} from '@element-plus/icons-vue'
import { ElMessage, type InputInstance } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { useEventStore } from '@/stores/eventStore'

const authStore = useAuthStore()
const eventStore = useEventStore()

const isSaving = ref(false)
const showAvatarPicker = ref(false)
const profileLayout = computed(() => {
  if (authStore.userRole === 'STUDENT') return StudentLayout
  if (authStore.userRole === 'ORGANISER') return OrganiserLayout
  return null
})

const profileForm = reactive({
  name: '',
  email: '',
  role: authStore.currentUser?.role || 'STUDENT',
  studentId: '',
  avatar: '',
  major: '',
  grade: '',
  bio: '',
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

watch(
  () => authStore.currentUser,
  (user) => {
    if (!user) return

    profileForm.name = user.name
    profileForm.email = user.email
    profileForm.role = user.role
    profileForm.studentId = user.studentId ?? ''
    profileForm.avatar = user.avatar ?? ''
    profileForm.major = user.major
    profileForm.grade = user.grade
    profileForm.bio = user.bio
    profileForm.interests = [...user.interests]
    profileForm.clubs = [...user.clubs]
    profileForm.availableTime = [...user.availableTime]
    profileForm.notificationPreferences = { ...user.notificationPreferences }
  },
  { immediate: true },
)

// Interest tag input state
const inputInterestVisible = ref(false)
const inputInterestValue = ref('')
const interestInputRef = ref<InputInstance>()

const suggestedInterests = ['E-sports & Gaming', 'Public Speaking', 'Music & Jamming', 'Career Fair', 'Badminton']

function removeInterest(tag: string) {
  profileForm.interests = profileForm.interests.filter(i => i !== tag)
}

function addInterest(tag: string) {
  if (!profileForm.interests.includes(tag)) {
    profileForm.interests.push(tag)
  }
}

function showInterestInput() {
  inputInterestVisible.value = true
  nextTick(() => {
    interestInputRef.value?.focus()
  })
}

function handleInterestInputConfirm() {
  if (inputInterestValue.value && !profileForm.interests.includes(inputInterestValue.value.trim())) {
    profileForm.interests.push(inputInterestValue.value.trim())
  }
  inputInterestVisible.value = false
  inputInterestValue.value = ''
}

// Club tag input state
const inputClubVisible = ref(false)
const inputClubValue = ref('')
const clubInputRef = ref<InputInstance>()

function removeClub(tag: string) {
  profileForm.clubs = profileForm.clubs.filter(c => c !== tag)
}

function showClubInput() {
  inputClubVisible.value = true
  nextTick(() => {
    clubInputRef.value?.focus()
  })
}

function handleClubInputConfirm() {
  if (inputClubValue.value && !profileForm.clubs.includes(inputClubValue.value.trim())) {
    profileForm.clubs.push(inputClubValue.value.trim())
  }
  inputClubVisible.value = false
  inputClubValue.value = ''
}

// Preset Avatars
const presetAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=250&q=80',
]

function selectAvatar(url: string) {
  profileForm.avatar = url
}

async function saveProfile() {
  isSaving.value = true
  try {
    await authStore.updateProfile({
      name: profileForm.name,
      avatar: profileForm.avatar,
      major: profileForm.major,
      grade: profileForm.grade,
      bio: profileForm.bio,
      interests: profileForm.interests,
      clubs: profileForm.clubs,
      availableTime: profileForm.availableTime,
      notificationPreferences: profileForm.notificationPreferences,
    })
    ElMessage.success('Profile updated successfully! All preferences saved.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to update your profile.')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 1100px;
  margin: 0 auto;
  padding-bottom: 40px;
}

/* Banner Header */
.profile-header-banner {
  position: relative;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%);
  border-radius: 20px;
  padding: 36px 32px;
  color: #ffffff;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(49, 46, 129, 0.25);
  margin-bottom: 24px;
}

.banner-overlay {
  position: absolute;
  top: -50px;
  right: -50px;
  width: 250px;
  height: 250px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  pointer-events: none;
}

.banner-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
}

.user-avatar-section {
  position: relative;
}

.profile-avatar {
  border: 4px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.change-avatar-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #6366f1;
  color: #fff;
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  transition: transform 0.2s;
}

.change-avatar-btn:hover {
  transform: scale(1.1);
}

.user-identity {
  flex: 1;
  min-width: 280px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.name-row h2 {
  font-size: 1.8rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0;
}

.role-badge {
  font-weight: 600;
  letter-spacing: 0.5px;
}

.user-subtext {
  font-size: 0.9rem;
  color: #c7d2fe;
  margin-bottom: 8px;
}

.user-bio-preview {
  font-size: 0.92rem;
  color: #e0e7ff;
  line-height: 1.4;
}

/* Stats Overview */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
}

.bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.bg-purple { background: linear-gradient(135deg, #a855f7, #9333ea); }
.bg-orange { background: linear-gradient(135deg, #f97316, #ea580c); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
}

.stat-label {
  font-size: 0.85rem;
  color: #64748b;
}

/* Profile Grid */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

.profile-card {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.full-span {
  grid-column: 1 / -1;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #1e293b;
}

.form-row {
  display: flex;
  gap: 16px;
}

.half-width {
  flex: 1;
}

.full-width {
  width: 100%;
}

/* Tags Container */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.custom-tag {
  font-size: 0.88rem;
  padding: 6px 12px;
  border-radius: 8px;
}

.tag-input {
  width: 120px;
}

.suggested-tags {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.suggest-label {
  font-size: 0.8rem;
  color: #64748b;
}

.suggest-chip {
  font-size: 0.78rem;
  background: #f1f5f9;
  color: #475569;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggest-chip:hover {
  background: #e2e8f0;
  color: #1e293b;
}

/* Notifications Settings List */
.notifications-settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  padding: 8px 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
}

.setting-text h4 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.setting-text p {
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.35;

}

/* Avatar Picker Dialog Grid */
.avatar-options-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  justify-items: center;
  padding: 10px 0;
}

.avatar-option-img {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
}

.avatar-option-img:hover {
  transform: scale(1.05);
}

.avatar-option-img.selected {
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2);
}
</style>
