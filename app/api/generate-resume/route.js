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
- EDUCATION: If the profile's "education" array has any entries, you MUST include an "education" array in your JSON with one object per real entry (same count). Each object must use keys: **institution** (string), **degree** (string), **graduationYear** (string), **location** (optional string — school city/state/country or campus location **only** if it appears in the profile or verifiable resume source; never invent), **gpa** (optional string — **include only** if the user/profile **explicitly** provided a GPA; never infer, estimate, or copy from a job posting), **honors** (optional array of strings — Dean's List, scholarships, cum laude, etc. **only** if explicitly provided; otherwise omit or use []). Map profile fields degreeName → degree, schoolName → institution, graduationYear → graduationYear; map schoolLocation/city/location → location when present. You may tighten wording but must not remove a real degree/school/year.
- CERTIFICATIONS: If the profile's "certifications" array has any entries with certificationName, issuer, or year, you MUST include a "certifications" array in your JSON with one object per real entry. Use keys: name (string), issuer (string), year (string). Map certificationName → name. Do not invent certifications.
- SKILLS: Never output skills as one flat comma-separated blob only. Always use "skillGroups" (see JSON schema below): several named categories, each with its own skill list.

RESUME LENGTH, ONE PAGE & PAGE FILL (STRICT — ADAPTIVE):
- The rendered resume MUST fit on **exactly ONE** standard page (**A4 or US Letter**) at approximately **10.5px body text** and **0.6 inch margins**. **Never overflow to page 2.** There is no second page.
- **Page fill:** Aim to use **90–100%** of that one-page canvas with substantive content. **Never leave more than ~10%** of the page empty (no large bare band at the bottom). If the layout would look sparse, add detail (metrics, tools, scope, outcomes). If bullets are getting long and risk overflow, shorten them. **Estimate content length** as you write and adjust bullet verbosity, line count, and summary length accordingly.
- **Overflow trim order (if still too long for one page):** (1) **Remove the oldest job first** among the roles you are showing (only when more than one job remains — never delete the candidate’s sole role); (2) **shorten bullets** on the remaining jobs (fewer words, fewer lines, fewer bullets within the tier’s allowed range); (3) **shorten the summary last** (fewer sentences within the tier’s allowed range). Still **never invent** employers, titles, dates, degrees, or certifications.

JOB COUNT → DENSITY TIER (apply to the profile’s employment / experience — count **distinct jobs** the person has):
- **If the profile has 1–2 jobs:** For each job on the resume, write **4–5 bullets**; each bullet **2–3 lines** at ~10.5px. **Summary: exactly 4 sentences.** **Skills:** **15+** items total across skillGroups (unless the profile has fewer real skills — include all that fit; do not invent).
- **If the profile has 3–4 jobs:** For each job, write **3–4 bullets**; each bullet **1–2 lines**. **Summary: 3 sentences.** **Skills:** **12–15** items total across skillGroups (same caveat on real profile skills).
- **If the profile has 5+ jobs:** Include **only the 4 most recent AND most relevant** roles for the job description. For each shown job, write **2–3 bullets**; each bullet **1 line maximum**. **Summary: 2–3 sentences.** **Skills:** **10–12** items total across skillGroups (same caveat).

ADAPTIVE BALANCING (within the chosen tier):
- Stay inside the tier’s bullet counts, line-length bounds, summary sentence range, and skill totals while hitting **~90–100% fill** and **zero overflow**. When space is tight, prefer **shorter bullets** and the **lower** end of each range; when the page would be under-filled, prefer the **upper** end (more bullets within range, longer lines within range, richer summary within range).

JOB EXPERIENCE RULES:
- **Never show more than 4 roles** on the resume. If the profile has **more than 4 jobs**, keep only the **4 most recent and most relevant** (this matches the **5+** tier above).
- If the profile has **1–4 jobs**, output that many roles (up to 4) — do not invent extra employers to pad the page.
- Bullet counts and line length per job **must follow the tier** tied to the profile’s job count (see JOB COUNT → DENSITY TIER).

BULLET POINT RULES — CAR WITH QUANTIFIED RESULTS (tier sets length; CAR is always required):
- Every bullet MUST follow CAR: Challenge or Context, Action taken, Result — and the Result MUST be **quantified** (number, %, $, time delta, scale, or magnitude) where truthful; if the source lacks numbers, use **realistic, defensible** estimates from the role and industry. Never use placeholder text like ADD METRIC.
- Name **specific tools, technologies, platforms, or methodologies** and **business impact** when space allows; in the **5+** tier (1-line bullets), compress to the essentials while still including at least one quantified outcome where possible.
- Format: strong past-tense action verb; substantive clauses — no vague lines like "Responsible for managing social media."
- **Line length and bullet count:** obey the active tier (1–2 jobs vs 3–4 vs 5+). Do not exceed **1 line per bullet** in the 5+ tier.

SKILLS SECTION RULES:
- Output "skillGroups" as an array of category objects (see JSON schema). Keep labels **short** and lists **scannable**. Use **multiple named categories** (e.g., Technical, Tools & Platforms, Languages & Frameworks, Methodologies).
- **Total skills across all groups:** follow the active tier (**15+** / **12–15** / **10–12**). If the profile lists fewer real skills than the tier minimum, include every real skill that fits the role and do not invent the rest.
- Only include skills relevant to the job description when choosing among many; still cover profile skills that fit the role.
- No soft skills like "team player" or "hard worker".
- Never output skills as one flat comma-separated blob only; use grouped blocks.

SUMMARY RULES (sentence count = tier):
- **1–2 jobs in profile:** **4 sentences.** **3–4 jobs:** **3 sentences.** **5+ jobs:** **2–3 sentences.**
- Every sentence must earn its space: years/scope, top skills aligned to the job, standout achievement with **metrics where truthful**, and role/career fit — no generic fluff.
- The summary must fit **one page** together with all other sections; if trimming is needed after jobs and bullets, shorten the summary **last** (per overflow trim order above).

JSON SCHEMA (STRICT — include every key; use empty arrays where nothing applies):
- summary (string)
- experience (array of objects: title, company, dates, bullets as array of strings)
- skillGroups (array of objects: each has "category" (string) and "skills" (array of strings))
- education (array of objects: degree, institution, graduationYear, optional location string, optional gpa string only if user-provided, optional honors array of strings only if user-provided — required entries whenever profile education exists)
- certifications (array of objects: name, issuer, year — required entries whenever profile certifications exist)

Return ONLY that raw JSON object. Return nothing else.`

const REGENERATE_PROMPT = `You are a professional resume writer. The user has an existing resume and requested specific changes. Apply their feedback to the resume content below. Never invent experience that does not exist. Keep all content ATS-friendly.

You MUST preserve and return the full JSON structure: summary, experience, skillGroups (grouped skills — never a single comma-only blob), education, certifications. Use the profile JSON in the request if you need to restore any education or certification rows that must not be dropped. For each education object include **degree**, **institution**, **graduationYear**, optional **location** if present in the profile/source, optional **gpa** only when the user/profile explicitly provided a GPA (never invent), and optional **honors** (array of strings) only when explicitly provided.

ONE-PAGE & ADAPTIVE DENSITY (same logic as initial generation — apply STRICTLY):
- Output must fit **exactly one** standard page (**A4/Letter**) at **~10.5px body text** and **0.6 inch margins**. **Never overflow to page 2.**
- **Page fill:** Aim for **90–100%** of the page with real content; **never more than ~10%** empty at the bottom. Estimate length as you revise: if bullets are too long, shorten; if sparse, add substantive detail within the tier.
- **Overflow trim order:** (1) remove the **oldest** shown job first (only when more than one job remains); (2) **shorten bullets** on remaining jobs; (3) **shorten the summary last**. Never invent employers, titles, dates, degrees, or certifications.
- **Count jobs** in the profile (or in the resume JSON you are editing — use the **source-of-truth profile** job count for tier selection). Apply one tier:
  - **1–2 jobs:** **4–5 bullets** per job, **2–3 lines** each; summary **4 sentences**; skills **15+** across skillGroups (unless profile has fewer real skills).
  - **3–4 jobs:** **3–4 bullets** per job, **1–2 lines** each; summary **3 sentences**; skills **12–15**.
  - **5+ jobs:** Show **only the 4 most recent/relevant** roles; **2–3 bullets** per job, **1 line max** per bullet; summary **2–3 sentences**; skills **10–12**.
- **Never more than 4 roles** on the resume. Bullets per job, line length, summary length, and skill totals **must match the tier** while balancing **90–100% fill** and **zero overflow**.
- Every bullet: **CAR** with **quantified result** where possible; name **tools** and **business impact** when space allows (compress in the 5+ / 1-line tier).

Return ONLY a raw JSON object with these fields: summary (string), experience (array of objects each with title, company, dates, and bullets as array of strings), skillGroups (array of objects each with category string and skills array of strings), education (array of objects each with degree, institution, graduationYear, optional location, optional gpa only if explicitly user-provided, optional honors array), certifications (array of objects each with name, issuer, year). Use empty arrays for education or certifications only when the user's profile truly has none. Return nothing else.`

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
  .education-item .edu-row { box-sizing: border-box !important; }
  .education-item .edu-gpa { margin: 2px 0 0 0 !important; }
  .education-item ul.edu-honors { margin: 4px 0 0 0 !important; padding-left: 18px !important; }
  .education-item ul.edu-honors li { margin-bottom: 2px !important; }
</style>
`

/** PDF-only overrides for modern template (global PDF_STYLES target 11px). */
const MODERN_RESUME_PDF_OVERRIDES = `
<style id="modern-resume-pdf-overrides">
  body {
    font-size: 10px !important;
    line-height: 1.35 !important;
  }
  body > div:first-child {
    width: 168px !important;
    max-width: 168px !important;
    padding: 18px 10px 14px !important;
    box-sizing: border-box !important;
  }
  body > div:first-child h1 {
    font-size: 14px !important;
    line-height: 1.2 !important;
    margin: 0 0 8px 0 !important;
  }
  body > div:first-child p {
    font-size: 10px !important;
    line-height: 1.35 !important;
    margin: 0 0 5px 0 !important;
  }
  body > div:nth-child(2).modern-main {
    padding: 18px 16px !important;
    box-sizing: border-box !important;
  }
  .modern-main > h2,
  .modern-main .resume-education-block > h2,
  .modern-main .resume-certifications-block > h2 {
    font-size: 12px !important;
    margin: 8px 0 4px 0 !important;
    padding-bottom: 3px !important;
    line-height: 1.2 !important;
    color: #2563eb !important;
    border-bottom-color: #2563eb !important;
  }
  .modern-main > p,
  .modern-main .resume-education-block,
  .modern-main .resume-certifications-block {
    font-size: 10px !important;
  }
  .modern-main .experience-item {
    margin-bottom: 4px !important;
    page-break-inside: avoid !important;
  }
  .modern-main .experience-item > p {
    font-size: 10px !important;
    font-weight: bold !important;
    margin: 0 0 3px 0 !important;
    line-height: 1.25 !important;
  }
  .modern-main .experience-item ul {
    margin: 1px 0 2px 0 !important;
    padding-left: 13px !important;
  }
  .modern-main .experience-item li {
    margin-bottom: 1px !important;
    line-height: 1.25 !important;
    font-size: 10px !important;
  }
  .modern-main .education-item .edu-row,
  .modern-main .education-item .edu-gpa,
  .modern-main .education-item ul.edu-honors,
  .modern-main .education-item ul.edu-honors li,
  .modern-main .cert-item p {
    font-size: 10px !important;
    line-height: 1.25 !important;
    margin-bottom: 0 !important;
  }
  .modern-main .education-item .edu-gpa {
    margin: 2px 0 0 0 !important;
  }
  .modern-main .education-item ul.edu-honors {
    margin: 2px 0 0 0 !important;
    padding-left: 13px !important;
  }
  .modern-main .education-item ul.edu-honors li {
    margin-bottom: 1px !important;
  }
  .modern-main .cert-item p {
    margin-bottom: 3px !important;
  }
  .modern-main .skill-group {
    font-size: 10px !important;
    line-height: 1.35 !important;
  }
  .modern-main .resume-section {
    margin-bottom: 6px !important;
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
function getStandardOnePagePdfOverrides(template) {
  if (!['ats', 'minimal', 'creative'].includes(template)) return ''
  const c = `tpl-${template}`
  let layoutExtra = ''
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

  return `
<style id="one-page-${template}-pdf-overrides">
  body.${c} {
    font-size: 10.5px !important;
    line-height: 1.3 !important;
    margin: 0 !important;
    padding: 12px 16px !important;
    box-sizing: border-box !important;
  }
  body.${c} h1 {
    font-size: 14px !important;
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
    font-size: 10.5px !important;
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
  body.${c} ul {
    margin: 2px 0 2px 0 !important;
    padding-left: 14px !important;
  }
  body.${c} li {
    margin-bottom: 1px !important;
    line-height: 1.3 !important;
    font-size: 10.5px !important;
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
    font-size: 10.5px !important;
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

function pdfInjectionForTemplate(template) {
  if (template === 'modern') return MODERN_RESUME_PDF_OVERRIDES
  return getStandardOnePagePdfOverrides(template)
}

function formatExperienceHtml(experience, template = '') {
  const compact = usesOnePageCompactFormatters(template)
  const titleFs = compact ? '10px' : '11px'
  const titleMb = compact ? '3px' : '6px'
  const liMb = compact ? '2px' : '6px'
  const liLh = compact ? '1.3' : '1.5'
  if (!Array.isArray(experience) || experience.length === 0) {
    return '<p class="resume-section">No experience listed.</p>'
  }
  return experience
    .map((job) => {
      const bullets = (job.bullets || [])
        .map((b) => `<li style="margin-bottom: ${liMb}; line-height: ${liLh};">${escapeHtml(b)}</li>`)
        .join('')
      const dates = job.dates || ''
      const ulMargin = compact ? '1px 0 5px 0' : '6px 0 12px 0'
      const ulPad = compact ? '13px' : '24px'
      return `
        <div class="experience-item resume-section">
          <p style="margin: 0 0 ${titleMb} 0; font-weight: bold; font-size: ${titleFs}; line-height: 1.25;">${escapeHtml(job.title || '')} at ${escapeHtml(job.company || '')}${dates ? ` | ${escapeHtml(dates)}` : ''}</p>
          ${bullets ? `<ul style="margin: ${ulMargin}; padding-left: ${ulPad};">${bullets}</ul>` : ''}
        </div>
      `
    })
    .join('')
}

function formatSkillGroupsHtml(skillGroups, template = '') {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) {
    return ''
  }
  const compact = usesOnePageCompactFormatters(template)
  const modern = template === 'modern'
  const mb = compact ? '6px' : '8px'
  const catStyle = modern ? 'font-weight: 700; color: #2563eb;' : 'font-weight: bold;'
  const fontBlock = compact ? 'font-size: 10.5px; line-height: 1.3;' : 'line-height: 1.5;'
  return skillGroups
    .map((g) => {
      const items = (g.skills || []).map((s) => escapeHtml(String(s))).join(', ')
      return `<div class="skill-group resume-section" style="margin-bottom: ${mb}; ${fontBlock}"><span style="${catStyle}">${escapeHtml(g.category || 'Skills')}:</span> ${items}</div>`
    })
    .join('')
}

function stripGpaPrefix(value) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (!s) return ''
  return s.replace(/^\s*GPA\s*:\s*/i, '').trim()
}

function normalizeHonorsArray(raw) {
  if (!raw || typeof raw !== 'object') return []
  const h = raw.honors ?? raw.awards ?? raw.honorsAndAwards ?? raw.award
  if (Array.isArray(h)) return h.map((x) => String(x).trim()).filter(Boolean)
  if (typeof h === 'string' && h.trim()) return h.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  return []
}

function normalizeEducationEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const degree = raw.degree ?? raw.degreeName ?? ''
  const institution = raw.institution ?? raw.schoolName ?? raw.school ?? ''
  const graduationYear = raw.graduationYear ?? raw.year ?? ''
  const location = raw.location ?? raw.schoolLocation ?? raw.institutionLocation ?? raw.schoolCity ?? raw.city ?? ''
  const degreeS = String(degree).trim()
  const institutionS = String(institution).trim()
  const yearS = String(graduationYear).trim()
  const locationS = String(location).trim()
  const gpa = stripGpaPrefix(raw.gpa ?? raw.GPA ?? '')
  const honors = normalizeHonorsArray(raw)
  if (!degreeS && !institutionS && !yearS && !locationS && !gpa && honors.length === 0) return null
  return {
    degree: degreeS,
    institution: institutionS,
    graduationYear: yearS,
    location: locationS,
    gpa,
    honors,
  }
}

function educationKey(entry) {
  return `${entry.institution.toLowerCase()}|${entry.degree.toLowerCase()}|${(entry.graduationYear || '').toLowerCase()}`
}

function educationFromProfile(profile) {
  const arr = Array.isArray(profile?.education) ? profile.education : []
  return arr.map(normalizeEducationEntry).filter(Boolean)
}

function mergeEducationFromProfile(parsedList, profile) {
  const profileEdu = educationFromProfile(profile)
  const parsedEdu = (Array.isArray(parsedList) ? parsedList : []).map(normalizeEducationEntry).filter(Boolean)

  function enrichEntry(entry) {
    if (profileEdu.length === 0) {
      return {
        ...entry,
        gpa: stripGpaPrefix(entry.gpa),
        honors: Array.isArray(entry.honors) ? entry.honors : [],
      }
    }
    const m = profileEdu.find((p) => educationKey(p) === educationKey(entry))
    if (!m) {
      return { ...entry, gpa: '', honors: [], location: String(entry.location || '').trim() }
    }
    const location = (String(entry.location || '').trim() || m.location || '').trim()
    const honors = entry.honors?.length ? entry.honors : m.honors?.length ? m.honors : []
    const gpa = m.gpa ? stripGpaPrefix(entry.gpa || m.gpa) : ''
    return { ...entry, location, honors, gpa }
  }

  let out = parsedEdu.map(enrichEntry)
  if (profileEdu.length === 0) return out

  const seen = new Set(out.map(educationKey))
  for (const row of profileEdu) {
    const k = educationKey(row)
    if (!seen.has(k)) {
      out.push(enrichEntry(row))
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

function formatEducationHtml(items, template = '') {
  const compact = usesOnePageCompactFormatters(template)
  const fs = compact ? '10px' : '11px'
  const mb = compact ? '4px' : '8px'
  const lh = compact ? '1.3' : '1.25'
  const rowStyle = `display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;margin:0;font-size:${fs};line-height:${lh};`
  const leftGrow = 'flex:1;min-width:0;word-wrap:break-word;overflow-wrap:break-word;'
  const rightCell = 'flex-shrink:0;text-align:right;margin-left:8px;max-width:40%;word-wrap:break-word;overflow-wrap:break-word;'
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((e) => {
      const inst = escapeHtml(e.institution || '')
      const loc = escapeHtml(String(e.location || '').trim())
      const degree = escapeHtml(e.degree || '')
      const year = escapeHtml(String(e.graduationYear || '').trim())
      const gpaRaw = stripGpaPrefix(e.gpa)
      const gpa = gpaRaw ? escapeHtml(gpaRaw) : ''
      const honors = Array.isArray(e.honors) ? e.honors.map((h) => String(h).trim()).filter(Boolean) : []

      const row1Right = loc
        ? `<span style="font-weight:normal;${rightCell}">${loc}</span>`
        : `<span style="${rightCell}" aria-hidden="true"></span>`
      const row1Left = inst || '&#160;'
      const row1 = `<div class="edu-row" style="${rowStyle}"><span style="font-weight:bold;${leftGrow}">${row1Left}</span>${row1Right}</div>`

      const row2Right = year
        ? `<span style="font-weight:normal;${rightCell}">${year}</span>`
        : `<span style="${rightCell}" aria-hidden="true"></span>`
      const row2Left = degree || '&#160;'
      const row2 = `<div class="edu-row" style="${rowStyle}"><span style="font-weight:normal;${leftGrow}">${row2Left}</span>${row2Right}</div>`

      const gpaBlock = gpa
        ? `<p class="edu-gpa" style="margin:2px 0 0 0;padding:0;font-size:${fs};line-height:${lh};font-weight:normal;">GPA: ${gpa}</p>`
        : ''

      const ulMt = compact ? '2px' : '4px'
      const ulPad = compact ? '14px' : '18px'
      const honorsItems = honors
        .map((h) => `<li style="margin-bottom:2px;line-height:${lh};font-size:${fs};">${escapeHtml(h)}</li>`)
        .join('')
      const honorsBlock = honorsItems
        ? `<ul class="edu-honors" style="margin:${ulMt} 0 0 0;padding-left:${ulPad};list-style-type:disc;">${honorsItems}</ul>`
        : ''

      return `<div class="education-item resume-section" style="margin-bottom:${mb};">${row1}${row2}${gpaBlock}${honorsBlock}</div>`
    })
    .join('')
}

function formatEducationBlock(items, template = '') {
  const inner = formatEducationHtml(items, template)
  if (!inner) return ''
  return `<div class="resume-education-block resume-section"><h2>Education</h2>${inner}</div>`
}

function formatCertificationsHtml(items, template = '') {
  const compact = usesOnePageCompactFormatters(template)
  const fs = compact ? '10px' : '11px'
  const mb = compact ? '4px' : '8px'
  const lh = compact ? '1.3' : '1.25'
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((c) => {
      const name = escapeHtml(c.name || '')
      const issuer = c.issuer ? escapeHtml(c.issuer) : ''
      const year = c.year ? escapeHtml(String(c.year)) : ''
      const mid = [name, issuer].filter(Boolean).join(' — ')
      const tail = year ? ` · ${year}` : ''
      return `<div class="cert-item resume-section" style="margin-bottom: ${mb};"><p style="margin: 0; font-size: ${fs}; line-height: ${lh};">${mid}${tail}</p></div>`
    })
    .join('')
}

function formatCertificationsBlock(items, template = '') {
  const inner = formatCertificationsHtml(items, template)
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

function formatSidebarUrls(profile, template = '') {
  const modern = template === 'modern'
  const fs = modern ? '10px' : '10pt'
  const lh = modern ? '1.35' : '1.5'
  const mb = modern ? '5px' : '8px'
  const blocks = []
  if (profile.linkedin_url && String(profile.linkedin_url).trim()) {
    blocks.push(
      `<p style="margin: 0 0 ${mb} 0; font-size: ${fs}; line-height: ${lh}; word-break: break-all;">LinkedIn<br/>${escapeHtml(String(profile.linkedin_url).trim())}</p>`
    )
  }
  if (profile.portfolio_url && String(profile.portfolio_url).trim()) {
    blocks.push(
      `<p style="margin: 0; font-size: ${fs}; line-height: ${lh}; word-break: break-all;">Website<br/>${escapeHtml(String(profile.portfolio_url).trim())}</p>`
    )
  }
  return blocks.join('')
}

function normalizeClientResumeContentForRender(clientContent, profile, template = '') {
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
    '{{sidebar_urls}}': formatSidebarUrls(profile, template),
    '{{summary}}': summary,
    '{{experience}}': formatExperienceHtml(experience, template),
    '{{education_block}}': formatEducationBlock(education, template),
    '{{certifications_block}}': formatCertificationsBlock(certifications, template),
    '{{skills}}': formatSkillGroupsHtml(skillGroups, template),
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

    if (isRenderOnly) {
      const { output, replacements: r } = normalizeClientResumeContentForRender(clientResumeContent, profile, template)
      contentOut = output
      replacements = r
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
        '{{sidebar_urls}}': formatSidebarUrls(profile, template),
        '{{summary}}': parsed.summary || '',
        '{{experience}}': formatExperienceHtml(parsed.experience || [], template),
        '{{education_block}}': formatEducationBlock(mergedEducation, template),
        '{{certifications_block}}': formatCertificationsBlock(mergedCertifications, template),
        '{{skills}}': formatSkillGroupsHtml(skillGroups, template),
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
      `${PDF_STYLES}${pdfInjectionForTemplate(template)}</head>`
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
