// src/lib/aiSummary.ts
import { supabase } from './supabase'

const summaryCache = new Map<string, string>()

export async function fetchAiSummary(eventId: string): Promise<string> {
  const cached = summaryCache.get(eventId)
  if (cached) return cached

  const { data, error } = await supabase.functions.invoke('ai-summary', {
    body: { eventId },
  })

  if (error) {
    throw new Error('AI summary service is unavailable, please try again later.')
  }
  const summary = (data as { summary?: string } | null)?.summary
  if (!summary) {
    throw new Error('AI returned an empty summary, please try again later.')
  }

  summaryCache.set(eventId, summary)
  return summary
}
