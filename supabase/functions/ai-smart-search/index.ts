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
    const { query, currentDate, events } = await req.json()
    const apiKey = Deno.env.get('AI_API_KEY')
    if (!apiKey) {
      return json({ error: 'Missing API Key' }, 500)
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      return json({ error: 'Query is required' }, 400)
    }

    const today = currentDate || new Date().toISOString().split('T')[0]
    const candidates = Array.isArray(events) ? events : []

    const systemPrompt = `You are an intelligent campus event search and ranking engine.
Today's Date: ${today}.
The student is searching for events using natural language (in English or Chinese).
Your job:
1. Understand the semantic intent across languages (e.g. 羽毛球 -> badminton, 讲座 -> talk, 求职 -> career, 运动 -> sports).
2. Evaluate the provided candidate events and select the IDs of the events that best match the student's intent. Rank them by relevance.
3. If user specifies temporal preferences (e.g. this week, upcoming, weekend), prioritize events fitting the timeframe, but if no events exist in that exact timeframe, include the closest upcoming matches with a note in the summary.
4. For each matched event, provide a 1-sentence match explanation.
5. Extract key search facets: category (if applicable) and keywords.
6. Return strictly valid JSON:
{
  "matchedEventIds": ["id1", "id2"],
  "summary": "Found X events matching your query.",
  "extractedFacets": {
    "category": "sports" | null,
    "keywords": ["badminton", "sports"]
  },
  "reasons": {
    "id1": "Explanation of why this event matches."
  }
}
Do not output markdown code blocks or backticks.`

    const userPrompt = `Student Query: "${query.trim()}"
Current Date: ${today}
Candidate Events (${candidates.length}):
${JSON.stringify(candidates.slice(0, 30).map((e: any) => ({
  id: e.id,
  title: e.title,
  category: e.category,
  date: e.event_date || e.eventDate || e.date,
  location: e.location,
  description: (e.description || '').slice(0, 120)
})))}`

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
        temperature: 0.2,
        max_tokens: 600,
      }),
    })

    if (!aiResponse.ok) {
      return json({ error: 'AI request failed' }, 502)
    }

    const payload = await aiResponse.json()
    let content = payload?.choices?.[0]?.message?.content?.trim() || ''
    if (content.startsWith('```json')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim()
    } else if (content.startsWith('```')) {
      content = content.replace(/^```/, '').replace(/```$/, '').trim()
    }

    try {
      const parsed = JSON.parse(content)
      return json({ result: parsed })
    } catch {
      return json({ error: 'Failed to parse AI response', raw: content }, 500)
    }
  } catch (err: any) {
    return json({ error: err?.message || 'Server error' }, 500)
  }
})
