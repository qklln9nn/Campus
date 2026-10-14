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
    const { userName, currentDate, registeredEvents, savedEvents, availableTime } = await req.json()
    const apiKey = Deno.env.get('AI_API_KEY')
    if (!apiKey) {
      return json({ error: 'Missing API Key' }, 500)
    }

    const today = currentDate || new Date().toISOString().split('T')[0]
    const systemPrompt = `You are a personal student campus event assistant.
Today's Date: ${today}.
You generate an upcoming Weekly Digest & Briefing for the student.
Strict Rules:
1. ONLY include upcoming events occurring on or after ${today}. Strictly ignore and exclude any past events.
2. Group confirmed upcoming events with date, title, time, location, and practical preparation notes from description.
3. If no confirmed events exist for this week, leave confirmedEvents empty.
4. Alerts & Reminders: Highlight any time conflicts (e.g. daytime vs preferred evening/weekend availability) and remind about saved/waitlisted events.
5. Workload Balance Summary: Summarize schedule density and academic balance.
6. Return strictly valid JSON with this format:
{
  "confirmedEvents": [
    {
      "date": "Thursday, October 10, 2026",
      "title": "Event Title",
      "time": "11:37 AM",
      "location": "Student Centre",
      "preparation": "Bring student card..."
    }
  ],
  "alerts": ["Alert text 1", "Alert text 2"],
  "workloadSummary": "Workload evaluation text"
}
Do not wrap with markdown or code blocks. Return raw JSON.`

    const userPrompt = `Student Name: ${userName || 'Student'}
Current Date: ${today}
Student Preferred Free Time: ${JSON.stringify(availableTime || [])}
Upcoming Confirmed Events: ${JSON.stringify(registeredEvents || [])}
Saved/Waitlisted Events: ${JSON.stringify(savedEvents || [])}`

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
        max_tokens: 800,
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
      return json({ digest: parsed })
    } catch {
      return json({ digest: null, raw: content })
    }
  } catch (err: any) {
    return json({ error: err?.message || 'Server error' }, 500)
  }
})
