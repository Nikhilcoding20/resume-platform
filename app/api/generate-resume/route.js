import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { launchChromiumForPdf } from '@/lib/launchChromiumForPdf'
import { createClient } from '@supabase/supabase-js'
import { getUsage, canCreateResumeForUser } from '@/lib/checkUsage'

const PROMPT = `You are a professional resume writer and layout designer. Rewrite this person's resume to perfectly match the following job description. Never invent experience that does not exist. Keep all content ATS-friendly. Naturally include important keywords from the job description.

RESUME LENGTH & LAYOUT RULES (STRICT):
- The resume must fill exactly 1 full A4 page — not more, not less.
- There must be no overflow onto a second page under any circumstance.
- There must be no large empty white space at the bottom of the page.
- Treat the resume like a visual canvas that should be filled in a balanced, intentional, professional way.
- If content is too short, expand bullet points with more specific detail, context, and realistic metrics based on the role and industry.
- If content is too long, trim bullet points first, then trim older job descriptions, until the content comfortably fits on one A4 page.

JOB EXPERIENCE RULES:
- Show maximum 4 most recent and relevant jobs only.
- If person has more than 4 jobs, drop the oldest ones that are least relevant to the job description.
- Each job must have maximum 4 bullet points, minimum 2 bullet points. Never exceed 4 bullet points per job under any circumstance.

BULLET POINT RULES - USE CAR METHOD STRICTLY:
- Every single bullet point must follow CAR method: Challenge or Context, Action taken, Result achieved.
- Format: Start with strong past tense action verb, describe what you did, end with measurable result.
- Example: "Redesigned email marketing strategy using Mailchimp automation, reducing churn by 23% and increasing open rates from 18% to 31%"
- Never write vague bullets like "Responsible for managing social media"
- Always be specific, always include a result, always start with an action verb.
- If the original resume contains numbers or percentages use them. If no numbers exist, estimate realistic and believable metrics based on the job title, industry, and responsibilities. Never use placeholder text like ADD METRIC.
- Each bullet point should be written so that it is roughly 1.5 to 2 lines of text at normal resume font size — not too short and not an overly long paragraph.

SKILLS SECTION RULES:
- Maximum 15 skills, minimum 8 skills.
- Only include skills directly relevant to the job description.
- No soft skills like "team player" or "hard worker".
- The skills section should contain enough skills to visually fill the skills line/row without leaving large empty gaps.

SUMMARY RULES:
- Exactly 3 sentences (no more, no fewer).
- These 3 sentences together should visually fill most of the summary space without being tiny or oversized.
- Must mention years of experience, top 2 skills, and one impressive achievement.

OVERALL PAGE COMPOSITION:
- Aim for a perfectly balanced full-page resume: summary, experience, and skills together should fill a single A4 page in a way that looks intentional and professional.
- Use the amount of detail in bullet points and the number of bullets to control how full the page is.
- If the page still feels under-filled, prefer enriching existing bullet points with specific tools, platforms, and measurable outcomes from the candidate's real background (never inventing new roles).
- If the page feels overfilled, first reduce bullet point count for less relevant roles, then trim wording while preserving CAR structure and metrics.

Return ONLY a raw JSON object with these fields: summary (string), experience (array of objects each with title, company, dates, and bullets as array of strings), skills (array of strings). Return nothing else.`

const REGENERATE_PROMPT = `You are a professional resume writer. The user has an existing resume and requested specific changes. Apply their feedback to the resume content below. Never invent experience that does not exist. Keep all content ATS-friendly. Preserve the same JSON structure.

Return ONLY a raw JSON object with these fields: summary (string), experience (array of objects each with title, company, dates, and bullets as array of strings), skills (array of strings). Return nothing else.`

const VALID_TEMPLATES = ['ats', 'modern', 'minimal', 'creative']

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

const PDF_STYLES = `
<style>
  html, body, body * {
    font-family: 'Calibri', 'Trebuchet MS', sans-serif !important;
  }
  body { font-size: 11px !important; line-height: 1.5 !important; margin: 0 !important; padding: 0 !important; }
  body > div:first-child, body > header, body header { text-align: center !important; }
  h1 { font-size: 14px !important; font-weight: bold !important; page-break-after: avoid; margin-bottom: 4px !important; }
  h1 + p, header p, .contact-line { font-size: 11px !important; line-height: 1.5 !important; }
  h2 { font-size: 12px !important; font-weight: bold !important; border-bottom: 1px solid currentColor !important; padding-bottom: 4px !important; margin: 12px 0 12px 0 !important; page-break-after: avoid; }
  h2:first-of-type { margin-top: 0 !important; }
  .resume-section { margin-bottom: 12px !important; page-break-inside: avoid; }
  .experience-item { margin-bottom: 12px !important; page-break-inside: avoid; }
  p, li { line-height: 1.5 !important; }
  p { margin-bottom: 12px !important; }
  ul { margin: 6px 0 12px 0 !important; padding-left: 24px !important; }
  li { margin-bottom: 6px !important; line-height: 1.5 !important; }
</style>
`

function formatExperienceHtml(experience) {
  if (!Array.isArray(experience) || experience.length === 0) {
    return '<p class="resume-section">No experience listed.</p>'
  }
  return experience
    .map((job) => {
      const bullets = (job.bullets || [])
        .map((b) => `<li>${escapeHtml(b)}</li>`)
        .join('')
      const dates = job.dates || ''
      return `
        <div class="experience-item resume-section">
          <p style="margin: 0 0 6px 0; font-weight: bold; font-size: 11px;">${escapeHtml(job.title || '')} at ${escapeHtml(job.company || '')}${dates ? ` | ${escapeHtml(dates)}` : ''}</p>
          ${bullets ? `<ul>${bullets}</ul>` : ''}
        </div>
      `
    })
    .join('')
}

function formatSkillsHtml(skills) {
  if (!Array.isArray(skills) || skills.length === 0) {
    return ''
  }
  return skills.map((s) => escapeHtml(String(s))).join(', ')
}

function escapeHtml(text) {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Service role client for user_usage insert/update only (bypasses RLS). */
function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key?.trim()) return null
  return createClient(url, key.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request) {
  try {
    const authorizationHeader = request.headers.get('Authorization')
    const body = await request.json()
    const { profile, jobDescription, templateName, includeContent, feedback, previousContent, userId } = body
    const isRegenerate = Boolean(feedback && previousContent && typeof previousContent === 'object')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorizationHeader || '',
        },
      },
    }) : null

    const supabaseService = createSupabaseServiceRoleClient()

    let authUser = null
    let authUserError = null
    if (supabase) {
      const authRes = await supabase.auth.getUser()
      authUser = authRes.data?.user ?? null
      authUserError = authRes.error ?? null
    }

    if (!profile || typeof profile !== 'object') {
      return jsonError('Missing or invalid profile data', 400)
    }
    if (!jobDescription || typeof jobDescription !== 'string') {
      return jsonError('Missing or invalid job description', 400)
    }
    if (!templateName || typeof templateName !== 'string') {
      return jsonError('Missing or invalid template name', 400)
    }

    const template = templateName.replace(/\.html$/, '').toLowerCase()
    if (!VALID_TEMPLATES.includes(template)) {
      return jsonError('Invalid template name', 400)
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonError('Server configuration error: Anthropic API key is not set', 500)
    }

    const effectiveUserId = userId || profile?.user_id
    if (!effectiveUserId) {
      console.log('[generate-resume] Missing user_id in request body and profile')
      return NextResponse.json({ error: 'Missing user context' }, { status: 400 })
    }

    /** Matches user_usage.user_id (text) and RLS auth.uid()::text */
    const normalizedUserId = String(effectiveUserId)

    let canCreateResumeForUserResult = isRegenerate
      ? '[skipped: regenerate]'
      : !supabase
        ? '[skipped: no supabase client]'
        : null
    let resumeCountBeforeGate = null

    if (!isRegenerate && supabase) {
      try {
        if (!supabaseService) {
          console.warn(
            '[generate-resume] SUPABASE_SERVICE_ROLE_KEY missing; user_usage bootstrap upsert uses JWT client (RLS may block)'
          )
        }
        const usageMutateClient = supabaseService ?? supabase

        const upsertRes = await usageMutateClient
          .from('user_usage')
          .upsert(
            {
              user_id: normalizedUserId,
              resumes_generated: 0,
              cover_letters_generated: 0,
            },
            { onConflict: 'user_id', ignoreDuplicates: true }
          )
          .select()

        console.log('[generate-resume] user_usage bootstrap upsert full Supabase response', {
          client: supabaseService ? 'service_role' : 'user_jwt',
          data: upsertRes.data,
          error: upsertRes.error,
          status: upsertRes.status,
          statusText: upsertRes.statusText,
          fullResponse: upsertRes,
        })
        if (upsertRes.error) {
          console.error('[generate-resume] usage row bootstrap upsert error:', upsertRes.error)
        }

        const usage = await getUsage(supabase, normalizedUserId)
        resumeCountBeforeGate = usage?.resumes ?? null
        const allowed = await canCreateResumeForUser(supabase, normalizedUserId, usage)
        canCreateResumeForUserResult = allowed
      } catch (usageErr) {
        console.error('[generate-resume] usage gate failed:', usageErr)
        canCreateResumeForUserResult = {
          gateThrew: true,
          message: usageErr?.message ?? String(usageErr),
        }
      }
    }

    console.log('[generate-resume] POST top diagnostic', {
      authorizationHeader,
      user: authUser,
      authUserError,
      canCreateResumeForUser: canCreateResumeForUserResult,
      resumeCountBeforeGate,
    })

    if (!isRegenerate && supabase && canCreateResumeForUserResult === false) {
      return NextResponse.json(
        {
          error: 'FREE_LIMIT_REACHED',
          message:
            "You've used your free resume. Upgrade to generate unlimited resumes tailored to every job.",
        },
        { status: 403 }
      )
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let message
    if (isRegenerate) {
      const userMessage = `User-requested changes:\n${feedback}\n\nPrevious resume content (JSON):\n${JSON.stringify(previousContent, null, 2)}\n\nJob description (for context):\n${jobDescription}`
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: `${REGENERATE_PROMPT}\n\n${userMessage}` }],
      })
    } else {
      const resumeContext = JSON.stringify(profile, null, 2)
      const userMessage = `Resume profile data:\n${resumeContext}\n\nJob description:\n${jobDescription}`
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: `${PROMPT}\n\n${userMessage}` }],
      })
    }

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

    const location = [profile.city, profile.country].filter(Boolean).join(', ') || ''

    const replacements = {
      '{{name}}': profile.full_name || '',
      '{{email}}': profile.email || '',
      '{{phone}}': profile.phone_number || '',
      '{{location}}': location,
      '{{summary}}': parsed.summary || '',
      '{{experience}}': formatExperienceHtml(parsed.experience || []),
      '{{skills}}': formatSkillsHtml(parsed.skills || []),
    }

    const templatePath = join(process.cwd(), 'public', 'templates', `${template}.html`)
    let templateHtml
    try {
      templateHtml = await readFile(templatePath, 'utf-8')
    } catch {
      return jsonError('Template file not found', 500)
    }

    let filledHtml = templateHtml
    for (const [placeholder, value] of Object.entries(replacements)) {
      filledHtml = filledHtml.replaceAll(placeholder, value)
    }

    filledHtml = filledHtml.replace(
      '</head>',
      `${PDF_STYLES}</head>`
    )

    const filename = (() => {
      const name = (profile.full_name || '').trim()
      if (!name) return 'resume.pdf'
      const parts = name.split(/\s+/).filter(Boolean)
      const sanitized = parts.map((p) => p.replace(/[^a-zA-Z0-9-]/g, '')).filter(Boolean)
      const base = sanitized.length >= 2
        ? `${sanitized[0]}_${sanitized.slice(1).join('_')}`
        : sanitized[0] || 'resume'
      return `${base}_resume.pdf`
    })()

    let browser
    try {
      browser = await launchChromiumForPdf()
    } catch (launchErr) {
      console.error('[generate-resume] Chromium launch failed:', launchErr)
      return jsonError('PDF engine failed to start', 500)
    }

    try {
      const page = await browser.newPage()
      await page.setContent(filledHtml, {
        waitUntil: 'networkidle0',
        timeout: 10000,
      })

      let pdfBuffer
      try {
        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0.6in', right: '0.6in', bottom: '0.6in', left: '0.6in' },
        })
      } catch (pdfErr) {
        console.error('[generate-resume] page.pdf() failed:', pdfErr)
        throw new Error('PDF generation failed')
      } finally {
        await browser.close().catch((e) => console.error('[generate-resume] browser.close:', e))
      }

      const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer)
      if (!buffer || buffer.length === 0) {
        console.error('[generate-resume] PDF buffer is empty')
        return jsonError('Generated PDF is empty', 500)
      }
      const pdfMagic = buffer.slice(0, 5).toString('utf-8')
      if (pdfMagic !== '%PDF-') {
        console.error('[generate-resume] Invalid PDF magic bytes:', pdfMagic)
        return jsonError('Generated PDF is invalid', 500)
      }

      if (!isRegenerate && supabase) {
        try {
          if (!supabaseService) {
            console.warn(
              '[generate-resume] SUPABASE_SERVICE_ROLE_KEY missing; user_usage update uses JWT client (RLS may block)'
            )
          }
          const usageMutateClient = supabaseService ?? supabase

          const { data: usageRows, error: usageError } = await supabase
            .from('user_usage')
            .select('resumes_generated')
            .eq('user_id', normalizedUserId)
            .limit(1)

          if (usageError) {
            console.error('[generate-resume] usage update select error:', usageError)
          }

          const current = usageRows && usageRows.length > 0 ? usageRows[0]?.resumes_generated ?? 0 : 0
          const nextCount = current + 1
          const updateRes = await usageMutateClient
            .from('user_usage')
            .update({ resumes_generated: nextCount })
            .eq('user_id', normalizedUserId)
            .select('resumes_generated')

          console.log('[generate-resume] user_usage update (increment) full Supabase response', {
            client: supabaseService ? 'service_role' : 'user_jwt',
            data: updateRes.data,
            error: updateRes.error,
            status: updateRes.status,
            statusText: updateRes.statusText,
            fullResponse: updateRes,
          })

          if (updateRes.error) {
            console.error('[generate-resume] usage increment update error:', updateRes.error)
          }

          console.log('[generate-resume] usage increment summary', {
            userId: normalizedUserId,
            previousCount: current,
            resumes_generated: nextCount,
            rowsUpdated: Array.isArray(updateRes.data) ? updateRes.data.length : 0,
          })
        } catch (insertErr) {
          console.error('[generate-resume] Failed to track generated resume:', insertErr)
        }
      }

      if (includeContent) {
        let pdfBase64
        try {
          pdfBase64 = buffer.toString('base64')
        } catch (encodeErr) {
          console.error('[generate-resume] Buffer to base64 failed:', encodeErr)
          return jsonError('Failed to encode PDF', 500)
        }
        if (!pdfBase64 || typeof pdfBase64 !== 'string') {
          console.error('[generate-resume] base64 string is empty or invalid')
          return jsonError('Failed to encode PDF', 500)
        }
        const content = {
          name: profile.full_name || '',
          summary: parsed.summary || '',
          experience: parsed.experience || [],
          skills: parsed.skills || [],
        }
        return NextResponse.json({
          pdfBase64,
          filename,
          content,
        })
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(buffer.length),
        },
      })
    } catch (pdfErr) {
      if (browser) {
        await browser.close().catch((e) => console.error('[generate-resume] browser.close (on error):', e))
      }
      console.error('[generate-resume] PDF generation error:', pdfErr)
      throw pdfErr
    }
  } catch (err) {
    console.error('[generate-resume] Error:', err)
    return jsonError(err.message || 'Failed to generate resume', 500)
  }
}
