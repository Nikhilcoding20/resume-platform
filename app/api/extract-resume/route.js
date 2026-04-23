import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import { getUsage, canCreateResumeForUser } from '@/lib/checkUsage'

const RESUME_PROMPT = `You are a resume parser. Extract all information from this resume text and return ONLY a valid JSON object with these exact fields: name (string), email (string), phone (string), location (string), summary (string), skills (array of strings), experience (array of objects each with fields title company startDate endDate description), education (array of objects each with fields degree school year). Return absolutely nothing except the raw JSON — no explanation, no markdown, no backticks.`

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

export async function POST(request) {
  console.log('[extract-resume] POST request received')

  try {
    let formData
    try {
      formData = await request.formData()
    } catch (formErr) {
      console.error('[extract-resume] Failed to parse FormData:', formErr)
      return jsonError('Invalid request body. Expected multipart/form-data.', 400)
    }
    const file = formData.get('file')
    const accessToken = formData.get('accessToken')

    console.log('[extract-resume] FormData keys:', [...formData.keys()])
    console.log('[extract-resume] file type:', typeof file, file?.constructor?.name, file instanceof Blob)
    console.log('[extract-resume] accessToken present:', !!accessToken, typeof accessToken)

    if (!file) {
      console.error('[extract-resume] No file in FormData')
      return jsonError('No file provided. Please select a PDF, Word, or TXT file to upload.', 400)
    }
    if (!(file instanceof Blob)) {
      console.error('[extract-resume] file is not a Blob:', typeof file)
      return jsonError('Invalid file format. Expected a PDF, Word, or TXT file.', 400)
    }
    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      console.error('[extract-resume] Missing or invalid access token')
      return jsonError('Authentication required. Please log in again.', 401)
    }

    if (!isPdf(file) && !isWord(file) && !isTxt(file)) {
      console.error('[extract-resume] Unsupported file type:', file.name, file.type)
      return jsonError('Unsupported file type. Please upload a PDF, Word (.doc, .docx), or TXT file.', 400)
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return jsonError(authError?.message || 'Session expired. Please log in again.', 401)
    }
    const usage = await getUsage(supabase, user.id)
    if (!(await canCreateResumeForUser(supabase, user.id, usage))) {
      return NextResponse.json(
        { error: 'You have used your free resume. Please upgrade to continue.' },
        { status: 403 }
      )
    }

    console.log('[extract-resume] Converting file to buffer, size:', file.size, 'type:', file.name)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('[extract-resume] Buffer size:', buffer.length)

    let text
    if (isPdf(file)) {
      console.log('[extract-resume] Extracting text from PDF...')
      try {
        const pdfData = await pdf(buffer)
        text = pdfData.text?.trim()
      } catch (pdfErr) {
        console.error('[extract-resume] PDF parsing failed:', pdfErr)
        return jsonError(
          `Could not read PDF: ${pdfErr.message || 'Invalid or corrupted PDF file'}`,
          400
        )
      }
    } else if (isWord(file)) {
      console.log('[extract-resume] Extracting text from Word document...')
      try {
        const result = await mammoth.extractRawText({ buffer })
        text = result.value?.trim()
      } catch (wordErr) {
        console.error('[extract-resume] Word parsing failed:', wordErr)
        return jsonError(
          `Could not read Word document: ${wordErr.message || 'Invalid or corrupted file. Try saving as .docx.'}`,
          400
        )
      }
    } else {
      console.log('[extract-resume] Reading text file...')
      text = buffer.toString('utf-8').trim()
    }

    if (!text) {
      console.error('[extract-resume] No text extracted from file')
      return jsonError('Could not extract any text from the file. The file may be empty, scanned/image-based, or corrupted.', 400)
    }
    console.log('[extract-resume] Extracted text length:', text.length)

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[extract-resume] ANTHROPIC_API_KEY not configured')
      return jsonError('Server configuration error: Anthropic API key is not set.', 500)
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    console.log('[extract-resume] Sending to Claude...')
    let message
    try {
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: RESUME_PROMPT + '\n\n' + text }],
      })
    } catch (claudeErr) {
      console.error('[extract-resume] Claude API error:', claudeErr)
      return jsonError(
        `AI extraction failed: ${claudeErr.message || 'Could not reach Claude API'}`,
        500
      )
    }

    const textBlocks = (message.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
    const rawText = textBlocks.join('').trim()
    if (!rawText) {
      console.error('[extract-resume] Empty response from Claude')
      return jsonError('AI returned no data. Please try again.', 500)
    }
    console.log('[extract-resume] Claude response length:', rawText.length)

    const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[extract-resume] Failed to parse Claude JSON:', parseErr)
      console.error('[extract-resume] Raw response (first 500 chars):', rawText.slice(0, 500))
      return jsonError('Could not parse extracted resume data. Please try a different file.', 500)
    }

    console.log('[extract-resume] Saving to Supabase...')

    const workExperience = (parsed.experience || []).map((exp) => ({
      jobTitle: exp.title ?? '',
      companyName: exp.company ?? '',
      startDate: exp.startDate ?? '',
      endDate: exp.endDate ?? '',
      description: exp.description ?? '',
    }))

    const education = (parsed.education || []).map((edu) => ({
      degreeName: edu.degree ?? '',
      schoolName: edu.school ?? '',
      graduationYear: edu.year ?? '',
    }))

    const [city, country] = (parsed.location || '').split(',').map((s) => s.trim()).filter(Boolean)
    const payload = {
      user_id: user.id,
      full_name: parsed.name ?? null,
      email: parsed.email ?? null,
      phone_number: parsed.phone ?? null,
      city: city ?? null,
      country: country ?? parsed.location ?? null,
      summary: parsed.summary ?? null,
      work_experience: workExperience,
      education,
      skills: parsed.skills ?? [],
      updated_at: new Date().toISOString(),
    }

    const { error: dbError } = await supabase
      .from('resume_profiles')
      .upsert(payload, { onConflict: 'user_id' })

    if (dbError) {
      console.error('[extract-resume] Supabase upsert error:', dbError)
      return jsonError(`Failed to save profile: ${dbError.message}`, 500)
    }

    console.log('[extract-resume] Success, user:', user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[extract-resume] Unexpected error:', err)
    return jsonError(
      err.message || 'An unexpected error occurred. Please try again.',
      500
    )
  }
}
