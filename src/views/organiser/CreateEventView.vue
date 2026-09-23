<template>
  <OrganiserLayout>
    <div class="create-event-page">
      <header class="page-heading">
        <div>
          <button type="button" class="back-link" @click="handleCancel">← Back to my events</button>
          <p class="eyebrow">ORGANISER WORKSPACE</p>
          <h1>{{ isEditMode ? 'Edit event' : 'Create an event' }}</h1>
          <p>Enter the information students need, then save a draft or send it for review.</p>
        </div>
      </header>

      <el-alert
        v-if="loadError"
        :title="loadError"
        type="error"
        :closable="false"
        show-icon
      />

      <el-skeleton v-if="loadingPage" :rows="10" animated class="page-loading" />

      <div v-else class="editor-layout">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-position="top"
          class="event-form"
        >
          <section class="form-section">
            <div class="section-heading">
              <span>01</span>
              <div><h2>Event details</h2><p>Give the event a clear name and category.</p></div>
            </div>

            <el-form-item label="Event title" prop="title">
              <el-input v-model="formData.title" maxlength="80" show-word-limit placeholder="e.g. Student Research Evening" />
            </el-form-item>

            <el-form-item label="Category" prop="category">
              <el-select v-model="formData.category" placeholder="Choose a category" style="width: 100%">
                <el-option v-for="category in categoryStore.activeCategories" :key="category.slug"
                  :label="category.name" :value="category.slug" />
              </el-select>
              <p v-if="categoryStore.error" class="field-note error-note">Categories could not be loaded. Refresh the page and try again.</p>
            </el-form-item>

            <el-form-item prop="description">
              <template #label>
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <span>Description</span>
                  <el-button type="primary" size="small" plain :loading="isAiLoading" @click="generateAICopy">
                    ✨ AI Polish
                  </el-button>
                </div>
              </template>
              <el-input v-model="formData.description" type="textarea" :rows="7" maxlength="2400"
                show-word-limit placeholder="Explain what the event is, who it is for, and anything students should bring." />
            </el-form-item>
          </section>

          <section class="form-section">
            <div class="section-heading">
              <span>02</span>
              <div><h2>Time and place</h2><p>Events currently begin and end on the same date.</p></div>
            </div>

            <div class="two-fields">
              <el-form-item label="Event date" prop="date">
                <el-date-picker v-model="formData.date" type="date" value-format="YYYY-MM-DD"
                  format="DD MMMM YYYY" placeholder="Select date" style="width: 100%" />
              </el-form-item>
              <el-form-item label="Start and end time" prop="timeRange">
                <el-time-picker v-model="formData.timeRange" is-range value-format="HH:mm" format="HH:mm"
                  range-separator="to" start-placeholder="Start" end-placeholder="End" style="width: 100%" />
              </el-form-item>
            </div>

            <el-form-item label="Location" prop="location">
              <el-input v-model="formData.location" maxlength="120" placeholder="Building and room, or online meeting link">
                <template #prefix><el-icon><Location /></el-icon></template>
              </el-input>
              <div class="quick-options">
                <button v-for="venue in venuePresets" :key="venue" type="button" @click="formData.location = venue">{{ venue }}</button>
              </div>
            </el-form-item>

            <el-form-item label="Capacity" prop="capacity">
              <el-input-number v-model="formData.capacity" :min="5" :max="2000" :step="5" controls-position="right" />
              <p class="field-note">Students are automatically waitlisted after all places are taken.</p>
            </el-form-item>
          </section>

          <section class="form-section">
            <div class="section-heading">
              <span>03</span>
              <div><h2>Event poster</h2><p>Upload a local image, enter a public URL, or choose a preset.</p></div>
            </div>

            <div class="poster-upload-row">
              <el-upload
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :on-change="handleLocalImageUpload"
              >
                <el-button type="primary" plain :loading="isUploadingImage">
                  <el-icon class="el-icon--left"><Upload /></el-icon>
                  Upload Local Image
                </el-button>
              </el-upload>
              <span class="upload-tip">Supports JPG, PNG, WEBP (up to 5MB)</span>
            </div>

            <el-form-item label="Poster URL" prop="posterUrl">
              <el-input v-model="formData.posterUrl" placeholder="https://example.com/event-poster.jpg">
                <template #prefix><el-icon><Link /></el-icon></template>
              </el-input>
            </el-form-item>

            <div class="poster-options" aria-label="Preset posters">
              <button v-for="poster in presetPosters" :key="poster.url" type="button"
                :class="{ selected: formData.posterUrl === poster.url }" @click="formData.posterUrl = poster.url">
                <img :src="poster.url" :alt="poster.label" @error="handlePosterError" />
                <span>{{ poster.label }}</span>
              </button>
            </div>
          </section>

          <footer class="form-actions">
            <el-button :disabled="isSubmitting" @click="handleCancel">Cancel</el-button>
            <el-button :loading="isSubmitting && submissionType === 'draft'" :disabled="isSubmitting"
              @click="submitForm('draft')">Save Draft</el-button>
            <el-button v-if="canSubmitForReview" type="primary" :loading="isSubmitting && submissionType === 'review'" :disabled="isSubmitting"
              @click="submitForm('review')">
              {{ isEditMode ? 'Submit Changes' : 'Submit for Review' }}
            </el-button>
          </footer>
        </el-form>

        <aside class="preview-column">
          <p class="preview-label">STUDENT PREVIEW</p>
          <article class="event-preview">
            <img :src="previewPoster" alt="Event poster preview" @error="handlePreviewError" />
            <div class="preview-body">
              <p class="preview-date">{{ previewDate }}</p>
              <h2>{{ formData.title.trim() || 'Your event title' }}</h2>
              <p>{{ formData.location.trim() || 'Campus location' }}</p>
              <span>{{ previewCategory }}</span>
            </div>
          </article>
          <p class="preview-note">This is a simple preview. The final student card also includes registration and event-detail controls.</p>
        </aside>
      </div>
    </div>
  </OrganiserLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Link, Location, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadFile } from 'element-plus'
import OrganiserLayout from '@/layouts/OrganiserLayout.vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useEventStore } from '@/stores/eventStore'
import { categorySlug } from '@/lib/category'
import { DEFAULT_FALLBACK_POSTER, handlePosterError } from '@/lib/posterFallback'
import type { EventStatus } from '@/types/event'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()
const eventStore = useEventStore()
const formRef = ref<FormInstance>()
const loadingPage = ref(true)
const loadError = ref('')
const isSubmitting = ref(false)
const isUploadingImage = ref(false)
const submissionType = ref<'draft' | 'review' | ''>('')
const editingEventId = ref('')
const originalStatus = ref<EventStatus | null>(null)
const isAiLoading = ref(false)

const isEditMode = computed(() => Boolean(editingEventId.value))
const canSubmitForReview = computed(() => originalStatus.value !== 'CANCELLED')

async function generateAICopy() {
  if (!formData.title && !formData.description) {
    ElMessage.warning('Please enter a title or a draft description first.')
    return
  }
  isAiLoading.value = true
  try {
    const { data, error } = await supabase.functions.invoke('ai-copilot', {
      body: { title: formData.title, description: formData.description }
    })
    
    if (error) throw error
    if (data?.content) {
      formData.description = data.content
      ElMessage.success('AI copywriting applied successfully!')
    } else {
      throw new Error(data?.error || 'Invalid response')
    }
  } catch (error) {
    ElMessage.error('AI generation failed. Please try again.')
  } finally {
    isAiLoading.value = false
  }
}

async function handleLocalImageUpload(file: UploadFile) {
  const rawFile = file.raw
  if (!rawFile) return

  if (!rawFile.type.startsWith('image/')) {
    ElMessage.error('Please select a valid image file.')
    return
  }
  if (rawFile.size > 5 * 1024 * 1024) {
    ElMessage.error('Image file size must be smaller than 5MB.')
    return
  }

  isUploadingImage.value = true
  try {
    let uploadedUrl = ''

    if (supabase && import.meta.env.VITE_SUPABASE_URL) {
      const fileExt = rawFile.name.split('.').pop() || 'png'
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `posters/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('event-posters')
        .upload(filePath, rawFile, { cacheControl: '3600', upsert: true })

      if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError.message)
        ElMessage.warning(`Storage error: ${uploadError.message}. Falling back to base64.`)
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('event-posters')
          .getPublicUrl(filePath)

        if (publicUrlData?.publicUrl) {
          uploadedUrl = publicUrlData.publicUrl
        }
      }
    }

    // 3. 如果 Supabase 上传失败，降级为 Base64（注意：Base64 无法通过 Element Plus 的 type:'url' 规则）
    if (!uploadedUrl) {
      uploadedUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(rawFile)
      })
    }

    // 4. 更新表达数据并手动触发校验
    formData.posterUrl = uploadedUrl
    // 如果是 Base64 格式，清空 URL 格式校验报错
    if (uploadedUrl.startsWith('data:')) {
      formRef.value?.clearValidate('posterUrl')
    } else {
      formRef.value?.validateField('posterUrl').catch(() => {})
    }

    ElMessage.success('Local image uploaded successfully!')
  } catch (err) {
    console.error('Local image upload process error:', err)
    ElMessage.error(err instanceof Error ? err.message : 'Failed to process the selected image.')
  } finally {
    isUploadingImage.value = false
  }
}

const venuePresets = ['Student Centre', 'Main Library', 'Recreation Centre', 'Online']
const presetPosters = [
  { label: 'Talk', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80' },
  { label: 'Workshop', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80' },
  { label: 'Sport', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=900&q=80' },
]

const formData = reactive({
  title: '',
  category: '',
  description: '',
  date: '',
  timeRange: [] as string[],
  location: '',
  capacity: 50,
  posterUrl: presetPosters[0]?.url ?? '',
})

const formRules: FormRules = {
  title: [
    { required: true, message: 'Enter an event title.', trigger: 'blur' },
    { min: 5, message: 'Use at least 5 characters.', trigger: 'blur' },
  ],
  category: [{ required: true, message: 'Choose a category.', trigger: 'change' }],
  description: [
    { required: true, message: 'Add an event description.', trigger: 'blur' },
    { min: 20, message: 'Give students a little more information (at least 20 characters).', trigger: 'blur' },
  ],
  date: [{ required: true, message: 'Choose an event date.', trigger: 'change' }],
  timeRange: [{ type: 'array', required: true, min: 2, message: 'Choose a start and end time.', trigger: 'change' }],
  location: [{ required: true, message: 'Enter an event location.', trigger: 'blur' }],
  capacity: [{ required: true, type: 'number', message: 'Enter the event capacity.', trigger: 'change' }],

  posterUrl: [
    { required: true, message: 'Enter a poster URL or upload an image.', trigger: 'change' },
    {
      validator: (_rule, value, callback) => {
        if (!value) {
          return callback(new Error('Enter a poster URL or choose a preset.'))
        }
        const isValid = /^(https?:\/\/|data:image\/)/i.test(value.trim())
        if (isValid) {
          callback()
        } else {
          callback(new Error('Enter a complete URL beginning with http:// or https://.'))
        }
      },
      trigger: ['blur', 'change'],
    },
  ],
}

function extractDate(value: string) { return value.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? '' }
function extractTime(value: string) { return value.match(/\d{1,2}:\d{2}/)?.[0]?.padStart(5, '0') ?? '' }

onMounted(async () => {
  loadingPage.value = true
  loadError.value = ''
  const results = await Promise.allSettled([
    categoryStore.fetchCategories(),
    eventStore.fetchEventsFromSupabase(),
  ])
  if (results.every(result => result.status === 'rejected')) {
    loadError.value = 'The event form could not load its data. Please refresh and try again.'
  }

  const queryId = typeof route.query.id === 'string' ? route.query.id : ''
  if (queryId) {
    const event = eventStore.events.find(item => item.id === queryId)
    if (!event) {
      ElMessage.error('This event could not be found.')
      await router.replace('/organiser/dashboard')
      return
    }
    if (event.organiserId && event.organiserId !== authStore.currentUser?.id) {
      ElMessage.error('You can only edit your own events.')
      await router.replace('/organiser/dashboard')
      return
    }
    if (event.status === 'COMPLETED' || event.status === 'CLOSED') {
      ElMessage.warning('Completed events can no longer be edited.')
      await router.replace('/organiser/dashboard')
      return
    }
    editingEventId.value = event.id
    originalStatus.value = event.status
    formData.title = event.title
    formData.category = categorySlug(event.category)
    formData.description = event.description
    formData.date = extractDate(event.startTime)
    formData.timeRange = [extractTime(event.startTime), extractTime(event.endTime)].filter(Boolean)
    formData.location = event.location
    formData.capacity = event.capacity
    formData.posterUrl = event.posterUrl
  } else {
    formData.category = categoryStore.activeCategories[0]?.slug ?? ''
  }
  loadingPage.value = false
})

const previewPoster = computed(() => formData.posterUrl || DEFAULT_FALLBACK_POSTER)
const previewCategory = computed(() => categoryStore.labelFor(formData.category || 'event'))
const previewDate = computed(() => {
  if (!formData.date) return 'Date and time'
  const date = new Date(`${formData.date}T00:00:00`)
  const dateText = Number.isNaN(date.getTime())
    ? formData.date
    : new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'long' }).format(date)
  return `${dateText}${formData.timeRange[0] ? ` · ${formData.timeRange[0]}` : ''}`
})
function handlePreviewError(event: Event) { handlePosterError(event); formData.posterUrl = DEFAULT_FALLBACK_POSTER }

async function submitForm(type: 'draft' | 'review') {
  if (!formRef.value || isSubmitting.value) return
  if (type === 'review' && originalStatus.value === 'CANCELLED') {
    ElMessage.info('Save the cancelled event as a draft before submitting it for review.')
    return
  }
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    ElMessage.closeAll()
    ElMessage.error({ message: 'Please check the highlighted fields.', grouping: true })
    return
  }
  const [startTime, endTime] = formData.timeRange
  if (!startTime || !endTime || endTime <= startTime) {
    ElMessage.error('The end time must be later than the start time.')
    return
  }

  isSubmitting.value = true
  submissionType.value = type
  const payload = {
    title: formData.title.trim(),
    description: formData.description.trim(),
    category: formData.category,
    organiserName: authStore.currentUser?.name || 'Campus Organiser',
    date: formData.date,
    startTime,
    endTime,
    location: formData.location.trim(),
    capacity: formData.capacity,
    posterUrl: formData.posterUrl.trim(),
    isDraft: type === 'draft',
  }

  try {
    const result = isEditMode.value
      ? await eventStore.updateEventInSupabase(editingEventId.value, payload)
      : await eventStore.createEventInSupabase(payload)
    if (!result.success) throw new Error(result.message || 'The event could not be saved.')
    ElMessage.success(type === 'draft' ? 'Draft saved.' : 'Event submitted for administrator review.')
    await router.push('/organiser/dashboard')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'The event could not be saved.')
  } finally {
    isSubmitting.value = false
    submissionType.value = ''
  }
}

function handleCancel() { void router.push('/organiser/dashboard') }
</script>

<style scoped src="@/assets/styles/CreateEvent.css"></style>
