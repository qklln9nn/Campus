<template>
  <el-card class="event-card" :body-style="{ padding: '0px' }" shadow="hover">
    <!-- Top Poster Section -->
    <div class="poster-container">
      <img 
        :src="event.posterUrl || DEFAULT_FALLBACK_POSTER" 
        :alt="event.title" 
        class="poster-image" 
        @error="onImgError" 
      />
      
      <!-- Status Badge Overlay -->
      <div class="status-badge" :class="statusClass">
        {{ statusText }}
      </div>

      <!-- AI Summary Button (Top-Right Corner) -->
      <button
        class="ai-summary-trigger"
        @click.stop="toggleAiSummary"
        title="AI 1-second summary"
      >
        ✨ AI Summary
      </button>

      <!-- AI Summary Overlay Panel -->
      <transition name="ai-fade">
        <div class="ai-summary-panel" v-if="aiVisible" @click.stop>
          <div class="ai-panel-header">
            <span class="ai-panel-title">✨ AI Summary</span>
            <button class="ai-panel-close" @click.stop="aiVisible = false" title="Close">✕</button>
          </div>
          <p v-if="aiLoading" class="ai-panel-text ai-panel-loading">
            <el-icon class="is-loading"><Loading /></el-icon> AI is thinking...
          </p>
          <p v-else-if="aiError" class="ai-panel-text ai-panel-error">
            {{ aiError }}
            <button class="ai-retry-btn" @click.stop="toggleAiSummary">Retry</button>
          </p>
          <div v-else class="ai-panel-body">
            <p v-for="(line, i) in summaryLines" :key="i" class="ai-panel-line">
              <span v-if="line.label" class="ai-line-label">{{ line.label }}: </span><span>{{ line.text }}</span>
            </p>
          </div>
        </div>
      </transition>

      <!-- Bookmark & Report Action Buttons (Hidden when hideOverlayActions is true) -->
      <div class="poster-actions-overlay" v-if="!hideOverlayActions">
        <button 
          class="overlay-btn report-btn" 
          @click.stop="openReportModal"
          title="Report Event Violation"
        >
          <el-icon><Warning /></el-icon>
        </button>

        <button 
          class="overlay-btn bookmark-btn" 
          :class="{ active: event.isBookmarked }" 
          @click.stop="$emit('toggle-bookmark', event.id)"
          title="Save Event"
        >
          <el-icon><StarFilled v-if="event.isBookmarked" /><Star v-else /></el-icon>
        </button>
      </div>
    </div>

    <!-- Middle Content Section -->
    <div class="card-content">
      <!-- Title & Organiser -->
      <div class="header-info">
        <h3 class="event-title" :title="event.title">{{ event.title }}</h3>
        <div class="organiser-info">
          <el-avatar :size="20" :src="event.organiser.avatar || ''" class="org-avatar">
            {{ event.organiser.name.charAt(0) }}
          </el-avatar>
          <span class="org-name">{{ event.organiser.name }}</span>
        </div>
      </div>

      <!-- Key Details: Time and Location -->
      <div class="meta-details">
        <div class="meta-item">
          <el-icon class="meta-icon"><Calendar /></el-icon>
          <span class="meta-text">{{ event.startTime }}</span>
        </div>
        <div class="meta-item">
          <el-icon class="meta-icon"><Location /></el-icon>
          <span class="meta-text">{{ event.location }}</span>
        </div>
      </div>

      <!-- Capacity & Progress Indicator -->
      <div class="capacity-section">
        <div class="capacity-header">
          <span class="capacity-label">
            <el-icon class="user-icon"><User /></el-icon>
            Seats Capacity
          </span>
          <span class="capacity-value">
            {{ event.registeredCount }} / {{ event.capacity }}
            <span v-if="event.waitlistCount > 0" class="waitlist-count">
              (Waitlist: {{ event.waitlistCount }})
            </span>
          </span>
        </div>
        <el-progress 
          :percentage="capacityPercentage" 
          :status="progressStatus"
          :stroke-width="6" 
          :show-text="false" 
        />
      </div>
    </div>

    <!-- Bottom Footer Section -->
    <div class="card-footer">
      <!-- Category Tag -->
      <el-tag :type="categoryTagType" effect="light" round class="category-tag">
        {{ event.category }}
      </el-tag>

      <!-- Dynamic Action Button or Details Link -->
      <div class="action-btn-wrapper" v-if="!hideActionBtn">
        <el-button 
          v-if="event.isRegistered" 
          type="success" 
          plain 
          size="default"
          class="action-btn registered-btn"
          @click="$emit('cancel-registration', event.id)"
        >
          <el-icon><Check /></el-icon> Registered
        </el-button>

        <el-button 
          v-else-if="event.isWaitlisted" 
          type="warning" 
          plain 
          size="default"
          class="action-btn waitlist-btn"
          @click="$emit('cancel-registration', event.id)"
        >
          <el-icon><Clock /></el-icon> Waitlisted
        </el-button>

        <el-button 
          v-else-if="event.registeredCount >= event.capacity" 
          type="warning" 
          size="default"
          class="action-btn"
          @click="$emit('register-event', event)"
        >
          Join Waitlist
        </el-button>

        <el-button 
          v-else 
          type="primary" 
          size="default"
          class="action-btn register-btn"
          @click="$emit('register-event', event)"
        >
          Register Now
        </el-button>
      </div>

      <div class="view-details-hint" v-else>
        <span>View Details</span>
        <el-icon><Right /></el-icon>
      </div>
    </div>

    <!-- Report Event Violation Modal -->
    <el-dialog
      v-model="reportModalVisible"
      title="Report Event Violation"
      width="440px"
      append-to-body
    >
      <div class="report-form-body">
        <p class="report-target-text">Reporting: <strong>{{ event.title }}</strong></p>

        <div class="form-group">
          <label>Reason for Report:</label>
          <el-select v-model="reportReason" placeholder="Select violation category" style="width: 100%">
            <el-option label="Unsanctioned / Safety Hazard" value="Safety Hazard" />
            <el-option label="Fraud & Misleading Information" value="Fraud & Misleading" />
            <el-option label="Inappropriate Content or Speech" value="Inappropriate Content" />
            <el-option label="Other Issue" value="Other" />
          </el-select>
        </div>

        <div class="form-group" style="margin-top: 12px;">
          <label>Detailed Explanation:</label>
          <el-input
            v-model="reportDetails"
            type="textarea"
            :rows="3"
            placeholder="Provide context or evidence for system administrators..."
          />
        </div>
      </div>

      <template #footer>
        <el-button @click="reportModalVisible = false">Cancel</el-button>
        <el-button type="danger" :loading="isSubmittingReport" @click="submitReport">
          Submit Report
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EventItem, CategoryType } from '@/types/event'
import { Calendar, Location, User, Star, StarFilled, Check, Clock, Warning, Right, Loading } from '@element-plus/icons-vue'
import { handlePosterError, DEFAULT_FALLBACK_POSTER } from '@/lib/posterFallback'
import { useModerationStore } from '@/stores/moderationStore'
import { fetchAiSummary } from '@/lib/aiSummary'
import { ElMessage } from 'element-plus'

const props = withDefaults(
  defineProps<{
    event: EventItem
    hideActionBtn?: boolean
    hideOverlayActions?: boolean
  }>(),
  {
    hideActionBtn: false,
    hideOverlayActions: false,
  }
)

const reportModalVisible = ref(false)
const reportReason = ref('')
const reportDetails = ref('')
const moderationStore = useModerationStore()
const isSubmittingReport = computed(() => moderationStore.submittingReport)

function openReportModal() {
  reportReason.value = ''
  reportDetails.value = ''
  reportModalVisible.value = true
}

async function submitReport() {
  if (!reportReason.value) {
    ElMessage.warning('Please select a reason for reporting.')
    return
  }
  if (reportDetails.value.length > 2000) {
    ElMessage.warning('Report details must be 2,000 characters or fewer.')
    return
  }

  try {
    await moderationStore.submitReport(props.event.id, reportReason.value, reportDetails.value)
    reportModalVisible.value = false
    ElMessage.success('Report submitted for administrator review.')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : 'Unable to submit this report.')
  }
}

function onImgError(e: Event) {
  handlePosterError(e, props.event.category)
}

// AI one-glance summary
const aiVisible = ref(false)
const aiLoading = ref(false)
const aiSummary = ref('')
const aiError = ref('')

const summaryLines = computed(() =>
  aiSummary.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(': ')
      return idx > 0 && idx < 30 ? { label: line.slice(0, idx), text: line.slice(idx + 2) } : { label: '', text: line }
    })
)

async function toggleAiSummary() {
  aiVisible.value = !aiVisible.value
  if (!aiVisible.value) return

  aiError.value = ''
  if (aiSummary.value) return

  aiLoading.value = true
  try {
    aiSummary.value = await fetchAiSummary(props.event.id)
  } catch (error) {
    aiError.value = error instanceof Error ? error.message : 'AI summary is unavailable right now.'
  } finally {
    aiLoading.value = false
  }
}

defineEmits<{
  (e: 'register-event', event: EventItem): void
  (e: 'cancel-registration', eventId: string): void
  (e: 'toggle-bookmark', eventId: string): void
}>()

// Calculate capacity percentage
const capacityPercentage = computed(() => {
  if (!props.event.capacity) return 0
  const pct = Math.round((props.event.registeredCount / props.event.capacity) * 100)
  return Math.min(pct, 100)
})

// Progress bar color status
const progressStatus = computed(() => {
  const pct = capacityPercentage.value
  if (pct >= 100) return 'exception'
  if (pct >= 80) return 'warning'
  return 'success'
})

// Status Badge Label
const statusText = computed(() => {
  if (props.event.registeredCount >= props.event.capacity) return 'WAITLIST ONLY'
  if (capacityPercentage.value >= 80) return 'FILLING FAST'
  return 'OPEN FOR REGISTRATION'
})

// Status Badge CSS Class
const statusClass = computed(() => {
  if (props.event.registeredCount >= props.event.capacity) return 'badge-waitlist'
  if (capacityPercentage.value >= 80) return 'badge-fast'
  return 'badge-open'
})

// Category tag color mapping
const categoryTagType = computed(() => {
  const map: Record<CategoryType, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    Academic: 'info',
    Tech: '',
    Sports: 'success',
    Cultural: 'warning',
    Club: 'danger',
    Career: 'info',
  }
  return map[props.event.category] || 'info'
})
</script>

<style scoped>
.event-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid #e8ecef;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.event-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08) !important;
}

/* Poster Container */
.poster-container {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
  background-color: #f2f4f7;
}

.poster-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.event-card:hover .poster-image {
  transform: scale(1.05);
}

/* Status Overlay Badge */
.status-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  backdrop-filter: blur(8px);
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.badge-open {
  background: rgba(46, 204, 113, 0.9);
}

.badge-fast {
  background: rgba(230, 126, 34, 0.9);
}

.badge-waitlist {
  background: rgba(142, 68, 173, 0.9);
}

/* AI summary trigger */
.ai-summary-trigger {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  padding: 6px 12px;
  border: none;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  color: #6d28d9;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.ai-summary-trigger:hover {
  background: #7c3aed;
  color: #ffffff;
  transform: scale(1.05);
}

/* AI summary panel */
.ai-summary-panel {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  background: rgba(23, 20, 44, 0.94);
  color: #f3f0ff;
  backdrop-filter: blur(4px);
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ai-panel-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #c4b5fd;
}

.ai-panel-close {
  border: none;
  background: transparent;
  color: #a5a0c8;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}

.ai-panel-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.ai-panel-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.ai-panel-line {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.55;
}

.ai-line-label {
  color: #b3a5e3;
  font-weight: 700;
}

.ai-panel-loading {
  color: #c4b5fd;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.82rem;
}

.ai-panel-error {
  color: #fca5a5;
  margin: 0;
  font-size: 0.82rem;
}

.ai-retry-btn {
  margin-left: 8px;
  border: 1px solid rgba(252, 165, 165, 0.6);
  background: transparent;
  color: #fca5a5;
  font-size: 0.72rem;
  padding: 2px 10px;
  border-radius: 12px;
  cursor: pointer;
}

.ai-retry-btn:hover {
  background: rgba(252, 165, 165, 0.15);
}

/* Panel fade transition */
.ai-fade-enter-active,
.ai-fade-leave-active {
  transition: opacity 0.2s ease;
}

.ai-fade-enter-from,
.ai-fade-leave-to {
  opacity: 0;
}

/* Leave the top-right corner for the AI summary trigger */
.poster-actions-overlay {
  position: absolute;
  top: 12px;
  right: 100px;
  display: flex;
  gap: 8px;
}

.overlay-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.overlay-btn:hover {
  transform: scale(1.1);
  background: #ffffff;
}

.report-btn:hover {
  color: #f56c6c;
}

.bookmark-btn.active {
  color: #f39c12;
  background: #ffffff;
}

.report-target-text {
  font-size: 0.95rem;
  color: #303133;
  margin-bottom: 12px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #606266;
  margin-bottom: 4px;
  display: block;
}

/* Card Content Area */
.card-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header-info {
  margin-bottom: 12px;
}

.event-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1d20;
  line-height: 1.35;
  margin: 0 0 6px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.7rem;
}

.organiser-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.org-avatar {
  background-color: #409eff;
  color: #ffffff;
  font-size: 10px;
}

.org-name {
  font-size: 0.8rem;
  color: #73767a;
  font-weight: 500;
}

/* Meta Details */
.meta-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: #4a5568;
}

.meta-icon {
  color: #409eff;
  font-size: 1rem;
  flex-shrink: 0;
}

.meta-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Capacity Section */
.capacity-section {
  margin-top: auto;
  padding-top: 4px;
}

.capacity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  color: #718096;
  margin-bottom: 6px;
}

.capacity-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.user-icon {
  font-size: 0.9rem;
}

.capacity-value {
  font-weight: 600;
  color: #2d3748;
}

.waitlist-count {
  color: #8e44ad;
  font-weight: 500;
  margin-left: 2px;
}

/* Card Footer */
.card-footer {
  padding: 12px 16px;
  border-top: 1px solid #edf2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fafbfc;
}

.category-tag {
  font-weight: 600;
  font-size: 0.75rem;
}

.action-btn {
  font-weight: 600;
  border-radius: 8px;
  padding: 8px 16px;
  transition: all 0.2s ease;
}

.register-btn {
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.25);
}

.register-btn:hover {
  box-shadow: 0 6px 14px rgba(64, 158, 255, 0.35);
}

.view-details-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #2563eb;
  transition: transform 0.2s ease;
}

.event-card:hover .view-details-hint {
  transform: translateX(3px);
}
</style>
