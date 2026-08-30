// POST { eventId } -> { summary }
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { eventId } = await req.json()
    if (!eventId || typeof eventId !== 'string') {
      return json({ error: '缺少 eventId' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: event, error } = await supabase
      .from('events')
      .select('title, description, category, event_date, start_time, end_time, location, online_link, status')
      .eq('id', eventId)
      .single()

    if (error || !event) {
      return json({ error: '活动不存在' }, 404)
    }
    if (event.status !== 'published') {
      return json({ error: '活动未发布' }, 403)
    }

    const apiKey = Deno.env.get('AI_API_KEY')
    if (!apiKey) {
      return json({ error: '服务器未配置 AI_API_KEY' }, 500)
    }

    const systemPrompt =
      'You are an assistant on a university campus events platform. Based on the given event info, ' +
      'write a summary in English, strictly following this three-line format. ' +
      'Each line starts with the specified emoji. Output these three lines and nothing else:\n' +
      '🕒 Time & Place: <one sentence with the date, time and location>\n' +
      '👥 Ideal for: <one sentence on which students this event suits>\n' +
      '🚀 Highlights: <one sentence on what attendees will get>\n' +
      'Use only the given information, do not fabricate specific details. ' +
      'If the description is empty or too short, derive the highlights line from the title and category ' +
      '(e.g. what people generally gain from this kind of event). ' +
      'If the time or location is unknown, say "see event details" for that line.'

    const timeStr =
      event.start_time === '00:00:00' && event.end_time === '23:59:59'
        ? 'All day'
        : `${(event.start_time ?? '').slice(0, 5)} - ${(event.end_time ?? '').slice(0, 5)}`

    const userPrompt = [
      `Title: ${event.title}`,
      `Category: ${event.category ?? 'General'}`,
      `Date: ${event.event_date ?? 'unknown'}`,
      `Time: ${timeStr}`,
      `Location: ${event.location ?? event.online_link ?? 'unknown'}`,
      `Description: ${(event.description || '').slice(0, 4000) || '(no description)'}`,
    ].join('\n')

    const aiResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4.5-flash',
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    })

    if (!aiResponse.ok) {
      console.error('AI provider error:', aiResponse.status, await aiResponse.text().catch(() => ''))
      return json({ error: 'AI 服务暂时不可用' }, 502)
    }

    const payload = await aiResponse.json()
    const summary: string | undefined = payload?.choices?.[0]?.message?.content?.trim()
    if (!summary) {
      return json({ error: 'AI 未返回摘要' }, 502)
    }

    return json({ summary })
  } catch (err) {
    console.error('ai-summary error:', err)
    return json({ error: '服务器内部错误' }, 500)
  }
})
