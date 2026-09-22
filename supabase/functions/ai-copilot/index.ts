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
    const { title, description } = await req.json()
    
    if (!title && !description) {
      return json({ error: 'Missing content' }, 400)
    }

    const apiKey = Deno.env.get('AI_API_KEY')
    if (!apiKey) {
      return json({ error: 'Server configuration error' }, 500)
    }

    const systemPrompt = 
      'You are a professional event marketing assistant. ' +
      'Rewrite the given draft into an engaging, structured description for a university campus event. ' +
      'Keep it concise but informative. At the end, extract exactly 3 relevant tags (e.g. #Workshop #Tech #FreeFood). ' +
      'Return strictly valid JSON in this format: {"content": "the polished description with tags at the end"}. ' +
      'Do not output markdown code blocks, just raw JSON.'

    const userPrompt = `Title: ${title || 'N/A'}\nDescription: ${description || 'N/A'}`

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
        temperature: 0.7,
        max_tokens: 800,
      }),
    })

    if (!aiResponse.ok) {
      return json({ error: 'AI service unavailable' }, 502)
    }

    const payload = await aiResponse.json()
    let contentStr: string = payload?.choices?.[0]?.message?.content?.trim() || ''
    
    if (contentStr.startsWith('```json')) {
      contentStr = contentStr.replace(/^```json/, '').replace(/```$/, '').trim()
    }
    
    try {
      const parsed = JSON.parse(contentStr)
      if (parsed.content) {
        return json({ content: parsed.content })
      }
      return json({ error: 'Invalid AI format' }, 500)
    } catch (e) {
      return json({ error: 'Parse error' }, 500)
    }
  } catch (err) {
    return json({ error: 'Internal server error' }, 500)
  }
})
