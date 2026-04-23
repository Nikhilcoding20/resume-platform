import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { isPro } from '@/lib/subscription'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'

const INTERVIEW_PROMPT = `You are an expert interview coach. Generate a personalized interview prep package based on the resume and job description.

RESUME CONTEXT:
{resumeContext}

JOB DESCRIPTION:
{jobDescription}

INTERVIEW TYPE: {interviewType}
DIFFICULTY LEVEL: {difficulty}

Generate exactly 8 interview questions tailored to the job and the candidate's background. Mix question types appropriately for the interview type (e.g., for Technical include coding/scenario questions; for Behavioral include STAR-format questions; for Mixed include both).

Also generate a prep guide with:
- topTopics: array of exactly 5 topics the candidate should prepare (short strings)
- keySkills: array of 3-5 key skills from their resume to highlight (short strings)
- questionsToAsk: array of exactly 3 smart questions the candidate should ask the interviewer

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "questions": ["question1", "question2", ...],
  "prepGuide": {
    "topTopics": ["topic1", "topic2", "topic3", "topic4", "topic5"],
    "keySkills": ["skill1", "skill2", ...],
    "questionsToAsk": ["q1", "q2", "q3"]
  }
}`

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

function getFileExtension(file) {
  const name = file?.name || ''
  const match = name.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

function isPdf(file) {
  const ext = getFileExtension(file)
  const mime = (file?.type || '').toLowerCase()
  return ext === 'pdf' || mime.includes('pdf')
}

function isWord(file) {
  const ext = getFileExtension(file)
  const mime = (file?.type || '').toLowerCase()
  return ['doc', 'docx'].includes(ext) || mime.includes('msword') || mime.includes('wordprocessingml')
}

function isTxt(file) {
  const ext = getFileExtension(file)
  const mime = (file?.type || '').toLowerCase()
  return ext === 'txt' || mime === 'text/plain'
}

function buildResumeContext(profile, resumeText) {
  if (profile && typeof profile === 'object') {
    const location = [profile.city, profile.country].filter(Boolean).join(', ') || ''
    return `Resume profile:
- Name: ${profile.full_name || 'N/A'}
- Email: ${profile.email || 'N/A'}
- Location: ${location || 'N/A'}
- Work experience: ${JSON.stringify(profile.work_experience || [])}
- Education: ${JSON.stringify(profile.education || [])}
- Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : ''}
- Summary: ${profile.summary || ''}`
  }
  return `Resume text:\n${resumeText || ''}`
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[interview-prep] Supabase env missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
      })
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

    let profile = null
    let resumeText = null
    let jobDescription = ''
    let interviewType = 'Mixed'
    let difficulty = 'Mid Level'

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      jobDescription = formData.get('jobDescription')?.toString()?.trim() || ''
      interviewType = formData.get('interviewType')?.toString()?.trim() || 'Mixed'
      difficulty = formData.get('difficulty')?.toString()?.trim() || 'Mid Level'

      if (!jobDescription) return jsonError('Job description is required.', 400)

      if (file && file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        if (isPdf(file)) {
          const pdfData = await pdf(buffer)
          resumeText = pdfData.text?.trim()
        } else if (isWord(file)) {
          const result = await mammoth.extractRawText({ buffer })
          resumeText = result.value?.trim()
        } else if (isTxt(file)) {
          resumeText = buffer.toString('utf-8').trim()
        }
        if (!resumeText) return jsonError('Could not extract text from file.', 400)
      } else {
        return jsonError('Please upload a resume file (PDF, Word, or TXT).', 400)
      }
    } else {
      const body = await request.json()
      profile = body.profile
      resumeText = body.resumeText
      jobDescription = body.jobDescription?.toString()?.trim() || ''
      interviewType = body.interviewType?.toString()?.trim() || 'Mixed'
      difficulty = body.difficulty?.toString()?.trim() || 'Mid Level'

      if (!jobDescription) return jsonError('Job description is required.', 400)
      if (!profile && !resumeText) return jsonError('Either profile or resume text is required.', 400)
    }

    const resumeContext = buildResumeContext(profile, resumeText)
    const prompt = INTERVIEW_PROMPT
      .replace('{resumeContext}', resumeContext)
      .replace('{jobDescription}', jobDescription)
      .replace('{interviewType}', interviewType)
      .replace('{difficulty}', difficulty)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlocks = (message.content || []).filter((b) => b.type === 'text').map((b) => b.text)
    const rawText = textBlocks.join('').trim()
    const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return jsonError('AI returned invalid response. Please try again.', 500)
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 8) : []
    const prepGuide = parsed.prepGuide && typeof parsed.prepGuide === 'object'
      ? {
          topTopics: Array.isArray(parsed.prepGuide.topTopics) ? parsed.prepGuide.topTopics.slice(0, 5) : [],
          keySkills: Array.isArray(parsed.prepGuide.keySkills) ? parsed.prepGuide.keySkills : [],
          questionsToAsk: Array.isArray(parsed.prepGuide.questionsToAsk) ? parsed.prepGuide.questionsToAsk.slice(0, 3) : [],
        }
      : { topTopics: [], keySkills: [], questionsToAsk: [] }

    const insertPayload = {
      user_id: user.id,
      job_description: jobDescription,
      interview_type: interviewType,
      difficulty,
      questions,
      prep_guide: prepGuide,
      answers: [],
    }

    const { data: session, error: insertError } = await supabase
      .from('interview_sessions')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError) {
      console.error('[interview-prep] Supabase save error:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        fullError: JSON.stringify(insertError, Object.getOwnPropertyNames(insertError)),
      })
      return jsonError(`Failed to save interview session: ${insertError.message}`, 500)
    }

    return NextResponse.json({
      sessionId: session.id,
      questions,
      prepGuide,
    })
  } catch (err) {
    console.error('[interview-prep] Error:', err)
    return jsonError(err.message || 'Failed to prepare interview', 500)
  }
}
