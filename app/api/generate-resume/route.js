import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { launchChromiumForPdf } from '@/lib/launchChromiumForPdf'
import { countPdfPages } from '@/lib/countPdfPages'
import { createClient } from '@supabase/supabase-js'
import { getUsage, canCreateResumeForUser } from '@/lib/checkUsage'
import { persistGeneratedResumeServer } from '@/lib/persistGeneratedResumeServer'
import { PROMPT, REGENERATE_PROMPT } from '@/lib/resumeGeneration/prompts'
import {
  parseAiJson,
  normalizeResumeDocument,
  toLegacyContentOut,
  countProfileJobs,
} from '@/lib/resumeGeneration/normalizeResumeDocument'
import { runResumeCritic } from '@/lib/resumeGeneration/criticResume'
import {
  getPdfStyles,
  PDF_MARGIN_IN,
  getPdfMarginIn,
  resolveAtsLayout,
  getDefaultAtsFitAdjustments,
  getTightAtsFitAdjustments,
  buildReplacements,
  fitContentForTemplate,
  applyAtsContentCaps,
  applyModernContentCaps,
  normalizeClientResumeContentForRender,
} from '@/lib/resumeGeneration/renderResumeHtml'

const VALID_TEMPLATES = ['ats', 'modern', 'minimal', 'creative']

/** Modern PDF: zero page margins; spacing comes from cell padding in the template. */
const MODERN_PDF_MARGINS = {
  top: '0in',
  right: '0in',
  bottom: '0in',
  left: '0in',
}

function pdfMarginsForTemplate(template, fitAdjustments = null) {
  if (template === 'modern') return MODERN_PDF_MARGINS
  const m = getPdfMarginIn(template, fitAdjustments)
  return { top: m, right: m, bottom: m, left: m }
}

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

/** PDF overrides for Modern — inline styles carry layout; ensure backgrounds print. */
const MODERN_RESUME_PDF_OVERRIDES = `
<style id="modern-resume-pdf-overrides">
  body.tpl-modern {
    margin: 0 !important;
    padding: 0 !important;
    font-family: Arial, Helvetica, sans-serif !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body.tpl-modern table {
    width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
  }
</style>
`

/** True for templates that share one-page compact HTML + PDF density (ATS baseline extended to minimal/creative; modern uses its own PDF block). */
function usesOnePageCompactFormatters(template) {
  return (
    template === 'modern' ||
    template === 'ats' ||
    template === 'minimal' ||
    template === 'creative'
  )
}

/**
 * PDF overrides for ATS, minimal, and creative (scoped by body.tpl-*).
 * Mirrors the intent of MODERN_RESUME_PDF_OVERRIDES: ~10–10.5px body, 12px section headings, tight line-height.
 */
function getStandardOnePagePdfOverrides(template, fitAdjustments = null) {
  if (!['ats', 'minimal', 'creative'].includes(template)) return ''
  const c = `tpl-${template}`
  let layoutExtra = ''
  if (template === 'ats') {
    const layout = resolveAtsLayout(fitAdjustments)
    layoutExtra = `
  body.${c} .resume-header {
    text-align: left !important;
    margin: 0 0 8pt 0 !important;
  }
  body.${c} h1.resume-name {
    font-size: ${layout.namePt}pt !important;
    text-align: left !important;
    margin: 0 !important;
    font-family: Georgia, 'Times New Roman', Times, serif !important;
  }
  body.${c} .ats-name-rule {
    border-top: 0.5pt solid #000 !important;
    margin: 4pt 0 6pt 0 !important;
  }
  body.${c} .resume-contact {
    text-align: left !important;
    white-space: normal !important;
    margin: 0 !important;
    font-size: 10pt !important;
    font-weight: normal !important;
  }
  body.${c} .resume-section-heading.ats-heading {
    font-size: 11pt !important;
    text-transform: uppercase !important;
    margin: 0 !important;
    padding-bottom: 0 !important;
    border: none !important;
  }
  body.${c} .ats-section-rule {
    border-top: 0.5pt solid #000 !important;
    margin: 2pt 0 ${layout.sectionRuleAfter} !important;
  }
  body.${c} .resume-section-block {
    margin-bottom: ${layout.sectionSpacing} !important;
  }
  body.${c} .experience-item {
    margin-bottom: ${layout.jobBlockSpacing} !important;
  }
  body.${c} .ats-bullet-row {
    margin-bottom: ${layout.bulletGap} !important;
    padding-left: 0.12in !important;
    font-size: ${layout.compactPt}pt !important;
    line-height: ${layout.lineHeight} !important;
  }
  body.${c} .skill-group {
    margin-bottom: 2pt !important;
    font-size: ${layout.compactPt}pt !important;
    line-height: ${layout.lineHeight} !important;
  }
  body.${c} .cert-item p {
    font-size: ${layout.compactPt}pt !important;
    line-height: ${layout.lineHeight} !important;
  }`
  }
  if (template === 'minimal') {
    layoutExtra = `
  body.${c} > div {
    margin-bottom: 10px !important;
    padding-top: 8px !important;
  }
  body.${c} > div:first-child {
    margin-bottom: 8px !important;
    padding-top: 0 !important;
    border: none !important;
  }
  body.${c} > div:last-child {
    margin-bottom: 0 !important;
  }`
  }
  if (template === 'creative') {
    layoutExtra = `
  body.${c} {
    font-size: 10px !important;
    line-height: 1.4 !important;
    padding: 0 !important;
  }
  body.${c} .creative-layout {
    min-height: auto !important;
  }
  body.${c} .creative-left-header {
    padding: 10px 12px !important;
  }
  body.${c} .creative-left-header h1 {
    font-size: 14px !important;
    margin: 0 !important;
    line-height: 1.2 !important;
  }
  body.${c} .creative-left-header .creative-contact-line {
    font-size: 10px !important;
    margin: 6px 0 0 0 !important;
    line-height: 1.4 !important;
  }
  body.${c} .creative-left-body {
    padding: 8px 10px !important;
  }
  body.${c} .creative-col-right {
    padding: 8px 12px !important;
  }
  body.${c} .creative-panel {
    margin-bottom: 6px !important;
    padding-left: 12px !important;
  }
  body.${c} .creative-col-right .resume-education-block,
  body.${c} .creative-col-right .resume-certifications-block {
    margin-bottom: 6px !important;
    padding-left: 12px !important;
  }
  body.${c} p {
    font-size: 10px !important;
    line-height: 1.4 !important;
  }
  body.${c} li {
    font-size: 10px !important;
    line-height: 1.4 !important;
  }
  body.${c} .skill-group {
    font-size: 10px !important;
    line-height: 1.4 !important;
  }
  body.${c} .contact-line {
    line-height: 1.4 !important;
  }
  body.${c} .education-item .edu-row,
  body.${c} .education-item .edu-gpa,
  body.${c} .education-item ul.edu-honors,
  body.${c} .education-item ul.edu-honors li {
    font-size: 10px !important;
    line-height: 1.4 !important;
  }
  body.${c} .education-item .edu-gpa {
    margin: 2px 0 0 0 !important;
  }
  body.${c} .education-item ul.edu-honors {
    margin: 2px 0 0 0 !important;
    padding-left: 14px !important;
  }
  body.${c} .education-item ul.edu-honors li {
    margin-bottom: 1px !important;
  }
  body.${c} .cert-item p {
    font-size: 10px !important;
    line-height: 1.4 !important;
  }
  body.${c} .creative-h2 {
    margin: 0 0 6px 0 !important;
    padding-bottom: 0 !important;
  }
  body.${c} .creative-col-right .resume-education-block > h2,
  body.${c} .creative-col-right .resume-certifications-block > h2 {
    margin: 0 0 6px 0 !important;
    padding-bottom: 0 !important;
  }`
  }

  const atsLayout = template === 'ats' ? resolveAtsLayout(fitAdjustments) : null
  const bodyFont = template === 'ats' ? `${atsLayout.bodyPt}pt` : '10.5px'

  return `
<style id="one-page-${template}-pdf-overrides">
  body.${c} {
    font-size: ${bodyFont} !important;
    line-height: 1.3 !important;
    margin: 0 !important;
    padding: ${template === 'ats' ? '0' : '12px 16px'} !important;
    box-sizing: border-box !important;
  }
  body.${c} h1 {
    font-size: ${template === 'ats' ? `${atsLayout.namePt}pt` : '14px'} !important;
    font-weight: bold !important;
    margin: 0 0 4px 0 !important;
    line-height: 1.2 !important;
    page-break-after: avoid !important;
  }
  body.${c} h2 {
    font-size: 12px !important;
    font-weight: bold !important;
    margin: 8px 0 4px 0 !important;
    padding-bottom: 2px !important;
    line-height: 1.3 !important;
    page-break-after: avoid !important;
  }
  body.${c} p {
    margin-bottom: 6px !important;
    line-height: 1.3 !important;
    font-size: ${bodyFont} !important;
  }
  body.${c} .contact-line {
    font-size: 10px !important;
    line-height: 1.3 !important;
    margin-top: 4px !important;
  }
  body.${c} .experience-item {
    margin-bottom: 4px !important;
    page-break-inside: avoid !important;
  }
  body.${c} .experience-item > p {
    font-size: 10px !important;
    font-weight: bold !important;
    margin: 0 0 4px 0 !important;
    line-height: 1.25 !important;
  }
  body.${c} .resume-bullets.ats-bullets {
    margin: 2px 0 2px 0 !important;
  }
  body.${c} .ats-bullet-row {
    display: flex !important;
    align-items: flex-start !important;
    gap: 0.35em !important;
    margin: 0 0 2px 0 !important;
    padding-left: 0.25in !important;
    line-height: 1.3 !important;
    font-size: ${bodyFont} !important;
  }
  body.${c} .ats-bullet-marker {
    flex-shrink: 0 !important;
    width: 0.35em !important;
  }
  body.${c} .ats-bullet-text {
    flex: 1 !important;
    min-width: 0 !important;
  }
  body.${c} ul {
    margin: 2px 0 2px 0 !important;
    padding-left: 14px !important;
  }
  body.${c} li {
    margin-bottom: 1px !important;
    line-height: 1.3 !important;
    font-size: ${bodyFont} !important;
  }
  body.${c} .education-item .edu-row,
  body.${c} .education-item .edu-gpa,
  body.${c} .education-item ul.edu-honors,
  body.${c} .education-item ul.edu-honors li,
  body.${c} .cert-item p {
    font-size: 10px !important;
    line-height: 1.3 !important;
  }
  body.${c} .education-item .edu-row {
    margin: 0 !important;
  }
  body.${c} .education-item .edu-gpa {
    margin: 2px 0 0 0 !important;
  }
  body.${c} .education-item ul.edu-honors {
    margin: 2px 0 0 0 !important;
    padding-left: 14px !important;
  }
  body.${c} .education-item ul.edu-honors li {
    margin-bottom: 1px !important;
  }
  body.${c} .cert-item p {
    margin-bottom: 4px !important;
  }
  body.${c} .skill-group {
    font-size: ${bodyFont} !important;
    line-height: 1.3 !important;
    margin-bottom: 6px !important;
  }
  body.${c} .resume-section {
    margin-bottom: 6px !important;
  }
  body.${c} .resume-education-block > h2,
  body.${c} .resume-certifications-block > h2 {
    font-size: 12px !important;
    margin: 8px 0 4px !important;
    line-height: 1.3 !important;
  }
  ${layoutExtra}
</style>
`
}

function pdfInjectionForTemplate(template, fitAdjustments = null) {
  if (template === 'modern') return MODERN_RESUME_PDF_OVERRIDES
  return getStandardOnePagePdfOverrides(template, fitAdjustments)
}

/** Inject PDF-only style blocks into <head> — never into body. */
function injectPdfStylesIntoHead(html, ...styleBlocks) {
  const styles = styleBlocks.filter(Boolean).join('\n')
  if (!styles) return html
  const headClose = html.match(/<\/head\s*>/i)
  if (headClose) {
    const idx = html.search(/<\/head\s*>/i)
    return `${html.slice(0, idx)}${styles}${html.slice(idx)}`
  }
  const headOpen = html.match(/<head[^>]*>/i)
  if (headOpen) {
    const idx = headOpen.index + headOpen[0].length
    return `${html.slice(0, idx)}${styles}${html.slice(idx)}`
  }
  return `<!DOCTYPE html><html><head>${styles}</head><body>${html}</body></html>`
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
    const {
      profile,
      jobDescription: bodyJobDescription,
      templateName,
      includeContent,
      feedback,
      previousContent,
      userId,
      renderFromContent,
      resumeContent: clientResumeContent,
      additionalInstructions: bodyAdditionalInstructions,
    } = body

    const isRenderOnly = Boolean(
      renderFromContent && clientResumeContent && typeof clientResumeContent === 'object'
    )

    const jobDescription = typeof bodyJobDescription === 'string' ? bodyJobDescription : ''

    const additionalInstructions =
      typeof bodyAdditionalInstructions === 'string'
        ? bodyAdditionalInstructions
            .replace(/\0/g, '')
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            .trim()
            .slice(0, 12000)
        : ''

    const hasRegenerateChangeRequest =
      (typeof feedback === 'string' && feedback.trim().length > 0) ||
      additionalInstructions.trim().length > 0
    const isRegenerate = Boolean(
      !isRenderOnly &&
      previousContent &&
      typeof previousContent === 'object' &&
      hasRegenerateChangeRequest
    )

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
    if (!isRenderOnly && !jobDescription.trim()) {
      return jsonError('Missing or invalid job description', 400)
    }
    if (!templateName || typeof templateName !== 'string') {
      return jsonError('Missing or invalid template name', 400)
    }

    const template = templateName.replace(/\.html$/, '').toLowerCase()
    if (!VALID_TEMPLATES.includes(template)) {
      return jsonError('Invalid template name', 400)
    }

    if (!isRenderOnly && !process.env.ANTHROPIC_API_KEY) {
      return jsonError('Server configuration error: Anthropic API key is not set', 500)
    }

    const effectiveUserId = userId || profile?.user_id
    if (!effectiveUserId) {
      console.log('[generate-resume] Missing user_id in request body and profile')
      return NextResponse.json({ error: 'Missing user context' }, { status: 400 })
    }

    /** Matches user_usage.user_id (text) and RLS auth.uid()::text */
    const normalizedUserId = String(effectiveUserId)

    let canCreateResumeForUserResult = isRegenerate || isRenderOnly
      ? '[skipped: regenerate or render-only]'
      : !supabase
        ? '[skipped: no supabase client]'
        : null
    let resumeCountBeforeGate = null

    if (!isRegenerate && !isRenderOnly && supabase) {
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
      isRenderOnly,
      canCreateResumeForUser: canCreateResumeForUserResult,
      resumeCountBeforeGate,
    })

    if (!isRegenerate && !isRenderOnly && supabase && canCreateResumeForUserResult === false) {
      return NextResponse.json(
        {
          error: 'FREE_LIMIT_REACHED',
          message:
            "You've used your free resume. Upgrade to generate unlimited resumes tailored to every job.",
        },
        { status: 403 }
      )
    }

    let replacements
    let contentOut
    let document = null

    if (isRenderOnly) {
      const { output, replacements: r, document: renderDoc } = normalizeClientResumeContentForRender(
        clientResumeContent,
        profile,
        template
      )
      contentOut = output
      replacements = r
      document = renderDoc
    } else {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      let message
      if (isRegenerate) {
        const resumeContext = JSON.stringify(profile, null, 2)
        const fb = typeof feedback === 'string' ? feedback.trim() : ''
        const addl = additionalInstructions.trim()
        let changesSection = ''
        if (fb && addl && fb === addl) {
          changesSection = `User-requested changes:\n${fb}`
        } else if (fb && addl) {
          changesSection = `User-requested changes:\n${fb}\n\n---\nAdditional instructions (apply thoroughly; never invent employers, titles, dates, or degrees):\n${addl}`
        } else if (fb) {
          changesSection = `User-requested changes:\n${fb}`
        } else {
          changesSection = `Additional instructions (apply thoroughly; never invent employers, titles, dates, or degrees):\n${addl}`
        }
        const userMessage = `${changesSection}\n\nPrevious resume content (JSON):\n${JSON.stringify(previousContent, null, 2)}\n\nResume profile (source of truth for education, certifications, contact URLs — do not drop rows that exist here):\n${resumeContext}\n\nJob description (for context):\n${jobDescription}`
        message = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          messages: [{ role: 'user', content: `${REGENERATE_PROMPT}\n\n${userMessage}` }],
        })
      } else {
        const resumeContext = JSON.stringify(profile, null, 2)
        const jobCount = countProfileJobs(profile)
        let userMessage = `Resume profile data:\n${resumeContext}\n\nProfile job count for adaptive density tier: ${jobCount}\n\nJob description:\n${jobDescription}`
        if (additionalInstructions) {
          userMessage += `\n\n---\nAdditional instructions from ATS checker (apply thoroughly; never invent employers, titles, dates, or degrees):\n${additionalInstructions}`
        }
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

      let parsed
      try {
        parsed = parseAiJson(rawText)
      } catch {
        return jsonError('Failed to parse AI response', 500)
      }

      const profileForAi = { ...profile, _jobDescription: jobDescription }
      let { document, skillGroups, flatSkills } = normalizeResumeDocument(parsed, profileForAi)

      document = await runResumeCritic(anthropic, document, profileForAi)
      ;({ document, skillGroups, flatSkills } = normalizeResumeDocument(document, profileForAi))

      // Fit AFTER critic pass so restored bullets/skills cannot overflow page 1.
      document = fitContentForTemplate(document, template)
      const atsFitAdjustments = document._fitAdjustments
      ;({ document, skillGroups, flatSkills } = normalizeResumeDocument(document, profileForAi))
      if (template === 'ats') {
        applyAtsContentCaps(document)
        document._fitAdjustments = atsFitAdjustments || getDefaultAtsFitAdjustments()
      }
      if (template === 'modern') {
        applyModernContentCaps(document)
      }

      contentOut = toLegacyContentOut(document, skillGroups, flatSkills)
      replacements = buildReplacements(document, template, { skipFit: true })
    }

    const templatePath = join(process.cwd(), 'public', 'templates', `${template}.html`)
    let templateHtml
    try {
      templateHtml = await readFile(templatePath, 'utf-8')
    } catch {
      return jsonError('Template file not found', 500)
    }

    function fillTemplateWithReplacements(html, reps) {
      let out = html
      for (const [placeholder, value] of Object.entries(reps)) {
        out = out.replaceAll(placeholder, value)
      }
      return out
    }

    function htmlForPdf(reps, fitAdjustments) {
      const filled = fillTemplateWithReplacements(templateHtml, reps)
      return injectPdfStylesIntoHead(
        filled,
        getPdfStyles(template, fitAdjustments),
        pdfInjectionForTemplate(template, fitAdjustments)
      )
    }

    async function generatePdfBuffer(browser, html, fitAdjustments) {
      const page = await browser.newPage()
      try {
        await page.setContent(html, {
          waitUntil: 'networkidle0',
          timeout: 10000,
        })
        return await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: pdfMarginsForTemplate(template, fitAdjustments),
        })
      } finally {
        await page.close()
      }
    }

    let pdfFitAdjustments = template === 'ats' && document ? document._fitAdjustments : null
    if (template === 'ats' && document && !pdfFitAdjustments) {
      pdfFitAdjustments = getDefaultAtsFitAdjustments()
      document._fitAdjustments = pdfFitAdjustments
    }

    let filledHtml = htmlForPdf(replacements, pdfFitAdjustments)

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
      let pdfBuffer
      try {
        pdfBuffer = await generatePdfBuffer(browser, filledHtml, pdfFitAdjustments)

        if (template === 'ats' && document) {
          let pageCount = await countPdfPages(pdfBuffer)
          if (pageCount > 1) {
            console.log('[generate-resume] ATS PDF has', pageCount, 'pages; applying tight layout (0.35in margins, 1.15 line-height)')
            pdfFitAdjustments = getTightAtsFitAdjustments()
            document._fitAdjustments = pdfFitAdjustments
            replacements = buildReplacements(document, template, { skipFit: true })
            filledHtml = htmlForPdf(replacements, pdfFitAdjustments)
            pdfBuffer = await generatePdfBuffer(browser, filledHtml, pdfFitAdjustments)
            pageCount = await countPdfPages(pdfBuffer)
            if (pageCount > 1) {
              console.warn('[generate-resume] ATS PDF still has', pageCount, 'pages after tight layout')
            }
          }
        }
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

      if (!isRegenerate && !isRenderOnly && supabase) {
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

      const persistClient = supabaseService ?? supabase
      if (supabase && persistClient && normalizedUserId) {
        const persisted = await persistGeneratedResumeServer(persistClient, {
          userId: normalizedUserId,
          pdfBuffer: buffer,
          template,
          jobDescription,
        })
        if (!persisted.ok) {
          console.warn('[generate-resume] generated_resumes persist skipped or failed:', persisted.error || '')
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
        // Note: dataLayer is client-side only — fire resume_generated on the frontend result page instead.
        return NextResponse.json({
          pdfBase64,
          filename,
          content: contentOut,
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
