import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import { launchChromiumForPdf } from '@/lib/launchChromiumForPdf'
import { createClient } from '@supabase/supabase-js'
import { getUsage, canCreateResumeForUser } from '@/lib/checkUsage'
import { persistGeneratedResumeServer } from '@/lib/persistGeneratedResumeServer'

const PROMPT = `You are a professional resume writer and layout designer. Rewrite this person's resume to perfectly match the following job description. Never invent experience that does not exist. Keep all content ATS-friendly. Naturally include important keywords from the job description.

SOURCE DATA — USE EVERYTHING RELEVANT (DO NOT DROP):
- You receive the full resume profile as JSON (built manually or from an uploaded resume). Use every field that is present.
- CONTACT: The profile may include email, phone_number, city, country, linkedin_url, and portfolio_url. Never contradict these in the summary. (The PDF header uses the profile values directly; your job is to keep wording consistent and not omit facts that appear in the profile.)
- EDUCATION: If the profile's "education" array has any entries, you MUST include an "education" array in your JSON with one object per real entry (same count). Each object must use keys: degree (string), institution (string), graduationYear (string). Map from profile fields degreeName → degree, schoolName → institution, graduationYear → graduationYear. You may tighten wording but must not remove a real degree/school/year.
- CERTIFICATIONS: If the profile's "certifications" array has any entries with certificationName, issuer, or year, you MUST include a "certifications" array in your JSON with one object per real entry. Use keys: name (string), issuer (string), year (string). Map certificationName → name. Do not invent certifications.
- SKILLS: Never output skills as one flat comma-separated blob only. Always use "skillGroups" (see JSON schema below): several named categories, each with its own skill list.

RESUME LENGTH & LAYOUT RULES (STRICT — ONE PAGE ONLY):
- The rendered resume MUST fit on exactly ONE standard page (**A4 or US Letter**) assuming approximately **10.5px body text** and **0.6 inch margins** on all sides. Think and write with that fixed “canvas” in mind.
- One page only: **no second page, no overflow.** Never generate enough material for two pages “just in case.”
- Generate **only** as much content as needed to fill **one** page well — no filler, no padded wording, no oversized gaps between sections.
- **No excessive whitespace:** keep sections visually tight; do not imply huge margins or sparse blocks that waste vertical space.
- If length is borderline, **shorten bullets and tighten wording** before dropping roles (while still obeying the max 4 jobs rule). If slightly short, modestly enrich existing bullets — never add extra bullets beyond the per-job cap.

JOB EXPERIENCE RULES:
- If the person has **more than 4 jobs**, include **only the 4 most recent AND most relevant** roles for this job description; drop all others.
- Never show more than **4** roles.
- Each role: **3–4 bullet points maximum** (that is the ceiling — **never 5 or 6 bullets per job**). Prefer **3 strong bullets** when 4 would crowd the page. Use **minimum 2 bullets** only when the source role truly has very little detail.

BULLET POINT RULES - USE CAR METHOD STRICTLY:
- Every bullet must follow CAR: Challenge or Context, Action taken, Result achieved.
- Format: Start with a strong past-tense action verb; describe what you did; end with a measurable result.
- Example: "Redesigned email marketing strategy using Mailchimp automation, reducing churn by 23% and increasing open rates from 18% to 31%"
- Never write vague bullets like "Responsible for managing social media"
- Be specific; include results; start with an action verb.
- If the original resume contains numbers or percentages use them. If none exist, estimate realistic metrics from the role and industry. Never use placeholder text like ADD METRIC.
- Keep each bullet **compact for ~10.5px text**: aim for **about one line** when possible; avoid long multi-line bullets unless essential.

SKILLS SECTION RULES:
- Output "skillGroups" as an array of category objects (see JSON schema). Keep labels **short** and lists **concise** — dense and scannable, not sprawling.
- Across all categories combined: **cap at ~12 skills** unless the profile lists fewer (include all real profile skills that fit the role; do not invent). Prefer fewer, sharper skills over long enumerations.
- Only include skills relevant to the job description when choosing among many; still cover profile skills that fit the role.
- No soft skills like "team player" or "hard worker".
- The skills section must read as tight grouped blocks (category + skills), never a bloated comma-separated paragraph.

SUMMARY RULES:
- **Maximum 3 sentences — never a fourth.** Prefer **exactly 3** crisp sentences.
- Those sentences must stay compact enough for **one page at 10.5px / 0.6in margins** alongside the rest of the resume.
- Mention years of experience, top 2 skills, and one impressive achievement (without adding extra sentences).

OVERALL PAGE COMPOSITION:
- Target **one full page** on **A4/Letter** at **~10.5px body text** and **0.6in margins**: summary, experience, education (when present), certifications (when present), and skillGroups must **all fit** without overflow.
- Use **bullet count (3–4 per job, never more)** and **tight skills** to stay within the canvas — do not rely on tiny fonts or margins; the model must write less, not assume cheating layout.
- If overfilled: remove bullets from less relevant roles first, then shorten wording while keeping CAR and real metrics.
- If underfilled: deepen existing bullets slightly — **never** add a 5th bullet or extra roles.

JSON SCHEMA (STRICT — include every key; use empty arrays where nothing applies):
- summary (string)
- experience (array of objects: title, company, dates, bullets as array of strings)
- skillGroups (array of objects: each has "category" (string) and "skills" (array of strings))
- education (array of objects: degree, institution, graduationYear — required entries whenever profile education exists)
- certifications (array of objects: name, issuer, year — required entries whenever profile certifications exist)

Return ONLY that raw JSON object. Return nothing else.`

const REGENERATE_PROMPT = `You are a professional resume writer. The user has an existing resume and requested specific changes. Apply their feedback to the resume content below. Never invent experience that does not exist. Keep all content ATS-friendly.

You MUST preserve and return the full JSON structure: summary, experience, skillGroups (grouped skills — never a single comma-only blob), education, certifications. Use the profile JSON in the request if you need to restore any education or certification rows that must not be dropped.

ONE-PAGE CONSTRAINTS (same as initial generation): Output must fit **one** standard page (**A4/Letter**) at **~10.5px body text** and **0.6 inch margins**. **Maximum 3 sentences** in summary (never more). **At most 4 jobs**; if more exist in source, keep only the 4 most recent/relevant. **3–4 bullets per job maximum — never 5 or 6.** Keep skillGroups **concise** (fewer, relevant skills; no bloated lists). No excessive whitespace implied by sparse or padded content.

Return ONLY a raw JSON object with these fields: summary (string), experience (array of objects each with title, company, dates, and bullets as array of strings), skillGroups (array of objects each with category string and skills array of strings), education (array of objects each with degree, institution, graduationYear), certifications (array of objects each with name, issuer, year). Use empty arrays for education or certifications only when the user's profile truly has none. Return nothing else.`

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

function formatSkillGroupsHtml(skillGroups) {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) {
    return ''
  }
  return skillGroups
    .map((g) => {
      const items = (g.skills || []).map((s) => escapeHtml(String(s))).join(', ')
      return `<div class="skill-group resume-section" style="margin-bottom: 8px;"><span style="font-weight: bold;">${escapeHtml(g.category || 'Skills')}:</span> ${items}</div>`
    })
    .join('')
}

function normalizeEducationEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const degree = raw.degree ?? raw.degreeName ?? ''
  const institution = raw.institution ?? raw.schoolName ?? raw.school ?? ''
  const graduationYear = raw.graduationYear ?? raw.year ?? ''
  const degreeS = String(degree).trim()
  const institutionS = String(institution).trim()
  const yearS = String(graduationYear).trim()
  if (!degreeS && !institutionS && !yearS) return null
  return { degree: degreeS, institution: institutionS, graduationYear: yearS }
}

function educationKey(entry) {
  return `${entry.institution.toLowerCase()}|${entry.degree.toLowerCase()}`
}

function educationFromProfile(profile) {
  const arr = Array.isArray(profile?.education) ? profile.education : []
  return arr.map(normalizeEducationEntry).filter(Boolean)
}

function mergeEducationFromProfile(parsedList, profile) {
  const profileEdu = educationFromProfile(profile)
  const parsedEdu = (Array.isArray(parsedList) ? parsedList : []).map(normalizeEducationEntry).filter(Boolean)
  if (profileEdu.length === 0) return parsedEdu
  const seen = new Set(parsedEdu.map(educationKey))
  const out = [...parsedEdu]
  for (const row of profileEdu) {
    const k = educationKey(row)
    if (!seen.has(k)) {
      out.push(row)
      seen.add(k)
    }
  }
  return out
}

function normalizeCertEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = raw.name ?? raw.certificationName ?? ''
  const issuer = raw.issuer ?? ''
  const year = raw.year ?? ''
  const nameS = String(name).trim()
  const issuerS = String(issuer).trim()
  const yearS = String(year).trim()
  if (!nameS && !issuerS && !yearS) return null
  return { name: nameS, issuer: issuerS, year: yearS }
}

function certKey(entry) {
  return `${entry.name.toLowerCase()}|${entry.issuer.toLowerCase()}|${entry.year.toLowerCase()}`
}

function certificationsFromProfile(profile) {
  const arr = Array.isArray(profile?.certifications) ? profile.certifications : []
  return arr.map(normalizeCertEntry).filter(Boolean)
}

function mergeCertificationsFromProfile(parsedList, profile) {
  const profileCerts = certificationsFromProfile(profile)
  const parsedCerts = (Array.isArray(parsedList) ? parsedList : []).map(normalizeCertEntry).filter(Boolean)
  if (profileCerts.length === 0) return parsedCerts
  const seen = new Set(parsedCerts.map(certKey))
  const out = [...parsedCerts]
  for (const row of profileCerts) {
    const k = certKey(row)
    if (!seen.has(k)) {
      out.push(row)
      seen.add(k)
    }
  }
  return out
}

function chunkSkillsIntoGroups(skills) {
  if (!Array.isArray(skills) || skills.length === 0) return []
  const labels = ['Technical', 'Tools & platforms', 'Languages & frameworks', 'Other']
  const n = Math.min(4, Math.max(2, Math.ceil(skills.length / 5)))
  const chunkSize = Math.ceil(skills.length / n)
  const out = []
  for (let i = 0; i < n; i++) {
    const slice = skills.slice(i * chunkSize, (i + 1) * chunkSize).filter(Boolean)
    if (slice.length) out.push({ category: labels[i] || `Skills ${i + 1}`, skills: slice })
  }
  return out
}

function normalizeSkillGroups(parsed, profile) {
  let groups = []
  if (Array.isArray(parsed?.skillGroups)) {
    groups = parsed.skillGroups
      .filter((g) => g && typeof g === 'object')
      .map((g) => ({
        category: String(g.category || g.name || 'Skills').trim() || 'Skills',
        skills: (Array.isArray(g.skills) ? g.skills : []).map((s) => String(s).trim()).filter(Boolean),
      }))
      .filter((g) => g.skills.length > 0)
  }
  let flat = groups.flatMap((g) => g.skills)
  if (!flat.length && Array.isArray(parsed?.skills)) {
    flat = parsed.skills.map((s) => String(s).trim()).filter(Boolean)
  }
  if (!flat.length && Array.isArray(profile?.skills)) {
    flat = profile.skills.map((s) => String(s).trim()).filter(Boolean)
  }
  if (!groups.length && flat.length) {
    groups = chunkSkillsIntoGroups(flat)
  }
  return { skillGroups: groups, flatSkills: flat }
}

function formatEducationHtml(items) {
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((e) => {
      const degree = escapeHtml(e.degree || '')
      const inst = escapeHtml(e.institution || '')
      const year = e.graduationYear ? escapeHtml(String(e.graduationYear)) : ''
      const main = [degree, inst].filter(Boolean).join(' — ')
      const yearPart = year ? ` · ${year}` : ''
      return `<div class="education-item resume-section" style="margin-bottom: 8px;"><p style="margin: 0; font-size: 11px;">${main}${yearPart}</p></div>`
    })
    .join('')
}

function formatEducationBlock(items) {
  const inner = formatEducationHtml(items)
  if (!inner) return ''
  return `<div class="resume-education-block resume-section"><h2>Education</h2>${inner}</div>`
}

function formatCertificationsHtml(items) {
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((c) => {
      const name = escapeHtml(c.name || '')
      const issuer = c.issuer ? escapeHtml(c.issuer) : ''
      const year = c.year ? escapeHtml(String(c.year)) : ''
      const mid = [name, issuer].filter(Boolean).join(' — ')
      const tail = year ? ` · ${year}` : ''
      return `<div class="cert-item resume-section" style="margin-bottom: 8px;"><p style="margin: 0; font-size: 11px;">${mid}${tail}</p></div>`
    })
    .join('')
}

function formatCertificationsBlock(items) {
  const inner = formatCertificationsHtml(items)
  if (!inner) return ''
  return `<div class="resume-certifications-block resume-section"><h2>Certifications</h2>${inner}</div>`
}

function formatContactUrlsLine(profile) {
  const parts = []
  if (profile.linkedin_url && String(profile.linkedin_url).trim()) {
    parts.push(`LinkedIn: ${escapeHtml(String(profile.linkedin_url).trim())}`)
  }
  if (profile.portfolio_url && String(profile.portfolio_url).trim()) {
    parts.push(`Website: ${escapeHtml(String(profile.portfolio_url).trim())}`)
  }
  if (!parts.length) return ''
  return `<p style="margin: 4px 0 0 0;" class="contact-line">${parts.join(' · ')}</p>`
}

function formatSidebarUrls(profile) {
  const blocks = []
  if (profile.linkedin_url && String(profile.linkedin_url).trim()) {
    blocks.push(
      `<p style="margin: 0 0 8px 0; font-size: 10pt; line-height: 1.5; word-break: break-all;">LinkedIn<br/>${escapeHtml(String(profile.linkedin_url).trim())}</p>`
    )
  }
  if (profile.portfolio_url && String(profile.portfolio_url).trim()) {
    blocks.push(
      `<p style="margin: 0; font-size: 10pt; line-height: 1.5; word-break: break-all;">Website<br/>${escapeHtml(String(profile.portfolio_url).trim())}</p>`
    )
  }
  return blocks.join('')
}

function normalizeClientResumeContentForRender(clientContent, profile) {
  const summary = String(clientContent?.summary ?? '').trim()

  const experience = (Array.isArray(clientContent?.experience) ? clientContent.experience : [])
    .map((job) => {
      if (!job || typeof job !== 'object') return null
      const title = String(job.title ?? '').trim()
      const company = String(job.company ?? '').trim()
      const dates = String(job.dates ?? '').trim()
      let bullets = job.bullets
      if (typeof bullets === 'string') {
        bullets = bullets.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      } else if (Array.isArray(bullets)) {
        bullets = bullets.map((b) => String(b).trim()).filter(Boolean)
      } else {
        bullets = []
      }
      if (!title && !company && !dates && bullets.length === 0) return null
      return { title, company, dates, bullets }
    })
    .filter(Boolean)

  const education = (Array.isArray(clientContent?.education) ? clientContent.education : [])
    .map((row) => normalizeEducationEntry(row))
    .filter(Boolean)

  const certifications = (Array.isArray(clientContent?.certifications) ? clientContent.certifications : [])
    .map((row) => normalizeCertEntry(row))
    .filter(Boolean)

  const { skillGroups, flatSkills } = normalizeSkillGroups(
    { skillGroups: clientContent?.skillGroups, skills: clientContent?.skills },
    profile
  )

  const location = [profile.city, profile.country].filter(Boolean).join(', ') || ''

  const output = {
    name: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone_number || '',
    location,
    linkedin_url: profile.linkedin_url || '',
    portfolio_url: profile.portfolio_url || '',
    summary,
    experience,
    skillGroups,
    skills: flatSkills,
    education,
    certifications,
  }

  const replacements = {
    '{{name}}': profile.full_name || '',
    '{{email}}': profile.email || '',
    '{{phone}}': profile.phone_number || '',
    '{{location}}': location,
    '{{contact_urls_block}}': formatContactUrlsLine(profile),
    '{{sidebar_urls}}': formatSidebarUrls(profile),
    '{{summary}}': summary,
    '{{experience}}': formatExperienceHtml(experience),
    '{{education_block}}': formatEducationBlock(education),
    '{{certifications_block}}': formatCertificationsBlock(certifications),
    '{{skills}}': formatSkillGroupsHtml(skillGroups),
  }

  return { output, replacements }
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
    const isRegenerate = Boolean(
      !isRenderOnly && feedback && previousContent && typeof previousContent === 'object'
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

    if (isRenderOnly) {
      const { output, replacements: r } = normalizeClientResumeContentForRender(clientResumeContent, profile)
      contentOut = output
      replacements = r
    } else {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      let message
      if (isRegenerate) {
        const resumeContext = JSON.stringify(profile, null, 2)
        const userMessage = `User-requested changes:\n${feedback}\n\nPrevious resume content (JSON):\n${JSON.stringify(previousContent, null, 2)}\n\nResume profile (source of truth for education, certifications, contact URLs — do not drop rows that exist here):\n${resumeContext}\n\nJob description (for context):\n${jobDescription}`
        message = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          messages: [{ role: 'user', content: `${REGENERATE_PROMPT}\n\n${userMessage}` }],
        })
      } else {
        const resumeContext = JSON.stringify(profile, null, 2)
        let userMessage = `Resume profile data:\n${resumeContext}\n\nJob description:\n${jobDescription}`
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

      const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
      let parsed
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        return jsonError('Failed to parse AI response', 500)
      }

      const location = [profile.city, profile.country].filter(Boolean).join(', ') || ''

      const mergedEducation = mergeEducationFromProfile(parsed.education, profile)
      const mergedCertifications = mergeCertificationsFromProfile(parsed.certifications, profile)
      const { skillGroups, flatSkills } = normalizeSkillGroups(parsed, profile)

      contentOut = {
        name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone_number || '',
        location,
        linkedin_url: profile.linkedin_url || '',
        portfolio_url: profile.portfolio_url || '',
        summary: parsed.summary || '',
        experience: parsed.experience || [],
        skillGroups,
        skills: flatSkills,
        education: mergedEducation,
        certifications: mergedCertifications,
      }

      replacements = {
        '{{name}}': profile.full_name || '',
        '{{email}}': profile.email || '',
        '{{phone}}': profile.phone_number || '',
        '{{location}}': location,
        '{{contact_urls_block}}': formatContactUrlsLine(profile),
        '{{sidebar_urls}}': formatSidebarUrls(profile),
        '{{summary}}': parsed.summary || '',
        '{{experience}}': formatExperienceHtml(parsed.experience || []),
        '{{education_block}}': formatEducationBlock(mergedEducation),
        '{{certifications_block}}': formatCertificationsBlock(mergedCertifications),
        '{{skills}}': formatSkillGroupsHtml(skillGroups),
      }
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
