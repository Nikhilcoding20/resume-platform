import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const PROMPT = `Based on this job description generate 4 to 5 yes or no questions that would help boost the ATS score if the answer is yes. Questions should be about specific tools platforms certifications or experiences mentioned in the job that may not be in the resume. Return ONLY a JSON array of question strings.`

export async function POST(request) {
  try {
    const body = await request.json()
    const { jobDescription } = body

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid job description' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error: Anthropic API key is not set' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${PROMPT}\n\nJob description:\n${jobDescription}`,
        },
      ],
    })

    const textBlocks = (message.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
    const rawText = textBlocks.join('').trim()

    if (!rawText) {
      return NextResponse.json({ error: 'AI returned no data' }, { status: 500 })
    }

    const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    let questions
    try {
      questions = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 })
    }

    const questionStrings = questions
      .filter((q) => q != null && typeof q === 'string')
      .map((q) => String(q).trim())
      .filter(Boolean)
      .slice(0, 5)

    return NextResponse.json({ questions: questionStrings })
  } catch (err) {
    console.error('[boost-questions] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to generate boost questions' },
      { status: 500 }
    )
  }
}
