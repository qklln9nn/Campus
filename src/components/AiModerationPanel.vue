<template>
  <section class="ai-panel" aria-label="AI content moderation">
    <div class="ai-heading">
      <h3>AI safety & quality review</h3>
      <el-button
        v-if="pending"
        :loading="busy"
        :disabled="review?.status === 'processing' && !leaseExpired"
        @click="$emit('analyze')"
      >
        {{ review?.status === 'completed' ? 'Analyze again' : 'Run AI review' }}
      </el-button>
    </div>
    <p class="ai-note">
      AI reviews event text and flags possible duplicates. An administrator makes the final
      decision.
    </p>
    <el-alert
      v-if="error || review?.error_message"
      :title="error || review?.error_message || ''"
      type="error"
      show-icon
      :closable="false"
    />
    <p v-if="busy || review?.status === 'processing'" role="status">
      Analyzing safety, information quality and similar submissions…
    </p>
    <template v-else-if="review?.status === 'completed' && review.result">
      <div class="ai-summary">
        <el-tag :type="riskType(review.result.riskLevel)"
          >{{ review.result.riskLevel.toUpperCase() }} RISK</el-tag
        >
        <strong>Completeness {{ review.result.completenessScore }}/100</strong>
        <el-tag type="info">{{ recommendationLabel[review.result.recommendation] }}</el-tag>
      </div>
      <el-progress
        :percentage="review.result.completenessScore"
        :status="review.result.completenessScore >= 80 ? 'success' : 'warning'"
      />
      <p class="ai-reason">{{ review.result.reason }}</p>
      <ul v-if="review.result.flags.length" class="ai-findings">
        <li v-for="(flag, index) in review.result.flags" :key="index">
          <el-tag size="small" :type="riskType(flag.severity)">{{ flagLabel[flag.code] }}</el-tag>
          <span>{{ flag.reason }}</span>
        </li>
      </ul>
      <p v-else>No text safety or quality flags detected.</p>
      <div v-if="review.result.missingFields.length">
        <h4>Missing information</h4>
        <ul>
          <li v-for="field in review.result.missingFields" :key="field">{{ field }}</li>
        </ul>
      </div>
      <div v-if="review.result.duplicates.length">
        <h4>Possible duplicate submissions</h4>
        <p class="ai-note">
          Same organiser · Similarity is an AI estimate. Check dates to distinguish recurring
          sessions.
        </p>
        <div v-for="match in review.result.duplicates" :key="match.eventId" class="duplicate-match">
          <el-button link type="primary" @click="$emit('openDuplicate', match.eventId)">{{
            match.title
          }}</el-button>
          <el-tag type="warning">{{ match.similarity }}% similar</el-tag>
          <p>{{ match.reason }}</p>
        </div>
      </div>
      <div v-if="review.result.suggestedDescription">
        <h4>Suggested description</h4>
        <p class="suggested-description">{{ review.result.suggestedDescription }}</p>
        <el-button
          v-if="pending"
          type="primary"
          :loading="adopting"
          :disabled="busy"
          @click="$emit('adopt', 'description')"
          >Apply AI description</el-button
        >
      </div>
      <el-button
        v-if="pending && review.result.recommendation !== 'approve'"
        type="danger"
        plain
        :loading="adopting"
        :disabled="busy"
        @click="$emit('adopt', 'reject')"
      >
        {{
          review.result.recommendation === 'request_changes'
            ? 'Return with AI reason'
            : 'Reject with AI reason'
        }}
      </el-button>
      <small>Reviewed {{ new Date(review.updated_at).toLocaleString() }}</small>
    </template>
    <p v-else-if="!error && review?.status !== 'failed'">
      Queued for AI review. You can also review this event manually.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AiReview, RiskCode, RiskLevel } from '@/lib/aiModeration'
const props = defineProps<{
  review?: AiReview
  busy: boolean
  adopting: boolean
  error?: string
  pending: boolean
}>()
defineEmits<{
  analyze: []
  adopt: [action: 'description' | 'reject']
  openDuplicate: [eventId: string]
}>()
const leaseExpired = computed(
  () => !props.review || Date.now() - Date.parse(props.review.updated_at) > 300000,
)
const recommendationLabel = {
  approve: 'Ready for review',
  request_changes: 'Changes requested',
  reject: 'Rejection suggested',
}
const flagLabel: Record<RiskCode, string> = {
  illegal_content: 'Illegal content',
  external_scam: 'Potential scam',
  hate_speech: 'Hate speech',
  low_quality: 'Low quality',
  missing_information: 'Missing details',
  duplicate: 'Possible duplicate',
}
function riskType(level: RiskLevel) {
  return level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success'
}
</script>

<style scoped>
.ai-panel {
  border: 1px solid #d9e2ee;
  border-radius: 12px;
  padding: 18px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ai-heading,
.ai-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.ai-heading {
  justify-content: space-between;
}
h3,
h4,
p {
  margin: 0;
}
.ai-note,
small {
  color: #64748b;
  line-height: 1.5;
}
.ai-note {
  font-size: 0.85rem;
}
.ai-reason,
.suggested-description,
.ai-findings span,
.duplicate-match p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.ai-findings {
  padding-left: 20px;
  margin: 0;
}
.ai-findings li {
  margin-bottom: 10px;
}
.ai-findings .el-tag {
  margin-right: 8px;
}
.duplicate-match {
  padding: 12px;
  margin-top: 10px;
  background: white;
  border-radius: 8px;
}
.duplicate-match .el-button {
  white-space: normal;
  height: auto;
  margin-right: 10px;
}
.suggested-description {
  background: white;
  padding: 12px;
  margin: 10px 0;
  border-radius: 8px;
}
</style>
