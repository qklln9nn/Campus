<template>
  <article class="event-card" @click.stop>
    <!-- 封面：横图、竖图都完整显示 -->
    <button
      type="button"
      class="event-cover"
      :aria-label="`View details for ${event.title}`"
      @click="detailsVisible = true"
    >
      <img
        :src="event.posterUrl || DEFAULT_FALLBACK_POSTER"
        :alt="event.title"
        loading="lazy"
        @error="onImgError"
      />

      <span class="cover-hint">
        View event
        <el-icon><Right /></el-icon>
      </span>
    </button>

    <!-- 日期、名称、地点 -->
    <div class="event-content">
      <p class="event-schedule">
        {{ scheduleText }}
      </p>

      <h3 class="event-title">
        <button
          type="button"
          @click="detailsVisible = true"
        >
          {{ event.title }}
        </button>
      </h3>

      <p class="event-location">
        <el-icon><Location /></el-icon>
        <span>{{ event.location }}</span>
      </p>

      <!-- 只显示需要提醒用户的状态 -->
      <p
        v-if="cardStatus"
        class="event-status"
        :class="{ 'is-registered': event.isRegistered }"
      >
        {{ cardStatus }}
      </p>

      <!-- 辅助功能 -->
      <div class="event-tools">
        <button
          type="button"
          class="event-tool"
          :aria-expanded="aiVisible"
          @click="toggleAiSummary"
        >
          AI Summary
          <span aria-hidden="true">{{ aiVisible ? '−' : '+' }}</span>
        </button>

        <button
          v-if="!hideOverlayActions"
          type="button"
          class="event-tool save-tool"
          :class="{ 'is-saved': event.isBookmarked }"
          :aria-pressed="event.isBookmarked"
          @click="emit('toggle-bookmark', event.id)"
        >
          <el-icon>
            <StarFilled v-if="event.isBookmarked" />
            <Star v-else />
          </el-icon>
          {{ event.isBookmarked ? 'Saved' : 'Save' }}
        </button>
      </div>

      <!-- 保留 AI Summary，展开在卡片下面 -->
      <section
        v-if="aiVisible"
        class="ai-summary"
        aria-label="AI Summary"
        aria-live="polite"
        :aria-busy="aiLoading"
      >
        <p v-if="aiLoading" class="ai-message">
          <el-icon class="is-loading"><Loading /></el-icon>
          Preparing summary...
        </p>

        <div v-else-if="aiError" class="ai-error">
          <p>{{ aiError }}</p>
          <button type="button" @click="loadAiSummary">
            Retry
          </button>
        </div>

        <div v-else>
          <p
            v-for="(line, index) in summaryLines"
            :key="index"
            class="ai-summary-line"
          >
            <strong v-if="line.label">{{ line.label }}: </strong>
            {{ line.text }}
          </p>
        </div>
      </section>
    </div>

    <!-- 活动详情 -->
    <el-dialog
      v-model="detailsVisible"
      title="Event details"
      width="min(640px, calc(100vw - 32px))"
      append-to-body
      destroy-on-close
    >
      <article class="event-details">
        <img
          class="details-poster"
          :src="event.posterUrl || DEFAULT_FALLBACK_POSTER"
          :alt="event.title"
          @error="onImgError"
        />

        <span class="details-category">
          {{ event.category }}
        </span>

        <h2>{{ event.title }}</h2>

        <p class="details-organiser">
          Hosted by {{ event.organiser.name }}
        </p>

        <dl class="details-facts">
          <div>
            <dt>Date &amp; time</dt>
            <dd>{{ scheduleText }}</dd>
          </div>

          <div>
            <dt>Location</dt>
            <dd>{{ event.location }}</dd>
          </div>

          <div>
            <dt>Registration</dt>
            <dd>
              {{ event.registeredCount }} / {{ event.capacity }} places filled
              <span v-if="event.waitlistCount > 0">
                · {{ event.waitlistCount }} on the waitlist
              </span>
            </dd>
          </div>
        </dl>

        <section class="details-description">
          <h3>About this event</h3>
          <p>
            {{
              event.description ||
              'The organiser has not provided a description yet.'
            }}
          </p>
        </section>

        <p
          v-if="event.isRegistered || event.isWaitlisted"
          class="details-registration-status"
        >
          {{
            event.isRegistered
              ? 'You are registered for this event.'
              : 'You are on the waitlist for this event.'
          }}
        </p>

        <div
          v-if="!hideOverlayActions"
          class="details-tools"
        >
          <button
            type="button"
            class="event-tool"
            :aria-pressed="event.isBookmarked"
            @click="emit('toggle-bookmark', event.id)"
          >
            <el-icon>
              <StarFilled v-if="event.isBookmarked" />
              <Star v-else />
            </el-icon>
            {{ event.isBookmarked ? 'Saved' : 'Save event' }}
          </button>

          <button
            type="button"
            class="report-link"
            @click="openReportModal"
          >
            Report this event
          </button>
        </div>
      </article>

      <template #footer>
        <div class="event-dialog-actions">
          <el-button @click="detailsVisible = false">
            Close
          </el-button>

          <el-button
            v-if="!hideActionBtn"
            :type="
              event.isRegistered || event.isWaitlisted
                ? 'danger'
                : 'primary'
            "
            :plain="event.isRegistered || event.isWaitlisted"
            :disabled="actionDisabled"
            @click="handleRegistrationAction"
          >
            {{ actionLabel }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 举报 -->
    <el-dialog
      v-model="reportModalVisible"
      title="Report event"
      width="min(440px, calc(100vw - 32px))"
      append-to-body
    >
      <p class="report-target">
        Reporting: <strong>{{ event.title }}</strong>
      </p>

      <el-form label-position="top">
        <el-form-item label="Reason" required>
          <el-select
            v-model="reportReason"
            placeholder="Select a reason"
            class="report-select"
          >
            <el-option
              label="Unsanctioned / Safety Hazard"
              value="Safety Hazard"
            />
            <el-option
              label="Fraud or Misleading Information"
              value="Fraud & Misleading"
            />
            <el-option
              label="Inappropriate Content"
              value="Inappropriate Content"
            />
            <el-option
              label="Other Issue"
              value="Other"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Explanation">
          <el-input
            v-model="reportDetails"
            type="textarea"
            :rows="4"
            :maxlength="2000"
            show-word-limit
            placeholder="Describe the issue..."
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="reportModalVisible = false">
          Cancel
        </el-button>

        <el-button
          type="danger"
          :loading="isSubmittingReport"
          @click="submitReport"
        >
          Submit Report
        </el-button>
      </template>
    </el-dialog>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Loading,
  Location,
  Right,
  Star,
  StarFilled,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import { fetchAiSummary } from '@/lib/aiSummary'
import { isEventRegistrationOpen } from '@/lib/eventRegistration'
import {
  DEFAULT_FALLBACK_POSTER,
  handlePosterError,
} from '@/lib/posterFallback'
import { useModerationStore } from '@/stores/moderationStore'
import type { EventItem } from '@/types/event'

// 父页面传进来的活动和显示选项
const props = withDefaults(
  defineProps<{
    event: EventItem
    hideActionBtn?: boolean
    hideOverlayActions?: boolean
  }>(),
  {
    hideActionBtn: false,
    hideOverlayActions: false,
  },
)

// 报名和收藏仍交给父页面处理
const emit = defineEmits<{
  (event: 'register-event', value: EventItem): void
  (event: 'cancel-registration', eventId: string): void
  (event: 'toggle-bookmark', eventId: string): void
}>()

const moderationStore = useModerationStore()

// 弹窗状态
const detailsVisible = ref(false)
const reportModalVisible = ref(false)
const reportReason = ref('')
const reportDetails = ref('')

// AI Summary 状态
const aiVisible = ref(false)
const aiLoading = ref(false)
const aiSummary = ref('')
const aiError = ref('')

// 日期处理：兼容数据库和创建页面的预览格式
// 2026-09-19 • 12:30:00
// 2026-09-19 12:30
// 2026-09-19T12:30:00
function parseEventDate(value: string): Date | null {
  const normalized = value
    .trim()
    .replace(/\s*•\s*/, 'T')
    .replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')

  // 不猜测缺少年份等不完整格式
  if (!/^\d{4}-\d{2}-\d{2}T/.test(normalized)) return null

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-NZ', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

const scheduleText = computed(() => {
  const start =
    parseEventDate(props.event.startsAt || '') ||
    parseEventDate(props.event.startTime)

  const end = parseEventDate(props.event.endTime)

  if (!start) return props.event.startTime || 'Date to be confirmed'

  if (!end || end.getTime() <= start.getTime()) {
    return `${formatDate(start)} · ${formatTime(start)}`
  }

  if (start.toDateString() === end.toDateString()) {
    return `${formatDate(start)} · ${formatTime(start)} – ${formatTime(end)}`
  }

  return `${formatDate(start)}, ${formatTime(start)} – ${formatDate(end)}, ${formatTime(end)}`
})

// 报名状态
const registrationOpen = computed(() =>
  isEventRegistrationOpen(props.event),
)

const isFull = computed(
  () => props.event.registeredCount >= props.event.capacity,
)

const cardStatus = computed(() => {
  if (props.event.isRegistered) return 'Registered'
  if (props.event.isWaitlisted) return 'On the waitlist'
  if (!registrationOpen.value) return 'Registration closed'
  if (isFull.value) return 'Waitlist available'
  return ''
})

const actionLabel = computed(() => {
  if (props.event.isRegistered) return 'Cancel Registration'
  if (props.event.isWaitlisted) return 'Leave Waitlist'
  if (!registrationOpen.value) return 'Registration Closed'
  return isFull.value ? 'Join Waitlist' : 'Register Now'
})

const actionDisabled = computed(
  () =>
    !props.event.isRegistered &&
    !props.event.isWaitlisted &&
    !registrationOpen.value,
)

function handleRegistrationAction() {
  if (props.hideActionBtn || actionDisabled.value) return

  detailsVisible.value = false

  if (props.event.isRegistered || props.event.isWaitlisted) {
    emit('cancel-registration', props.event.id)
  } else {
    emit('register-event', props.event)
  }
}

function onImgError(event: Event) {
  handlePosterError(event, props.event.category)
}

// 举报
const isSubmittingReport = computed(
  () => moderationStore.submittingReport,
)

function openReportModal() {
  detailsVisible.value = false
  reportReason.value = ''
  reportDetails.value = ''
  reportModalVisible.value = true
}

async function submitReport() {
  if (isSubmittingReport.value) return

  if (!reportReason.value) {
    ElMessage.warning('Please select a reason for reporting.')
    return
  }

  if (reportDetails.value.length > 2000) {
    ElMessage.warning('Report details must be 2,000 characters or fewer.')
    return
  }

  try {
    await moderationStore.submitReport(
      props.event.id,
      reportReason.value,
      reportDetails.value,
    )

    reportModalVisible.value = false
    ElMessage.success('Report submitted for administrator review.')
  } catch (error) {
    ElMessage.error(
      error instanceof Error
        ? error.message
        : 'Unable to submit this report.',
    )
  }
}

// AI Summary：继续使用项目现有接口
const summaryLines = computed(() =>
  aiSummary.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf(': ')

      return index > 0 && index < 30
        ? {
            label: line.slice(0, index),
            text: line.slice(index + 2),
          }
        : { label: '', text: line }
    }),
)

async function loadAiSummary() {
  if (aiLoading.value) return

  aiLoading.value = true
  aiError.value = ''

  try {
    aiSummary.value = await fetchAiSummary(props.event.id)
  } catch (error) {
    aiError.value =
      error instanceof Error
        ? error.message
        : 'AI summary is unavailable right now.'
  } finally {
    aiLoading.value = false
  }
}

async function toggleAiSummary() {
  aiVisible.value = !aiVisible.value

  if (aiVisible.value && !aiSummary.value) {
    await loadAiSummary()
  }
}
</script>

<style scoped src="../assets/styles/EventCard.css"></style>
