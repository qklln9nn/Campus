<template>
  <OrganiserLayout>
    <div class="create-event-page">
      <!-- Top Page Header -->
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ isEditMode ? 'Edit Campus Event' : 'Create New Campus Event' }}</h2>
          <p class="page-subtitle">Fill in event details, capacity settings, and upload posters to publish for all students.</p>
        </div>
        <div class="header-actions">
          <el-button @click="handleCancel">Cancel</el-button>
          <el-button type="info" plain :loading="isSubmitting" @click="submitForm(formRef, true)">
            <el-icon><Document /></el-icon> Save as Draft
          </el-button>
          <el-button type="primary" :loading="isSubmitting" @click="submitForm(formRef, false)">
            <el-icon><Check /></el-icon> {{ isEditMode ? 'Save Changes' : 'Submit for Review' }}
          </el-button>
        </div>
      </div>

      <!-- Main Two-Column Layout -->
      <el-row :gutter="24" class="form-grid">
        <!-- Left Column: Complex Form -->
        <el-col :xs="24" :lg="15">
          <el-card class="form-card" shadow="never">
            <el-form
              ref="formRef"
              :model="formData"
              :rules="formRules"
              label-position="top"
              size="large"
              class="event-form"
            >
              <!-- Section 1: Basic Info -->
              <div class="form-section">
                <h4 class="section-title">
                  <el-icon><InfoFilled /></el-icon> General Details
                </h4>

                <el-form-item label="Event Title" prop="title">
                  <el-input
                    v-model="formData.title"
                    placeholder="e.g. AI & Future Tech Summit 2026"
                    maxlength="80"
                    show-word-limit
                    clearable
                  />
                </el-form-item>

                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item label="Category" prop="category">
                      <el-select v-model="formData.category" placeholder="Select category" style="width: 100%">
                        <el-option label="Tech & Coding" value="Tech" />
                        <el-option label="Academic & Research" value="Academic" />
                        <el-option label="Sports & Fitness" value="Sports" />
                        <el-option label="Cultural & Arts" value="Cultural" />
                        <el-option label="Club Activities" value="Club" />
                        <el-option label="Career Expo" value="Career" />
                      </el-select>
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="Host Organiser Name" prop="organiserName">
                      <el-input
                        v-model="formData.organiserName"
                        placeholder="e.g. School of Computer Science"
                      />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <el-divider />

              <!-- Section 2: Date, Time & Venue -->
              <div class="form-section">
                <h4 class="section-title">
                  <el-icon><Calendar /></el-icon> Schedule & Venue Location
                </h4>

                <el-form-item label="Event Date & Time Range" prop="dateTimeRange">
                  <el-date-picker
                    v-model="formData.dateTimeRange"
                    type="datetimerange"
                    range-separator="To"
                    start-placeholder="Start time"
                    end-placeholder="End time"
                    format="YYYY-MM-DD HH:mm"
                    value-format="YYYY-MM-DD HH:mm"
                    style="width: 100%"
                  />
                </el-form-item>

                <el-form-item label="Event Venue Location" prop="location">
                  <el-input
                    v-model="formData.location"
                    placeholder="Enter hall, building, or stadium location..."
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Location /></el-icon>
                    </template>
                  </el-input>

                  <!-- Location Preset Chips -->
                  <div class="venue-presets">
                    <span class="preset-label">Quick Presets:</span>
                    <el-tag
                      v-for="preset in venuePresets"
                      :key="preset"
                      size="small"
                      effect="plain"
                      class="preset-chip"
                      @click="formData.location = preset"
                    >
                      + {{ preset }}
                    </el-tag>
                  </div>
                </el-form-item>
              </div>

              <el-divider />

              <!-- Section 3: Capacity & Rules -->
              <div class="form-section">
                <h4 class="section-title">
                  <el-icon><User /></el-icon> Capacity & Waitlist Settings
                </h4>

                <el-row :gutter="16">
                  <el-col :span="12">
                    <el-form-item label="Maximum Seat Capacity" prop="capacity">
                      <el-input-number
                        v-model="formData.capacity"
                        :min="5"
                        :max="2000"
                        :step="10"
                        controls-position="right"
                        style="width: 100%"
                      />
                    </el-form-item>
                  </el-col>

                  <el-col :span="12">
                    <el-form-item label="Enable Auto Waitlist Queue">
                      <div class="switch-row">
                        <el-switch v-model="formData.enableWaitlist" active-text="Enabled" inactive-text="Disabled" />
                        <span class="switch-hint">Allows queueing when seats are full.</span>
                      </div>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <el-divider />

              <!-- Section 4: Poster Upload & Gallery -->
              <div class="form-section">
                <h4 class="section-title">
                  <el-icon><Picture /></el-icon> Event Cover Poster
                </h4>

                <el-form-item label="Poster Image URL or Preset Upload" prop="posterUrl">
                  <el-input v-model="formData.posterUrl" placeholder="Paste image URL or pick from presets below..." clearable>
                    <template #prefix>
                      <el-icon><Link /></el-icon>
                    </template>
                  </el-input>

                  <!-- Preset Gallery Pickers -->
                  <div class="poster-preset-gallery">
                    <div class="preset-title">Or choose from curated HD presets:</div>
                    <div class="gallery-grid">
                      <div
                        v-for="(img, idx) in presetPosters"
                        :key="idx"
                        class="gallery-item"
                        :class="{ active: formData.posterUrl === img.url }"
                        @click="formData.posterUrl = img.url"
                      >
                        <img
                          :src="img.url"
                          :alt="img.label"
                          @error="e => handlePosterError(e)"
                        />
                        <span class="gallery-label">{{ img.label }}</span>
                      </div>
                    </div>
                  </div>
                </el-form-item>
              </div>

              <el-divider />

              <!-- Section 5: Description -->
              <div class="form-section">
                <h4 class="section-title">
                  <el-icon><Document /></el-icon> Event Description & Guidelines
                </h4>

                <el-form-item label="Detailed Overview" prop="description">
                  <el-input
                    v-model="formData.description"
                    type="textarea"
                    :rows="4"
                    placeholder="Provide overview, schedule highlights, prerequisites, or special instructions..."
                    maxlength="500"
                    show-word-limit
                  />
                </el-form-item>
              </div>
            </el-form>
          </el-card>
        </el-col>

        <!-- Right Column: Live Card Preview -->
        <el-col :xs="24" :lg="9">
          <div class="preview-sticky">
            <div class="preview-header">
              <h3><el-icon><View /></el-icon> Live Card Preview</h3>
              <span class="preview-subtitle">How students will see this event on the portal.</span>
            </div>

            <!-- Rendered Live Event Card -->
            <EventCard :event="previewEvent" />

            <div class="preview-tip-box">
              <el-icon><Opportunity /></el-icon>
              <span>Tip: High resolution 16:9 ratio poster images result in higher student engagement!</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </OrganiserLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OrganiserLayout from '@/layouts/OrganiserLayout.vue'
import EventCard from '@/components/EventCard.vue'
import { useEventStore } from '@/stores/eventStore'
import type { CategoryType, EventItem } from '@/types/event'
import type { FormInstance, FormRules } from 'element-plus'
import { handlePosterError } from '@/lib/posterFallback'
import {
  Check,
  InfoFilled,
  Calendar,
  Location,
  User,
  Picture,
  Link,
  Document,
  View,
  Opportunity,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const eventStore = useEventStore()

const formRef = ref<FormInstance>()
const isSubmitting = ref(false)
const isEditMode = ref(false)
const editingEventId = ref<string | null>(null)

// Location Presets
const venuePresets = [
  'Innovation Center Auditorium A',
  'Student Union Great Hall',
  'Central Campus Stadium Field 1',
  'Library Lecture Theatre 2',
  'Campus Main Plaza & Lawn',
  'Exhibition Hall B',
]

// Preset Posters Collection
const presetPosters = [
  {
    label: 'Tech Summit',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Hackathon',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Sports Stadium',
    url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Academic Lecture',
    url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Cultural Fest',
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Career Expo',
    url: 'https://images.unsplash.com/photo-1560523131-75f82a9eb7ba?auto=format&fit=crop&w=800&q=80',
  },
]

// Form Reactive Model
const formData = reactive({
  title: '',
  category: 'Tech' as CategoryType,
  organiserName: 'School of Computer Science',
  dateTimeRange: [] as string[],
  location: '',
  capacity: 100,
  enableWaitlist: true,
  posterUrl: presetPosters[0]?.url ?? '',
  description: '',
})

// Validation Rules
const formRules = reactive<FormRules>({
  title: [
    { required: true, message: 'Please enter event title', trigger: 'blur' },
    { min: 5, message: 'Title must be at least 5 characters', trigger: 'blur' },
  ],
  category: [{ required: true, message: 'Please select category', trigger: 'change' }],
  organiserName: [{ required: true, message: 'Please enter organiser name', trigger: 'blur' }],
  dateTimeRange: [{ required: true, message: 'Please select date & time range', trigger: 'change' }],
  location: [{ required: true, message: 'Please specify location venue', trigger: 'blur' }],
  capacity: [{ required: true, message: 'Capacity is required', trigger: 'change' }],
  posterUrl: [{ required: true, message: 'Please provide poster URL or pick a preset', trigger: 'blur' }],
  description: [{ required: true, message: 'Please provide event description', trigger: 'blur' }],
})

// Computed Live Preview Event Item Object
const previewEvent = computed<EventItem>(() => {
  const startStr = formData.dateTimeRange && formData.dateTimeRange[0] ? formData.dateTimeRange[0] : '2026-11-01 10:00'
  const endStr = formData.dateTimeRange && formData.dateTimeRange[1] ? formData.dateTimeRange[1] : '2026-11-01 12:00'

  return {
    id: editingEventId.value || 'preview-id',
    title: formData.title || 'Untitled Event Title',
    description: formData.description || 'Event description placeholder text goes here.',
    category: formData.category,
    posterUrl: formData.posterUrl || presetPosters[0]?.url || '',
    startTime: startStr,
    endTime: endStr,
    location: formData.location || 'Campus Main Hall',
    organiser: {
      name: formData.organiserName || 'Campus Host',
      avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Host',
    },
    capacity: formData.capacity,
    registeredCount: isEditMode.value ? 24 : 0,
    waitlistCount: 0,
    status: 'OPEN',
    isRegistered: false,
    isWaitlisted: false,
    isBookmarked: false,
  }
})

// Lifecycle: Check edit mode query/param
onMounted(() => {
  const idParam = route.query.id as string
  if (idParam) {
    const existing = eventStore.events.find((e) => e.id === idParam)
    if (existing) {
      isEditMode.value = true
      editingEventId.value = existing.id
      formData.title = existing.title
      formData.category = existing.category
      formData.organiserName = existing.organiser.name
      formData.dateTimeRange = [existing.startTime, existing.endTime]
      formData.location = existing.location
      formData.capacity = existing.capacity
      formData.posterUrl = existing.posterUrl
      formData.description = existing.description
    }
  }
})

// Form Submission
async function submitForm(formEl: FormInstance | undefined, isDraft: boolean = false) {
  if (!formEl) return
  await formEl.validate(async (valid) => {
    if (valid) {
      isSubmitting.value = true
      const startStr = formData.dateTimeRange[0] ?? ''
      const endStr = formData.dateTimeRange[1] ?? ''

      // Clean out separator '•' and extract valid YYYY-MM-DD and HH:mm
      const cleanStart = (startStr || '').replace(/•/g, ' ').replace(/\s+/g, ' ').trim()
      const cleanEnd = (endStr || '').replace(/•/g, ' ').replace(/\s+/g, ' ').trim()

      const startParts = cleanStart.split(' ')
      const endParts = cleanEnd.split(' ')

      const datePart = startParts.find((p) => p.includes('-')) || '2026-11-01'
      const startTimePart = startParts.find((p) => p.includes(':')) || '14:00'
      const endTimePart = endParts.find((p) => p.includes(':')) || '18:00'

      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        organiserName: formData.organiserName,
        date: datePart,
        startTime: startTimePart,
        endTime: endTimePart,
        location: formData.location,
        capacity: formData.capacity,
        posterUrl: formData.posterUrl,
        isDraft,
      }

      let res
      if (isEditMode.value && editingEventId.value) {
        res = await eventStore.updateEventInSupabase(editingEventId.value, payload)
      } else {
        res = await eventStore.createEventInSupabase(payload)
      }

      isSubmitting.value = false
      if (res.success) {
        if (isEditMode.value) {
          ElMessage.success('Event updated successfully!')
        } else if (isDraft) {
          ElMessage.success('Event draft saved successfully!')
        } else {
          ElMessage.success('Event submitted for administrator review.')
        }
        router.push('/organiser/dashboard')
      } else {
        ElMessage.error(res.message || 'Failed to save event.')
      }
    } else {
      ElMessage.error('Please check required fields in the form.')
    }
  })
}

function handleCancel() {
  router.push('/organiser/dashboard')
}
</script>

<style scoped>
.create-event-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 0.9rem;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Form Section Card */
.form-card {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.form-section {
  padding: 8px 0;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title .el-icon {
  color: #6366f1;
}

.venue-presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.preset-label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
}

.preset-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.preset-chip:hover {
  background-color: #6366f1;
  color: #ffffff;
  border-color: #6366f1;
}

.switch-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Poster Preset Gallery */
.poster-preset-gallery {
  margin-top: 12px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.preset-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 10px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.gallery-item {
  position: relative;
  height: 70px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  font-size: 0.65rem;
  text-align: center;
  padding: 2px 0;
}

.gallery-item:hover {
  transform: scale(1.05);
}

.gallery-item.active {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}

/* Sticky Preview Column */
.preview-sticky {
  position: sticky;
  top: 88px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-header h3 {
  font-size: 1.1rem;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.preview-header h3 .el-icon {
  color: #6366f1;
}

.preview-subtitle {
  font-size: 0.8rem;
  color: #64748b;
}

.preview-tip-box {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  color: #166534;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
