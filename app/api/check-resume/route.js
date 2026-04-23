import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `You are a professional career coach and ATS expert. Analyze this resume and return ONLY a raw JSON object with these fields: ats_score (number out of 100), score_breakdown (object with categories like keywords, formatting, experience, education each with a score out of 100), suggestions (array of objects each with section, question, and stat fields where stat is an impressive fact about adding that section), improvements (array of strings with specific tips to improve the resume). Return nothing else.`

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { profile } = body

    if (!profile || typeof profile !== 'object') {
      return jsonError('Missing or invalid profile data', 400)
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonError('Server configuration error: Anthropic API key is not set', 500)
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const resumeContext = JSON.stringify(profile, null, 2)
    const userMessage = `Resume profile data:\n${resumeContext}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `${PROMPT}\n\n${userMessage}` }],
    })

    const textBlocks = (message.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
    const rawText = textBlocks.join('').trim()

    if (!rawText) {
      return jsonError('AI returned no data', 500)
    }

    const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return jsonError('Failed to parse AI response', 500)
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[check-resume] Error:', err)
    return jsonError(err.message || 'Failed to analyze resume', 500)
  }
}
