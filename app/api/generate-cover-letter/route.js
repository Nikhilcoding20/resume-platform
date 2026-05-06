import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { launchChromiumForPdf } from '@/lib/launchChromiumForPdf'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import mammoth from 'mammoth'
import { createClient } from '@supabase/supabase-js'
import { getUsage, canCreateCoverLetterForUser } from '@/lib/checkUsage'
import { buildPrintableCoverLetterDocument, getCoverLetterPdfFilename } from '@/lib/coverLetterDocument'

const COVER_LETTER_PROMPT = `You are an expert career coach. Write a Harvard style cover letter body with exactly 3 paragraphs. NO paragraph labels, headings, or bold text — just plain professional prose. Paragraph 1: strong opening showing enthusiasm for the specific role and company. Paragraph 2: highlight 2-3 most relevant experiences that match the job. Paragraph 3: explain unique value, why this company, and a professional closing with call to action. Maximum 350 words total. Be concise and impactful. Match keywords from the job description naturally. Return ONLY the 3 paragraphs as plain text, separated by blank lines. No header, no "Dear Hiring Manager", no "Sincerely", no name — only the body paragraphs.`

const HEADER_EXTRACT_PROMPT = `Extract from this resume and return ONLY a valid JSON object with these exact keys: fullName (string), email (string), phone (string), linkedin (string). Use empty string "" for any missing field. No other text, no markdown, no explanation.`

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

function getFileExtension(file) {
  const name = file.name || ''
  const match = name.match(/\.([^.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

function isPdf(file) {
  const ext = getFileExtension(file)
  const mime = (file.type || '').toLowerCase()
  return ext === 'pdf' || mime.includes('pdf')
}

function isWord(file) {
  const ext = getFileExtension(file)
  const mime = (file.type || '').toLowerCase()
  return ['doc', 'docx'].includes(ext) || mime.includes('msword') || mime.includes('wordprocessingml')
}

function isTxt(file) {
  const ext = getFileExtension(file)
  const mime = (file.type || '').toLowerCase()
  return ext === 'txt' || mime === 'text/plain'
}

function buildContext(profile, resumeText) {
  if (profile && typeof profile === 'object') {
    const location = [profile.city, profile.country].filter(Boolean).join(', ') || ''
    return `Resume profile:
- Name: ${profile.full_name || 'N/A'}
- Email: ${profile.email || 'N/A'}
- Phone: ${profile.phone_number || 'N/A'}
- Location: ${location || 'N/A'}
- LinkedIn: ${profile.linkedin_url || 'N/A'}
- Work experience: ${JSON.stringify(profile.work_experience || [])}
- Education: ${JSON.stringify(profile.education || [])}
- Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : ''}
- Summary/other: ${profile.summary || ''}`
  }
  return `Resume text:\n${resumeText}`
}

function getHeaderFromProfile(profile) {
  if (!profile) return { fullName: '', email: '', phone: '', linkedin: '' }
  return {
    fullName: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone_number || '',
    linkedin: profile.linkedin_url || '',
  }
}

async function incrementCoverLetterUsage(supabase, userId) {
  if (!userId) return
  try {
    const { data: usageRows, error: usageError } = await supabase
      .from('user_usage')
      .select('cover_letters_generated')
      .eq('user_id', userId)
      .limit(1)

    if (usageError) {
      console.error('[generate-cover-letter] usage update select error:', usageError)
    }

    const current = usageRows && usageRows.length > 0 ? usageRows[0]?.cover_letters_generated ?? 0 : 0
    await supabase
      .from('user_usage')
      .update({ cover_letters_generated: current + 1 })
      .eq('user_id', userId)

    console.log('[generate-cover-letter] usage increment', { user_id: userId, cover_letters_generated: current + 1 })
  } catch (insertErr) {
    console.error('[generate-cover-letter] Failed to track usage:', insertErr)
  }
}

function limitReachedResponse() {
  return NextResponse.json(
    {
      error: 'limit_reached',
      message: 'You have reached your free cover letter limit. Upgrade to Pro for unlimited cover letters.',
    },
    { status: 403 }
  )
}

function usageCheckFailedResponse() {
  return NextResponse.json(
    { error: 'usage_check_failed', message: 'Unable to verify usage. Please try again.' },
    { status: 503 }
  )
}

/** Runs before file I/O or AI — uses plan-aware limits via canCreateCoverLetterForUser. */
async function ensureCanCreateCoverLetter(supabase, userId) {
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing user context' }, { status: 400 }),
    }
  }
  try {
    const { data: rows, error: selectError } = await supabase
      .from('user_usage')
      .select('resumes_generated, cover_letters_generated')
      .eq('user_id', userId)
      .limit(1)

    if (selectError) {
      console.error('[generate-cover-letter] usage select error:', selectError)
      return { ok: false, response: usageCheckFailedResponse() }
    }

    if (!rows || rows.length === 0) {
      const { error: insertError } = await supabase.from('user_usage').insert({
        user_id: userId,
        resumes_generated: 0,
        cover_letters_generated: 0,
      })
      if (insertError) {
        console.error('[generate-cover-letter] usage init error:', insertError)
        return { ok: false, response: usageCheckFailedResponse() }
      }
    }

    const usage = await getUsage(supabase, userId)
    const usageObj = usage ?? { resumes: 0, coverLetters: 0 }

    const allowed = await canCreateCoverLetterForUser(supabase, userId, usageObj)
    if (!allowed) {
      return { ok: false, response: limitReachedResponse() }
    }

    return { ok: true }
  } catch (e) {
    console.error('[generate-cover-letter] usage check failed:', e)
    return { ok: false, response: usageCheckFailedResponse() }
  }
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      },
    }) : null

    if (!supabase) {
      return jsonError('Server configuration error: Supabase client not initialized', 500)
    }

    const contentType = request.headers.get('content-type') || ''

    let profile = null
    let resumeText = null
    let jobDescription = ''
    let header = { fullName: '', email: '', phone: '', linkedin: '' }
    let responseFormat = 'pdf'

    let userId = null
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      responseFormat = formData.get('responseFormat')?.toString()?.toLowerCase() === 'json' ? 'json' : 'pdf'
      const file = formData.get('file')
      jobDescription = formData.get('jobDescription')?.toString()?.trim() || ''
      userId = formData.get('userId')?.toString()?.trim() || null

      if (!file || !(file instanceof Blob)) {
        return jsonError('No file provided. Please upload a PDF, Word, or TXT file.', 400)
      }
      if (!jobDescription) {
        return jsonError('Job description is required.', 400)
      }
      if (!isPdf(file) && !isWord(file) && !isTxt(file)) {
        return jsonError('Unsupported file type. Please upload PDF, Word (.doc, .docx), or TXT.', 400)
      }

      if (!userId) {
        console.log('[generate-cover-letter] Missing userId in request')
        return NextResponse.json({ error: 'Missing user context' }, { status: 400 })
      }

      const usageGate = await ensureCanCreateCoverLetter(supabase, userId)
      if (!usageGate.ok) return usageGate.response

      if (!process.env.ANTHROPIC_API_KEY) {
        return jsonError('Server configuration error: Anthropic API key is not set', 500)
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      if (isPdf(file)) {
        const pdfData = await pdf(buffer)
        resumeText = pdfData.text?.trim()
      } else if (isWord(file)) {
        const result = await mammoth.extractRawText({ buffer })
        resumeText = result.value?.trim()
      } else {
        resumeText = buffer.toString('utf-8').trim()
      }

      if (!resumeText) {
        return jsonError('Could not extract text from file. The file may be empty or corrupted.', 400)
      }

      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const headerMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 256,
        messages: [{ role: 'user', content: `${HEADER_EXTRACT_PROMPT}\n\n${resumeText.slice(0, 3000)}` }],
      })
      const headerBlocks = (headerMessage.content || []).filter((b) => b.type === 'text').map((b) => b.text)
      const rawHeader = headerBlocks.join('').trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
      try {
        const parsed = JSON.parse(rawHeader)
        header = {
          fullName: parsed.fullName || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          linkedin: parsed.linkedin || '',
        }
      } catch {
        header = { fullName: '', email: '', phone: '', linkedin: '' }
      }
    } else {
      const body = await request.json()
      responseFormat = body.responseFormat === 'json' ? 'json' : 'pdf'
      profile = body.profile
      resumeText = body.resumeText
      jobDescription = body.jobDescription?.trim() || ''
      userId = body.userId || profile?.user_id || null

      if (!jobDescription) {
        return jsonError('Job description is required.', 400)
      }
      if (!profile && !resumeText) {
        return jsonError('Either profile data or resume text is required.', 400)
      }

      if (!userId) {
        console.log('[generate-cover-letter] Missing userId in request')
        return NextResponse.json({ error: 'Missing user context' }, { status: 400 })
      }

      const usageGate = await ensureCanCreateCoverLetter(supabase, userId)
      if (!usageGate.ok) return usageGate.response

      if (!process.env.ANTHROPIC_API_KEY) {
        return jsonError('Server configuration error: Anthropic API key is not set', 500)
      }

      if (profile) {
        header = getHeaderFromProfile(profile)
      }
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const context = buildContext(profile, resumeText)
    const userMessage = `${context}\n\nJob description:\n${jobDescription}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `${COVER_LETTER_PROMPT}\n\n${userMessage}` }],
    })

    const textBlocks = (message.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
    const coverLetterText = textBlocks.join('').trim()

    if (!coverLetterText) {
      return jsonError('AI returned no cover letter', 500)
    }

    const filename = getCoverLetterPdfFilename(header.fullName)

    if (responseFormat === 'json') {
      await incrementCoverLetterUsage(supabase, userId)
      return NextResponse.json({
        filename,
        bodyText: coverLetterText,
        header: {
          fullName: header.fullName,
          email: header.email,
          phone: header.phone,
          linkedin: header.linkedin,
        },
      })
    }

    const html = buildPrintableCoverLetterDocument(header, coverLetterText)
    const browser = await launchChromiumForPdf()

    try {
      const page = await browser.newPage()
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 10000,
      })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
        scale: 0.92,
      })

      await browser.close()

      await incrementCoverLetterUsage(supabase, userId)

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (pdfErr) {
      await browser.close()
      throw pdfErr
    }
  } catch (err) {
    console.error('[generate-cover-letter] Error:', err)
    return jsonError(err.message || 'Failed to generate cover letter', 500)
  }
}
