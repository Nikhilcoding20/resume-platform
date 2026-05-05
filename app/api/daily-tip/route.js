import { inspect } from 'node:util'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const TOPICS = [
  'resume tips and ATS-friendly formatting',
  'job interviews and how to prepare',
  'LinkedIn profile optimization and visibility',
  'salary negotiation',
  'professional networking and relationship building',
  'job search strategies and staying organized',
]

/** Shown when Claude is unavailable so the UI still gets a useful tip (200 OK). */
const FALLBACK_TIP =
  "Pick one job you're excited about and spend 15 minutes aligning a single resume bullet with its description—concrete outcomes beat generic duties. Small, targeted edits often move the needle more than a full rewrite."

function topicIndexForDate(dateStr) {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) >>> 0
  }
  return h % TOPICS.length
}

function buildPrompt(dateStr, topic) {
  return `You are a concise career coach.

Write exactly 2 or 3 short sentences (max). The tip must be practical and actionable today.
Focus ONLY on this category: ${topic}.
Do not use bullet points, numbering, or a title. Plain prose only.
Do not mention "seed", "AI", or that you are a model.

Calendar day: ${dateStr}. Topics rotate by day; keep the tip aligned with today's category.`
}

function extractText(message) {
  const blocks = message?.content || []
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
}

function logDailyTipError(err, context) {
  console.error(`[daily-tip] ${context} — full error:\n`, inspect(err, { depth: 12, colors: false }))
}

function fallbackResponse(dateStr, topicCategory) {
  return NextResponse.json({
    tip: FALLBACK_TIP,
    date: dateStr,
    topicCategory,
    fallback: true,
  })
}

export async function POST(request) {
  let dateStr = new Date().toISOString().slice(0, 10)

  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())) {
      dateStr = body.date.trim()
    }

    const topic = TOPICS[topicIndexForDate(dateStr)]
    const apiKey =
      typeof process.env.ANTHROPIC_API_KEY === 'string' ? process.env.ANTHROPIC_API_KEY.trim() : ''

    if (!apiKey) {
      console.error(
        '[daily-tip] ANTHROPIC_API_KEY is missing, not a string, or empty after trim. Check .env / deployment secrets.',
      )
      return fallbackResponse(dateStr, topic)
    }

    const anthropic = new Anthropic({ apiKey })

    let message
    try {
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 320,
        temperature: 0.35,
        messages: [
          {
            role: 'user',
            content: buildPrompt(dateStr, topic),
          },
        ],
      })
    } catch (apiErr) {
      logDailyTipError(apiErr, 'Claude API messages.create')
      return fallbackResponse(dateStr, topic)
    }

    const tip = extractText(message)
    if (!tip) {
      console.error('[daily-tip] Claude returned no text blocks; response:', inspect(message, { depth: 6, colors: false }))
      return fallbackResponse(dateStr, topic)
    }

    return NextResponse.json({
      tip,
      date: dateStr,
      topicCategory: topic,
    })
  } catch (err) {
    logDailyTipError(err, 'POST handler (unexpected)')
    return fallbackResponse(dateStr, TOPICS[topicIndexForDate(dateStr)])
  }
}
