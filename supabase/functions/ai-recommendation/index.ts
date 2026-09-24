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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { profile, events } = await req.json()
    const apiKey = Deno.env.get('AI_API_KEY')
    
    if (!apiKey) return json({ error: 'Missing API Key' }, 500)

    const systemPrompt = `You are a university event recommender. You receive a student's profile and a list of upcoming events (JSON format). Select exactly 3 events that best match their interests, clubs, and availability. Return strictly valid JSON in this format: {"recommendedIds": ["id1", "id2", "id3"], "reason": "A short, engaging 1-sentence explanation of why these events are perfect for them."}. Do not output markdown code blocks, just raw JSON.`

    const userPrompt = `Profile: ${JSON.stringify(profile)}\nEvents: ${JSON.stringify(events.map((e: any) => ({ id: e.id, title: e.title, category: e.category, desc: e.description, time: e.startTime })))}`

    const aiResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'glm-4.5-flash',
        thinking: { type: 'disabled' },
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.5,
        max_tokens: 300,
      }),
    })

    if (!aiResponse.ok) return json({ error: 'AI Error' }, 502)

    const payload = await aiResponse.json()
    let contentStr = payload?.choices?.[0]?.message?.content?.trim() || ''
    
    if (contentStr.startsWith('```json')) {
      contentStr = contentStr.replace(/^```json/, '').replace(/```$/, '').trim()
    }
    
    return json(JSON.parse(contentStr))
  } catch (err) {
    return json({ error: 'Server error' }, 500)
  }
})
