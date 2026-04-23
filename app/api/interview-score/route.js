import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { isPro } from '@/lib/subscription'

const SCORE_PROMPT = `You are an expert interview coach. Score this interview session. The candidate was interviewing for this role.

QUESTIONS AND ANSWERS:
{qaPairs}

Return ONLY a valid JSON object. Use these exact keys and number types (0-100 for scores):
- overall_score: number 0-100
- communication_score: number 0-100  
- relevance_score: number 0-100
- confidence_score: number 0-100
- technical_score: number 0-100
- strengths: array of strings
- weaknesses: array of strings
- next_steps: array of strings

Base scores on answer quality. Empty or very short answers = low score (20-40). Good detailed answers = 70-90.
Return ONLY the JSON object. No markdown, no backticks, no extra text.`

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonError('Server configuration error: Supabase not initialized', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: request.headers.get('Authorization') || '' } },
    })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return jsonError('Authentication required. Please log in again.', 401)
    }

    if (!(await isPro(supabase, user.id))) {
      return jsonError('AI Interview Coach is available on Pro plans only.', 403)
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonError('Server configuration error: Anthropic API key is not set', 500)
    }

    const body = await request.json()

    let qa = Array.isArray(body.questionsAndAnswers) ? body.questionsAndAnswers : []
    if (qa.length === 0) {
      const questions = Array.isArray(body.questions) ? body.questions : []
      const answers = Array.isArray(body.answers) ? body.answers : []
      if (questions.length > 0 && answers.length > 0) {
        qa = questions.map((q, i) => ({
          question: typeof q === 'string' ? q : String(q ?? ''),
          answer: answers[i] != null && answers[i] !== '' ? String(answers[i]) : '(No answer)',
        }))
      }
    }
    if (qa.length > 0) {
      qa = qa.map((item) => ({
        question: item.question ?? item.q ?? '',
        answer: item.answer ?? item.a ?? '(No answer)',
      }))
    }

    const receivedQuestions = qa.map((x) => x.question)
    const receivedAnswers = qa.map((x) => x.answer)

    console.log('[interview-score] Received before sending to Claude:', {
      questionsCount: receivedQuestions.length,
      answersCount: receivedAnswers.length,
      firstQ: receivedQuestions[0]?.slice(0, 50),
      firstA: receivedAnswers[0]?.slice(0, 80),
    })

    if (!qa.length) {
      console.error('[interview-score] Invalid or empty data:', JSON.stringify(body).slice(0, 500))
      return jsonError('questionsAndAnswers (or questions + answers arrays) is required.', 400)
    }

    const qaPairs = qa.map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`).join('\n\n')

    const prompt = SCORE_PROMPT.replace('{qaPairs}', qaPairs)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlocks = (message.content || []).filter((b) => b.type === 'text').map((b) => b.text)
    const rawText = textBlocks.join('').trim()

    console.log('[interview-score] Raw Claude API response:', rawText)

    let cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) cleaned = jsonMatch[0]

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[interview-score] JSON parse error:', parseErr.message, 'Raw:', rawText.slice(0, 600))
      return jsonError('AI returned invalid response. Please try again.', 500)
    }

    const toNum = (v) => {
      if (v == null || v === '') return 0
      const n = Number(v)
      if (Number.isNaN(n)) return 0
      return Math.min(100, Math.max(0, Math.round(n)))
    }

    const overallScore = toNum(parsed.overall_score ?? parsed.overallScore)
    const communication = toNum(parsed.communication_score ?? parsed.breakdown?.communication)
    const relevance = toNum(parsed.relevance_score ?? parsed.breakdown?.relevance)
    const confidence = toNum(parsed.confidence_score ?? parsed.breakdown?.confidence)
    const technicalKnowledge = toNum(parsed.technical_score ?? parsed.breakdown?.technicalKnowledge)

    const result = {
      overallScore,
      breakdown: {
        communication: communication || overallScore,
        relevance: relevance || overallScore,
        confidence: confidence || overallScore,
        technicalKnowledge: technicalKnowledge || overallScore,
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
      nextSteps: Array.isArray(parsed.next_steps) ? parsed.next_steps.map(String) : (Array.isArray(parsed.nextSteps) ? parsed.nextSteps.map(String) : []),
    }

    const fallbackAvg = Math.round((communication + relevance + confidence + technicalKnowledge) / 4)
    if (result.overallScore === 0 && fallbackAvg > 0) {
      result.overallScore = fallbackAvg
    }
    if (result.breakdown.communication === 0) result.breakdown.communication = result.overallScore
    if (result.breakdown.relevance === 0) result.breakdown.relevance = result.overallScore
    if (result.breakdown.confidence === 0) result.breakdown.confidence = result.overallScore
    if (result.breakdown.technicalKnowledge === 0) result.breakdown.technicalKnowledge = result.overallScore

    console.log('[interview-score] Parsed result:', JSON.stringify(result))

    return NextResponse.json(result)
  } catch (err) {
    console.error('[interview-score] Error:', err)
    return jsonError(err.message || 'Failed to score interview', 500)
  }
}
