import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

const PROMPT = `You are an ATS expert. Analyze how well this resume matches this job description. Return ONLY a raw JSON object with: overall_score (number out of 100), keyword_match (number out of 100), experience_match (number out of 100), skills_match (number out of 100), missing_keywords (array of strings), strong_keywords (array of strings), quick_wins (array of exactly 3 strings with most impactful immediate fixes), recommendations (array of objects each with tip and where_to_add fields), what_is_working (array of strings), full_improvement_plan (array of strings with step by step instructions). Return nothing else.`

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

function getFileExtension(file) {
  const name = file.name || ''
  const match = name.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

function getMimeType(file) {
  return (file.type || '').toLowerCase()
}

function isPdf(file) {
  const ext = getFileExtension(file)
  const mime = getMimeType(file)
  return ext === 'pdf' || mime.includes('pdf')
}

function isWord(file) {
  const ext = getFileExtension(file)
  const mime = getMimeType(file)
  return ['doc', 'docx'].includes(ext) ||
    mime.includes('msword') ||
    mime.includes('wordprocessingml')
}

function isTxt(file) {
  const ext = getFileExtension(file)
  const mime = getMimeType(file)
  return ext === 'txt' || mime === 'text/plain'
}

async function analyzeResumeText(text, jobDescription) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const userMessage = `Resume text:\n\n${text}\n\n---\n\nJob description:\n\n${jobDescription}`
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: `${PROMPT}\n\n${userMessage}` }],
  })
  const textBlocks = (message.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
  const rawText = textBlocks.join('').trim()
  if (!rawText) return null
  const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let text = ''
    let jobDescription = ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      text = body.resumeText?.toString()?.trim() || ''
      jobDescription = body.jobDescription?.toString()?.trim() || ''
      if (!text) return jsonError('Resume text is required.', 400)
      if (!jobDescription) return jsonError('Job description is required.', 400)
    } else {
      const formData = await request.formData()
      const file = formData.get('file')
      jobDescription = formData.get('jobDescription')?.toString()?.trim() || ''

      if (!file || !(file instanceof Blob)) {
        return jsonError('No resume file provided. Please upload a PDF, Word, or TXT file.', 400)
      }
      if (!jobDescription) {
        return jsonError('Job description is required.', 400)
      }

      if (!isPdf(file) && !isWord(file) && !isTxt(file)) {
        return jsonError('Unsupported file type. Please upload a PDF, Word (.doc, .docx), or TXT file.', 400)
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (isPdf(file)) {
        const pdfData = await pdf(buffer)
        text = pdfData.text?.trim()
      } else if (isWord(file)) {
        const result = await mammoth.extractRawText({ buffer })
        text = result.value?.trim()
      } else {
        text = buffer.toString('utf-8').trim()
      }

      if (!text) {
        return jsonError('Could not extract any text from the resume.', 400)
      }
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonError('Server configuration error: Anthropic API key is not set.', 500)
    }

    let parsed
    try {
      parsed = await analyzeResumeText(text, jobDescription)
    } catch (e) {
      return jsonError('Failed to parse AI response.', 500)
    }
    if (!parsed) {
      return jsonError('AI returned no data.', 500)
    }

    return NextResponse.json({ ...parsed, resumeText: text })
  } catch (err) {
    console.error('[ats-checker] Error:', err)
    return jsonError(err.message || 'Failed to analyze resume.', 500)
  }
}
