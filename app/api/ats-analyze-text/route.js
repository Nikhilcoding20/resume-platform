import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `You are an ATS expert. Analyze how well this resume matches this job description. Return ONLY a raw JSON object with: overall_score (number out of 100), keyword_match (number out of 100), experience_match (number out of 100), skills_match (number out of 100), missing_keywords (array of strings), strong_keywords (array of strings), quick_wins (array of exactly 3 strings with most impactful immediate fixes), recommendations (array of objects each with tip and where_to_add fields), what_is_working (array of strings), full_improvement_plan (array of strings with step by step instructions). Return nothing else.`

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const resumeText = body.resumeText?.toString()?.trim() || ''
    const jobDescription = body.jobDescription?.toString()?.trim() || ''

    if (!resumeText) {
      return jsonError('Resume text is required.', 400)
    }
    if (!jobDescription) {
      return jsonError('Job description is required.', 400)
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonError('Server configuration error: Anthropic API key is not set.', 500)
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const userMessage = `Resume text:\n\n${resumeText}\n\n---\n\nJob description:\n\n${jobDescription}`

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
      return jsonError('AI returned no data.', 500)
    }

    const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return jsonError('Failed to parse AI response.', 500)
    }

    const score = typeof parsed.overall_score === 'number'
      ? Math.min(100, Math.max(0, Math.round(parsed.overall_score)))
      : 0
    const strengths = Array.isArray(parsed.what_is_working)
      ? parsed.what_is_working.slice(0, 5).map((s) => String(s))
      : Array.isArray(parsed.strong_keywords)
        ? parsed.strong_keywords.slice(0, 5).map((s) => String(s))
        : []
    const improvements = Array.isArray(parsed.quick_wins)
      ? parsed.quick_wins.slice(0, 3).map((s) => String(s))
      : Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 3).map((r) => (r && typeof r.tip === 'string' ? r.tip : String(r)))
        : []

    return NextResponse.json({
      overall_score: score,
      strengths,
      improvements,
    })
  } catch (err) {
    console.error('[ats-analyze-text] Error:', err)
    return jsonError(err.message || 'Failed to analyze resume.', 500)
  }
}
