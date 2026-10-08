import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { analyzeEvent } from './analyze.ts'
import type { EventContent } from '../_shared/moderation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export async function handleModeration(
  req: Request,
  options?: { client?: SupabaseClient; apiKey?: string },
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const supabase =
    options?.client ??
    createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  let eventId: string | undefined
  let claimId: string | undefined
  try {
    const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return json({ error: 'Sign in to use AI moderation.' }, 401)
    const { data: auth, error: authError } = await supabase.auth.getUser(token)
    if (authError || !auth.user) return json({ error: 'Invalid session.' }, 401)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role,account_status')
      .eq('id', auth.user.id)
      .single()
    if (
      profileError ||
      !profile ||
      profile.account_status !== 'active' ||
      !['admin', 'organiser'].includes(profile.role)
    ) {
      return json({ error: 'Administrator or active organiser role required.' }, 403)
    }
    let body
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body.' }, 400)
    }
    if (
      !body ||
      typeof body.eventId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.eventId)
    ) {
      return json({ error: 'A valid eventId is required.' }, 400)
    }
    eventId = body.eventId
    const { data: target, error: eventError } = await supabase
      .from('events')
      .select('organiser_id,status')
      .eq('id', eventId)
      .single()
    if (eventError || !target) return json({ error: 'Event not found.' }, 404)
    if (profile.role !== 'admin' && target.organiser_id !== auth.user.id)
      return json({ error: 'Access denied.' }, 403)
    if (target.status !== 'pending')
      return json({ error: 'Only pending events can be analyzed.' }, 409)
    const { data: claim, error: claimError } = await supabase.rpc('claim_event_ai_review', {
      p_event_id: eventId,
      p_force: profile.role === 'admin' && body.force === true,
    })
    if (claimError) return json({ error: 'The event changed. Refresh the queue.' }, 409)
    if (claim.cached) return json({ review: profile.role === 'admin' ? claim.review : null })
    if (claim.busy) return json({ processing: true }, 202)
    claimId = claim.claimId
    const analysisDeadline = Date.now() + 120000
    const event = claim.event as EventContent
    if (profile.role !== 'admin' && event.organiser_id !== auth.user.id)
      return json({ error: 'Access denied.' }, 403)
    if (
      [event.title, event.description, event.location, event.online_link].some(
        (value) => (value?.length ?? 0) > 20000,
      )
    ) {
      throw new Error('Event text exceeds the AI review limit. Please review manually.')
    }
    const apiKey = options?.apiKey ?? Deno.env.get('AI_API_KEY')
    if (!apiKey)
      throw new Error('AI moderation is not configured. Please review manually or retry later.')
    const candidates: EventContent[] = []
    for (let offset = 0; ; offset += 200) {
      const { data, error } = await supabase
        .from('events')
        .select(
          'id,organiser_id,title,description,category,event_date,start_time,end_time,location,online_link,capacity,image_url',
        )
        .eq('organiser_id', event.organiser_id)
        .neq('id', event.id)
        .in('status', ['pending', 'published', 'completed'])
        .order('id')
        .range(offset, offset + 199)
      if (error) throw new Error('Unable to load duplicate candidates. Please retry.')
      candidates.push(...(data ?? []))
      if ((data?.length ?? 0) < 200) break
    }
    const callAi = async (system: string, input: unknown): Promise<unknown> => {
      const remainingTime = analysisDeadline - Date.now()
      if (remainingTime < 1000)
        throw new Error('AI comparison time limit reached. Please retry or review manually.')
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(Math.min(45000, remainingTime)),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'glm-4.5-flash',
          thinking: { type: 'disabled' },
          temperature: 0.1,
          max_tokens: 3500,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: JSON.stringify(input) },
          ],
        }),
      })
      if (!response.ok)
        throw new Error('AI provider is unavailable. Please retry or review manually.')
      const payload = await response.json()
      const content = payload?.choices?.[0]?.message?.content
      if (typeof content !== 'string')
        throw new Error('AI returned an invalid response. Please retry.')
      try {
        return JSON.parse(
          content
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, ''),
        )
      } catch {
        throw new Error('AI returned an invalid response. Please retry.')
      }
    }
    const result = await analyzeEvent(event, candidates, callAi)
    const { data: review, error: saveError } = await supabase.rpc('finish_event_ai_review', {
      p_event_id: eventId,
      p_claim_id: claimId,
      p_result: result,
    })
    if (saveError)
      return json({ error: 'The event changed during analysis. Refresh and retry.' }, 409)
    return json({ review: profile.role === 'admin' ? review : null })
  } catch (error) {
    // Do not log event content, provider payloads or credentials.
    const message =
      error instanceof Error
        ? error.message
        : 'AI moderation failed. Please retry or review manually.'
    if (eventId && claimId) {
      const { error: saveError } = await supabase.rpc('finish_event_ai_review', {
        p_event_id: eventId,
        p_claim_id: claimId,
        p_result: null,
        p_error: message,
      })
      if (saveError)
        return json({ error: 'The event changed during analysis. Refresh and retry.' }, 409)
    }
    return json({ error: message }, 502)
  }
}
