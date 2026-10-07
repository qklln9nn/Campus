// src/lib/aiSummary.ts
import { supabase } from './supabase'
// Memory cache for AI summaries
const summaryCache = new Map<string, string>()

export async function fetchAiSummary(eventId: string): Promise<string> {
  // Return cached summary if exists
  const cached = summaryCache.get(eventId)
  if (cached) return cached

  // Invoke Supabase Edge Function "ai-summary", pass eventId in request body
  const { data, error } = await supabase.functions.invoke('ai-summary', {
    body: { eventId },
  })

  // Throw error when edge function invocation fails
  if (error) {
    throw new Error('AI summary service is unavailable, please try again later.')
  }

  // Extract summary field from response data
  const summary = (data as { summary?: string } | null)?.summary

  // Throw error if AI returns empty summary content
  if (!summary) {
    throw new Error('AI returned an empty summary, please try again later.')
  }

  // Save summary into memory cache for reuse
  summaryCache.set(eventId, summary)
  return summary
}
