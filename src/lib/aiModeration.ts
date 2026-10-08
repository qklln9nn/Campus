import { supabase } from './supabase'
export type {
  AiReview,
  AiModerationResult,
  RiskCode,
  RiskLevel,
} from '../../supabase/functions/_shared/moderation'

// Saving/submitting an event succeeds independently of the advisory AI service.
// The database queues every submission; the admin queue retries unfinished work.
export function requestSubmissionModeration(eventId: string): void {
  void supabase.functions.invoke('ai-moderation', { body: { eventId } }).catch(() => {
    // A persistent queued/failed review remains available in the admin console.
  })
}
