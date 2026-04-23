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

export async function POST(request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Anthropic API key is not set' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const dateStr =
      typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())
        ? body.date.trim()
        : new Date().toISOString().slice(0, 10)

    const topicIdx = topicIndexForDate(dateStr)
    const topic = TOPICS[topicIdx]

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
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

    const tip = extractText(message)
    if (!tip) {
      return NextResponse.json({ error: 'AI returned no tip' }, { status: 500 })
    }

    return NextResponse.json({
      tip,
      date: dateStr,
      topicCategory: topic,
    })
  } catch (err) {
    console.error('[daily-tip] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate tip' },
      { status: 500 }
    )
  }
}
