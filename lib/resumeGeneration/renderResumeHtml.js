import {
  normalizeResumeDocument,
  toLegacyContentOut,
  stripGpaPrefix,
  flattenAndDedupeBullets,
  strictDedupeBullets,
  dedupeExperienceBullets,
} from '@/lib/resumeGeneration/normalizeResumeDocument'

export const PDF_MARGIN_IN = '0.75in'
export const ATS_PDF_MARGIN_IN = '0.4in'
export const ATS_PDF_MARGIN_IN_TIGHT = '0.35in'
const ATS_COMPACT_PT = 9.5
const ATS_GENERAL_PT = 10
const ATS_NAME_PT = 24
const ATS_SECTION_HEADER_PT = 11
const ATS_CONTACT_PT = 10
const ATS_COMPANY_PT = 9.5
const ATS_BULLET_LINE_HEIGHT = 1.2
const ATS_BULLET_LINE_HEIGHT_TIGHT = 1.15
const ATS_BULLET_GAP = '2pt'
const ATS_HEADER_AFTER_RULE = '8pt'
const ATS_SECTION_RULE_AFTER = '3pt'
const ATS_SECTION_SPACING = '6pt'
const ATS_JOB_BLOCK_SPACING = '6pt'
const ATS_FONT = "Georgia,'Times New Roman',Times,serif"
const MODERN_FONT = 'Arial,Helvetica,sans-serif'
const MODERN_SLATE = '#2d3748'
const MODERN_SIDEBAR_MUTED = '#cbd5e0'
const MODERN_BODY_GRAY = '#718096'
const MODERN_MAX_SKILL_CATEGORIES = 4
const MODERN_MAX_SKILLS_PER_CATEGORY = 5
const MODERN_MAX_CERTIFICATIONS = 3

export function getDefaultAtsFitAdjustments() {
  return {
    marginIn: ATS_PDF_MARGIN_IN,
    lineHeight: ATS_BULLET_LINE_HEIGHT,
    sectionSpacing: ATS_SECTION_SPACING,
    jobBlockSpacing: ATS_JOB_BLOCK_SPACING,
    sectionRuleAfter: ATS_SECTION_RULE_AFTER,
    bulletGap: ATS_BULLET_GAP,
    compactPt: ATS_COMPACT_PT,
    bodyPt: ATS_GENERAL_PT,
    namePt: ATS_NAME_PT,
  }
}

export function getTightAtsFitAdjustments() {
  return {
    ...getDefaultAtsFitAdjustments(),
    marginIn: ATS_PDF_MARGIN_IN_TIGHT,
    lineHeight: ATS_BULLET_LINE_HEIGHT_TIGHT,
  }
}

export const MODERN_PDF_MARGIN_IN = '0in'
export const MINIMAL_PDF_MARGIN_IN = '0.45in'
export const MINIMAL_PDF_MARGIN_IN_TIGHT = '0.35in'
const MINIMAL_BODY_PT = 9.5
const MINIMAL_LINE_HEIGHT = 1.3
const MINIMAL_BULLET_GAP = '0pt'

const MINIMAL_FONT = 'Arial,Helvetica,sans-serif'
const MINIMAL_NAME_FONT = "Georgia,'Times New Roman',Times,serif"
const MINIMAL_COLOR_NAME = '#1a1a1a'
const MINIMAL_COLOR_HEADER = '#1a1a1a'
const MINIMAL_COLOR_BODY = '#2d2d2d'
const MINIMAL_COLOR_COMPANY = '#1a1a1a'
const MINIMAL_COLOR_MUTED = '#666666'
const MINIMAL_COLOR_TITLE = '#555555'
const MINIMAL_COLOR_RULE = '#cccccc'

export function getDefaultMinimalFitAdjustments() {
  return {
    marginIn: MINIMAL_PDF_MARGIN_IN,
    lineHeight: MINIMAL_LINE_HEIGHT,
    sectionGap: '8pt',
    jobGap: '6pt',
    bodyPt: MINIMAL_BODY_PT,
  }
}

export function getTightMinimalFitAdjustments() {
  return {
    ...getDefaultMinimalFitAdjustments(),
    marginIn: MINIMAL_PDF_MARGIN_IN_TIGHT,
  }
}

export const CREATIVE_PDF_MARGIN_IN = '0.35in'
export const CREATIVE_PDF_MARGIN_IN_TIGHT = '0.25in'
const CREATIVE_BODY_PT = 9
const CREATIVE_LINE_HEIGHT = 1.3
const CREATIVE_FONT = "'Source Sans 3',Arial,Helvetica,sans-serif"
const CREATIVE_HEADING_FONT = "'Playfair Display',Georgia,serif"
const CREATIVE_ACCENT = '#1e3a5f'

export function getDefaultCreativeFitAdjustments() {
  return {
    marginIn: CREATIVE_PDF_MARGIN_IN,
    bodyPt: CREATIVE_BODY_PT,
    lineHeight: CREATIVE_LINE_HEIGHT,
    sectionGap: '6pt',
    jobGap: '6pt',
    sectionHeaderPt: 11,
  }
}

export function getTightCreativeFitAdjustments() {
  return {
    ...getDefaultCreativeFitAdjustments(),
    marginIn: CREATIVE_PDF_MARGIN_IN_TIGHT,
    bodyPt: 8.5,
    lineHeight: 1.25,
    sectionGap: '4pt',
    jobGap: '4pt',
    sectionHeaderPt: 10.5,
  }
}

export function resolveCreativeLayout(fitAdjustments = null) {
  const base = getDefaultCreativeFitAdjustments()
  const adj = fitAdjustments && typeof fitAdjustments === 'object' ? fitAdjustments : {}
  return {
    marginIn: adj.marginIn ?? base.marginIn,
    bodyPt: adj.bodyPt ?? base.bodyPt,
    lineHeight: adj.lineHeight ?? base.lineHeight,
    sectionGap: adj.sectionGap ?? base.sectionGap,
    jobGap: adj.jobGap ?? base.jobGap,
    sectionHeaderPt: adj.sectionHeaderPt ?? base.sectionHeaderPt,
  }
}

/** Resolved Minimal layout for HTML + PDF (layout-only; never trims content). */
export function resolveMinimalLayout(fitAdjustments = null) {
  const base = getDefaultMinimalFitAdjustments()
  const adj = fitAdjustments && typeof fitAdjustments === 'object' ? fitAdjustments : {}
  return {
    marginIn: adj.marginIn ?? base.marginIn,
    lineHeight: adj.lineHeight ?? base.lineHeight,
    sectionGap: adj.sectionGap ?? base.sectionGap,
    jobGap: adj.jobGap ?? base.jobGap,
    bodyPt: adj.bodyPt ?? base.bodyPt,
  }
}

export function getPdfMarginIn(template = '', fitAdjustments = null) {
  const t = template?.toLowerCase()
  if (t === 'ats') {
    return fitAdjustments?.marginIn || ATS_PDF_MARGIN_IN
  }
  if (t === 'modern') {
    return MODERN_PDF_MARGIN_IN
  }
  if (t === 'minimal') {
    return fitAdjustments?.marginIn || MINIMAL_PDF_MARGIN_IN
  }
  if (t === 'creative') {
    return fitAdjustments?.marginIn || CREATIVE_PDF_MARGIN_IN
  }
  return PDF_MARGIN_IN
}

/** Resolved ATS layout for HTML + PDF (layout-only; never trims content). */
export function resolveAtsLayout(fitAdjustments = null) {
  const base = getDefaultAtsFitAdjustments()
  const adj = fitAdjustments && typeof fitAdjustments === 'object' ? fitAdjustments : {}
  return {
    marginIn: adj.marginIn ?? base.marginIn,
    lineHeight: adj.lineHeight ?? base.lineHeight,
    sectionSpacing: adj.sectionSpacing ?? base.sectionSpacing,
    jobBlockSpacing: adj.jobBlockSpacing ?? base.jobBlockSpacing,
    sectionRuleAfter: adj.sectionRuleAfter ?? base.sectionRuleAfter,
    bulletGap: adj.bulletGap ?? base.bulletGap,
    compactPt: adj.compactPt ?? base.compactPt,
    bodyPt: adj.bodyPt ?? base.bodyPt,
    namePt: adj.namePt ?? base.namePt,
  }
}

function atsSectionBlockMargin(fitAdjustments) {
  return resolveAtsLayout(fitAdjustments).sectionSpacing
}

function atsJobBlockMargin(fitAdjustments) {
  return resolveAtsLayout(fitAdjustments).jobBlockSpacing
}

const TEMPLATE_PAGE_CAPACITY = {
  ats: 68,
  modern: 56,
  minimal: 44,
  creative: 50,
}
/** Only trim when estimated lines exceed this fraction of page capacity. */
const TRIM_START_RATIO = 1

function getTrimLimit(template) {
  const cap = TEMPLATE_PAGE_CAPACITY[template?.toLowerCase()] || 45
  return Math.floor(cap * TRIM_START_RATIO)
}

const MIN_BULLETS_PER_ROLE = 3
const ACTION_VERB_RE =
  /^(Led|Built|Drove|Reduced|Increased|Deployed|Managed|Launched|Optimized|Achieved|Delivered|Generated|Grew|Improved|Created|Established|Scaled|Streamlined|Automated|Designed|Implemented|Directed|Spearheaded|Accelerated|Transformed)/i

/** Detect quantified outcomes: %, $, multipliers, large numbers, etc. */
export function bulletHasMetric(text) {
  const s = String(text || '')
  return (
    /\d+\s*%/.test(s) ||
    /\$\s?\d/.test(s) ||
    /\d+\s*[xX]\b/.test(s) ||
    /\b\d{1,3}(,\d{3})+\+?\b/.test(s) ||
    /\b\d+\+?\s*(users|clients|customers|projects|teams|people|employees|stores|locations|accounts)\b/i.test(s) ||
    /\b(increased|reduced|saved|generated|grew|improved|decreased|cut|boosted|lowered|raised)\b[^.]{0,50}\d/i.test(s) ||
    /\b\d+(\.\d+)?\s*(million|billion|m\b|k\b|K\b|M\b|B\b)\b/i.test(s)
  )
}

function bulletQualityScore(text) {
  let score = 0
  if (bulletHasMetric(text)) score += 10
  if (ACTION_VERB_RE.test(String(text || '').trim())) score += 2
  return score
}

/** Keep the strongest bullets; never go below minCount when enough bullets exist. */
export function selectBestBullets(bullets, maxCount, minCount = MIN_BULLETS_PER_ROLE) {
  const deduped = strictDedupeBullets(bullets, (b) => bulletQualityScore(b))
  const list = deduped.map((b, i) => ({ b, i, score: bulletQualityScore(b) }))
  if (list.length === 0) return []
  const floor = Math.min(minCount, list.length)
  const cap = Math.min(Math.max(maxCount, floor), list.length)
  if (list.length <= cap) return list.map((x) => x.b)
  const ranked = [...list].sort((a, b) => b.score - a.score || a.i - b.i)
  const kept = new Set(ranked.slice(0, cap).map((x) => x.i))
  return list.filter((x) => kept.has(x.i)).map((x) => x.b)
}

function bulletsForRoleIndex(jobIndex, template = '') {
  if (template?.toLowerCase() === 'ats') {
    if (jobIndex < 2) return 4
    return 3
  }
  if (jobIndex < 2) return 4
  return 3
}

function applyAllRolesBulletCap(experience, cap) {
  return (experience || []).map((job) => ({
    ...job,
    bullets: selectBestBullets(job.bullets, cap, Math.min(cap, MIN_BULLETS_PER_ROLE)),
  }))
}

function applyRoleBulletLimits(experience, template = '') {
  return (experience || []).map((job, i) => ({
    ...job,
    bullets: selectBestBullets(job.bullets, bulletsForRoleIndex(i, template), MIN_BULLETS_PER_ROLE),
  }))
}

/** Re-dedupe bullets after normalize merge; never trim skills/certs/bullets. */
export function applyAtsContentCaps(doc) {
  doc.experience = dedupeExperienceBullets(doc.experience)
  return doc
}

/** ATS: dedupe only + default tight layout (page fit via margins/spacing + Puppeteer check). */
function prepareAtsDocument(doc) {
  doc.experience = dedupeExperienceBullets(doc.experience)
  doc._fitAdjustments = getDefaultAtsFitAdjustments()
  return doc
}

/** Cap certification count on the document (mutates doc). */
function trimCertifications(doc, maxCount = 3) {
  if (!doc || maxCount == null) return doc
  if (!Array.isArray(doc.certifications)) {
    doc.certifications = []
    return doc
  }
  doc.certifications = doc.certifications.slice(0, maxCount)
  return doc
}

/** Modern: dedupe + sidebar caps so skills/certs fit one page. */
function prepareModernDocument(doc) {
  doc.experience = dedupeExperienceBullets(doc.experience)
  trimSkillsPerCategory(doc, MODERN_MAX_SKILLS_PER_CATEGORY, MODERN_MAX_SKILL_CATEGORIES)
  trimCertifications(doc, MODERN_MAX_CERTIFICATIONS)
  return doc
}

/** Re-apply Modern sidebar caps after profile merge. */
export function applyModernContentCaps(doc) {
  return prepareModernDocument(doc)
}

function trimSummaryToSentences(summary, maxSentences) {
  const sentences = String(summary || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return sentences.slice(0, maxSentences).join(' ')
}

export function escapeHtml(text) {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Plain text from rendered resume HTML for ATS scoring and search. */
export function htmlToPlainResumeText(html) {
  if (!html || typeof html !== 'string') return ''
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<hr[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  text = text
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#8226;/g, '•')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}

function formatLinkedInDisplay(url) {
  let s = String(url || '').trim()
  if (!s) return ''
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  if (!/^linkedin\.com/i.test(s)) {
    const m = s.match(/linkedin\.com\/[^\s]+/i)
    if (m) s = m[0]
    else if (s.includes('/in/')) s = `linkedin.com${s.startsWith('/') ? '' : '/'}${s.replace(/^\//, '')}`
    else s = `linkedin.com/in/${s.replace(/^\/+/, '')}`
  }
  return s.replace(/\/+$/, '')
}

function skillGroupsFromDocument(document) {
  if (!document?.skills || typeof document.skills !== 'object') return []
  return Object.entries(document.skills)
    .map(([category, skills]) => ({
      category: String(category).trim() || 'Skills',
      skills: (Array.isArray(skills) ? skills : []).map((s) => String(s).trim()).filter(Boolean),
    }))
    .filter((g) => g.skills.length > 0)
}

function estimateAtsSkillsLines(document) {
  const groups = skillGroupsFromDocument(document)
  if (!groups.length) return 0
  // Skills section heading + rule (~3 lines) + ~2 lines per category row
  return 3 + groups.length * 2
}

function estimateContentLines(document, template = '') {
  const t = template?.toLowerCase()
  const bulletFactor = t === 'ats' ? 1.1 : 1.2
  const headerLines = t === 'ats' ? 5 : 8
  let lines = headerLines
  lines += Math.ceil(String(document.summary || '').length / (t === 'ats' ? 100 : 95))
  for (const job of document.experience || []) {
    lines += t === 'ats' ? 2.4 : 3
    lines += (job.bullets || []).length * bulletFactor
  }
  lines += (document.education || []).length * (t === 'ats' ? 1.8 : 2)
  lines += (document.certifications || []).length * (t === 'ats' ? 1 : 1)
  if (t === 'ats') {
    for (const proj of document.projects || []) {
      lines += 1.5
      lines += (proj.bullets || []).length * bulletFactor
    }
    lines += estimateAtsSkillsLines(document)
  } else {
    lines += skillGroupsFromDocument(document).reduce(
      (sum, g) => sum + 1 + Math.ceil((g.skills?.length || 0) / 4),
      0
    )
  }
  return Math.round(lines)
}

/** Trim skills within categories; optionally cap category count. */
function trimSkillsPerCategory(doc, maxPerCategory, maxCategories = null) {
  let groups = skillGroupsFromDocument(doc)
  if (!groups.length) return doc
  if (maxCategories != null && groups.length > maxCategories) {
    groups = groups.slice(0, maxCategories)
  }
  doc.skills = Object.fromEntries(
    groups.map((g) => [g.category, g.skills.slice(0, maxPerCategory)])
  )
  return doc
}

function dropLastSkillsCategory(doc) {
  const groups = skillGroupsFromDocument(doc)
  if (groups.length <= 1) return doc
  const kept = groups.slice(0, -1)
  doc.skills = Object.fromEntries(kept.map((g) => [g.category, g.skills]))
  return doc
}

/** Creative: dedupe only + default compact layout (page fit via margins/spacing + Puppeteer check). */
function prepareCreativeDocument(doc) {
  doc.experience = dedupeExperienceBullets(doc.experience)
  doc._fitAdjustments = getDefaultCreativeFitAdjustments()
  return doc
}

/** Minimal: dedupe only + default compact layout (page fit via margins/spacing + Puppeteer check). */
function prepareMinimalDocument(doc) {
  doc.experience = dedupeExperienceBullets(doc.experience)
  doc._fitAdjustments = getDefaultMinimalFitAdjustments()
  return doc
}

/** Trim content to fit one-page line budget. Call after critic pass on the final document. */
export function fitContentForTemplate(document, template) {
  const limit = getTrimLimit(template)
  const t = template?.toLowerCase()
  const doc = JSON.parse(JSON.stringify(document))

  if (t === 'ats') {
    return prepareAtsDocument(doc)
  }

  if (t === 'modern') {
    return prepareModernDocument(doc)
  }

  if (t === 'minimal') {
    return prepareMinimalDocument(doc)
  }

  if (t === 'creative') {
    return prepareCreativeDocument(doc)
  }

  doc.experience = dedupeExperienceBullets(doc.experience)
  doc.experience = applyRoleBulletLimits(doc.experience, template)
  if (estimateContentLines(doc, template) <= limit) return doc

  trimSkillsPerCategory(doc, 8)
  if (estimateContentLines(doc, template) <= limit) return doc

  doc.summary = trimSummaryToSentences(doc.summary, 2)
  if (estimateContentLines(doc, template) <= limit) return doc

  doc.experience = applyAllRolesBulletCap(doc.experience, 3)
  if (estimateContentLines(doc, template) <= limit) return doc

  doc.experience = applyRoleBulletLimits((doc.experience || []).slice(0, 4), template)
  doc._fitAdjustments = { fontSizeDelta: -0.5, lineHeight: 1.15 }
  return doc
}

function atsSectionTitle(title) {
  const map = {
    summary: 'PROFESSIONAL SUMMARY',
    'professional summary': 'PROFESSIONAL SUMMARY',
    experience: 'EXPERIENCE',
    'professional experience': 'EXPERIENCE',
    education: 'EDUCATION',
    skills: 'SKILLS',
    certifications: 'CERTIFICATIONS',
    projects: 'PROJECTS',
  }
  const key = String(title || '').toLowerCase().trim()
  return map[key] || String(title || '').toUpperCase()
}

function creativeSectionHeading(title, layout) {
  const fs = layout?.sectionHeaderPt ?? CREATIVE_BODY_PT + 2
  const label = escapeHtml(String(title || '').trim())
  return `<h2 class="resume-section-heading creative-heading" style="margin:0 0 6pt 0;font-size:${fs}pt;font-weight:700;font-family:${CREATIVE_HEADING_FONT};color:${CREATIVE_ACCENT};white-space:nowrap;word-break:normal;letter-spacing:normal;line-height:1.2;page-break-after:avoid;">${label}</h2>`
}

function sectionHeading(title, template, fitAdjustments = null) {
  const t = template?.toLowerCase()
  if (t === 'creative') {
    return creativeSectionHeading(title, resolveCreativeLayout(fitAdjustments))
  }
  if (t === 'modern') {
    return `<h2 class="resume-section-heading modern-heading" style="margin:0 0 8px 0;padding:0 0 4px 0;font-size:10pt;font-weight:700;text-transform:uppercase;color:${MODERN_SLATE};border-bottom:1px solid ${MODERN_SLATE};font-family:${MODERN_FONT};">${escapeHtml(title)}</h2>`
  }
  if (t === 'ats') {
    const displayTitle = atsSectionTitle(title)
    const ruleAfter = resolveAtsLayout(fitAdjustments).sectionRuleAfter
    return `<h2 class="resume-section-heading ats-heading" style="margin:0;font-size:${ATS_SECTION_HEADER_PT}pt;font-weight:bold;text-transform:uppercase;letter-spacing:0;color:#000;line-height:1.2;font-family:${ATS_FONT};">${escapeHtml(displayTitle)}</h2><hr class="ats-section-rule" style="border:none;border-top:0.5pt solid #000;margin:2pt 0 ${ruleAfter} 0;width:100%;height:0;" />`
  }
  return `<h2 class="resume-section-heading ats-heading" style="margin:12px 0 6px 0;font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;color:#000;border-bottom:1pt solid #000;padding-bottom:3px;line-height:1.3;">${escapeHtml(title.toUpperCase())}</h2>`
}

function formatBulletsAts(bullets, fitAdjustments = null) {
  const layout = resolveAtsLayout(fitAdjustments)
  const items = strictDedupeBullets(bullets, (b) => bulletQualityScore(b))
    .map(
      (b) =>
        `<div class="ats-bullet-row" style="display:flex;align-items:flex-start;gap:0.35em;margin:0 0 ${layout.bulletGap} 0;padding-left:0.12in;line-height:${layout.lineHeight};font-size:${layout.compactPt}pt;font-family:${ATS_FONT};">
          <span class="ats-bullet-marker" style="flex-shrink:0;line-height:${layout.lineHeight};">&#8226;</span>
          <span class="ats-bullet-text" style="flex:1;min-width:0;">${escapeHtml(b)}</span>
        </div>`
    )
    .join('')
  if (!items) return ''
  return `<div class="resume-bullets ats-bullets" style="margin:1pt 0 0 0;">${items}</div>`
}

function formatExperienceAts(experience, fitAdjustments = null) {
  if (!experience?.length) return ''
  const layout = resolveAtsLayout(fitAdjustments)
  const rowStyle = `display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;font-family:${ATS_FONT};`
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const loc = escapeHtml(job.location || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      const companyLine = [company, loc].filter(Boolean).join(' | ')
      const jobMb = atsJobBlockMargin(fitAdjustments)
      return `<div class="experience-item resume-section" style="margin-bottom:${jobMb};page-break-inside:avoid;font-family:${ATS_FONT};">
        <div class="ats-job-title-row" style="${rowStyle}margin:0 0 1pt 0;font-size:${layout.bodyPt}pt;line-height:1.25;">
          <span style="font-weight:bold;flex:1;min-width:0;">${title || '&#160;'}</span>
          ${dates ? `<span style="flex-shrink:0;text-align:right;font-weight:bold;white-space:nowrap;">${dates}</span>` : ''}
        </div>
        <div class="ats-job-company-row" style="${rowStyle}font-size:${ATS_COMPANY_PT}pt;font-weight:normal;margin:0 0 3pt 0;line-height:1.25;">
          <span style="flex:1;min-width:0;">${companyLine || '&#160;'}</span>
        </div>
        ${formatBulletsAts(job.bullets, fitAdjustments)}
      </div>`
    })
    .join('')
}

function formatProjectsAts(projects, fitAdjustments = null) {
  if (!projects?.length) return ''
  const layout = resolveAtsLayout(fitAdjustments)
  return projects
    .map((proj) => {
      const name = escapeHtml(proj.name || '')
      const bullets = formatBulletsAts(proj.bullets, fitAdjustments)
      return `<div class="project-item resume-section" style="margin-bottom:6pt;page-break-inside:avoid;font-family:${ATS_FONT};">
        <p class="ats-project-name" style="margin:0 0 2pt 0;font-size:${layout.bodyPt}pt;font-weight:bold;line-height:1.25;">${name}</p>
        ${bullets}
      </div>`
    })
    .join('')
}

export function formatProjectsBlock(projects, template = '', fitAdjustments = null) {
  if (template?.toLowerCase() !== 'ats') return ''
  const inner = formatProjectsAts(projects, fitAdjustments)
  if (!inner) return ''
  const mb = atsSectionBlockMargin(fitAdjustments)
  return `<div class="resume-projects-block resume-section-block resume-section" style="margin-bottom:${mb};">${sectionHeading('Projects', template, fitAdjustments)}${inner}</div>`
}

function modernSidebarSectionHeader(title, { gapBefore = false } = {}) {
  const top = gapBefore ? '14px' : '0'
  return `<p style="margin:${top} 0 6px 0;font-size:8pt;font-weight:700;letter-spacing:normal;text-transform:uppercase;color:#ffffff;font-family:${MODERN_FONT};">${escapeHtml(title)}</p>`
}

function modernMainSectionHeader(title, { gapBefore = false } = {}) {
  const top = gapBefore ? '14px' : '0'
  const label = escapeHtml(String(title).toUpperCase())
  return `<p style="margin:${top} 0 8pt 0;padding:0 0 4px 0;font-size:10pt;font-weight:700;text-transform:uppercase;color:${MODERN_SLATE};border-bottom:1px solid ${MODERN_SLATE};font-family:${MODERN_FONT};line-height:1.3;width:100%;display:block;box-sizing:border-box;">${label}</p>`
}

function formatModernSidebarContact(document) {
  const c = document.contact || {}
  const linkedin = formatLinkedInDisplay(c.linkedin)
  const lines = [c.email, c.phone, c.location, linkedin]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
  if (!lines.length) return ''
  const lineStyle = `margin:0 0 4px 0;font-size:9pt;line-height:1.35;color:${MODERN_SIDEBAR_MUTED};font-family:${MODERN_FONT};word-wrap:normal;`
  return lines.map((line) => `<p style="${lineStyle}">${escapeHtml(line)}</p>`).join('')
}

function formatModernSidebarSkills(groups) {
  if (!groups?.length) return ''
  return groups
    .map((g) => {
      const cat = escapeHtml((g.category || 'Skills').toUpperCase())
      const skillLines = (g.skills || [])
        .map(
          (s) =>
            `<p style="margin:0 0 2px 0;font-size:8.5pt;line-height:1.35;color:${MODERN_SIDEBAR_MUTED};font-family:${MODERN_FONT};word-wrap:normal;">${escapeHtml(String(s))}</p>`
        )
        .join('')
      return `<div style="margin-bottom:8px;">
        <p style="margin:0 0 4px 0;font-size:9pt;font-weight:700;color:#ffffff;font-family:${MODERN_FONT};word-wrap:normal;">${cat}</p>
        ${skillLines}
      </div>`
    })
    .join('')
}

function formatModernSidebarCertifications(items) {
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((c) => {
      const name = escapeHtml(c.name || '')
      const year = c.year ? escapeHtml(String(c.year)) : ''
      const text = year ? `${name} (${year})` : name
      return `<p style="margin:0 0 3px 0;font-size:8.5pt;line-height:1.35;color:${MODERN_SIDEBAR_MUTED};font-family:${MODERN_FONT};word-wrap:normal;">${text}</p>`
    })
    .join('')
}

export function formatModernSidebar(document, groups) {
  const name = escapeHtml(document.name || '')
  const parts = [
    `<p style="margin:0 0 10px 0;font-size:18pt;font-weight:700;color:#ffffff;line-height:1.2;font-family:${MODERN_FONT};white-space:nowrap;">${name}</p>`,
    `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.35);margin:0 0 10px 0;height:0;width:100%;" />`,
    modernSidebarSectionHeader('Contact'),
    formatModernSidebarContact(document),
  ]
  const skillsHtml = formatModernSidebarSkills(groups)
  if (skillsHtml) {
    parts.push(modernSidebarSectionHeader('Skills', { gapBefore: true }), skillsHtml)
  }
  const certsHtml = formatModernSidebarCertifications(document.certifications)
  if (certsHtml) {
    parts.push(modernSidebarSectionHeader('Certifications', { gapBefore: true }), certsHtml)
  }
  return parts.filter(Boolean).join('')
}

function formatBulletsModern(bullets) {
  const items = (bullets || [])
    .map(
      (b) =>
        `<p style="margin:0 0 3px 0;padding-left:10px;text-indent:-10px;font-size:9pt;line-height:1.35;color:#000000;font-family:${MODERN_FONT};word-wrap:normal;"><span style="display:inline-block;width:10px;margin-left:-10px;">&#8226;</span> ${escapeHtml(b)}</p>`
    )
    .join('')
  if (!items) return ''
  return `<div style="margin:2px 0 0 0;">${items}</div>`
}

function formatExperienceModern(experience) {
  if (!experience?.length) return ''
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      const titleLine = [title, dates].filter(Boolean).join(' | ')
      return `<div style="margin-bottom:10px;page-break-inside:avoid;font-family:${MODERN_FONT};">
        <p style="margin:0 0 2px 0;font-size:10pt;font-weight:700;color:${MODERN_SLATE};line-height:1.25;word-wrap:normal;">${company}</p>
        <p style="margin:0 0 4px 0;font-size:9pt;font-style:italic;color:${MODERN_BODY_GRAY};line-height:1.35;word-wrap:normal;">${titleLine || '&#160;'}</p>
        ${formatBulletsModern(job.bullets)}
      </div>`
    })
    .join('')
}

function formatEducationModern(items) {
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((e) => {
      const degree = escapeHtml(e.degree || '')
      const inst = escapeHtml(e.institution || '')
      const year = escapeHtml(String(e.graduationYear || '').trim())
      const instLine = [inst, year].filter(Boolean).join(', ')
      return `<div style="margin-bottom:8px;page-break-inside:avoid;font-family:${MODERN_FONT};">
        <p style="margin:0 0 2px 0;font-size:10pt;font-weight:700;color:${MODERN_SLATE};line-height:1.25;word-wrap:normal;">${degree || '&#160;'}</p>
        <p style="margin:0;font-size:9.5pt;line-height:1.35;color:${MODERN_BODY_GRAY};word-wrap:normal;">${instLine || '&#160;'}</p>
      </div>`
    })
    .join('')
}

export function formatModernMain(document) {
  const parts = []
  if (document.summary) {
    parts.push(
      modernMainSectionHeader('Professional Summary'),
      `<p style="margin:0 0 14px 0;font-size:9.5pt;line-height:1.4;color:#000000;font-family:${MODERN_FONT};word-wrap:normal;">${escapeHtml(document.summary)}</p>`
    )
  }
  const experienceHtml = formatExperienceModern(document.experience)
  if (experienceHtml) {
    parts.push(modernMainSectionHeader('Experience', { gapBefore: Boolean(document.summary) }), experienceHtml)
  }
  const educationHtml = formatEducationModern(document.education)
  if (educationHtml) {
    parts.push(
      modernMainSectionHeader('Education', { gapBefore: Boolean(document.summary || experienceHtml) }),
      educationHtml
    )
  }
  return parts.join('')
}

function formatBulletsCreative(bullets, layout) {
  const bodyPt = layout?.bodyPt ?? CREATIVE_BODY_PT
  const lh = layout?.lineHeight ?? CREATIVE_LINE_HEIGHT
  const items = (bullets || [])
    .map((b) => `<li style="margin-bottom:2pt;line-height:${lh};font-size:${bodyPt}pt;color:#1a1a1a;">${escapeHtml(b)}</li>`)
    .join('')
  if (!items) return ''
  return `<ul class="resume-bullets" style="margin:3pt 0 0 0;padding-left:1.1em;list-style-type:disc;">${items}</ul>`
}

function formatExperienceCreative(experience, fitAdjustments = null) {
  if (!experience?.length) return ''
  const layout = resolveCreativeLayout(fitAdjustments)
  const bodyPt = layout.bodyPt
  const lh = layout.lineHeight
  const cardPad = layout.marginIn === CREATIVE_PDF_MARGIN_IN_TIGHT ? '8pt 10pt' : '10pt 12pt'
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      const loc = escapeHtml(job.location || '')
      return `<article class="experience-item creative-job-card resume-section" style="margin-bottom:${layout.jobGap};padding:${cardPad};border:1px solid #e2e8f0;border-radius:6px;background:rgba(30,58,95,0.04);page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:3pt;">
          <p style="margin:0;font-size:${bodyPt + 1.5}pt;font-weight:700;color:${CREATIVE_ACCENT};line-height:1.2;font-family:${CREATIVE_HEADING_FONT};">${company}</p>
          ${dates ? `<span style="font-size:${bodyPt}pt;color:#64748b;white-space:nowrap;">${dates}</span>` : ''}
        </div>
        <p style="margin:0 0 2pt 0;font-size:${bodyPt}pt;font-weight:600;color:#1a1a1a;line-height:${lh};">${title}${loc ? `<span style="font-weight:400;color:#64748b;"> · ${loc}</span>` : ''}</p>
        ${formatBulletsCreative(job.bullets, layout)}
      </article>`
    })
    .join('')
}

function minimalHorizontalRule({ color = MINIMAL_COLOR_RULE, weight = '1px', margin = '0' } = {}) {
  return `<hr style="border:none;border-top:${weight} solid ${color};margin:${margin};height:0;width:100%;" />`
}

function minimalSectionHeader(title, layout, { first = false } = {}) {
  const gap = layout.sectionGap
  const marginTop = first ? '0' : gap
  return `<div class="minimal-section-head" style="margin:${marginTop} 0 ${gap} 0;">
    <p style="margin:0 0 4pt 0;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:normal;color:${MINIMAL_COLOR_HEADER};font-family:${MINIMAL_FONT};line-height:${layout.lineHeight};">${escapeHtml(String(title).toUpperCase())}</p>
    ${minimalHorizontalRule({ color: MINIMAL_COLOR_RULE, weight: '0.5px' })}
  </div>`
}

function formatMinimalContactLine(document) {
  const c = document.contact || {}
  const linkedin = formatLinkedInDisplay(c.linkedin)
  const parts = [c.location, c.email, c.phone, linkedin]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
  if (!parts.length) return ''
  return parts.map((p) => escapeHtml(p)).join(' · ')
}

function formatMinimalHeader(document, layout) {
  const name = escapeHtml(document.name || '')
  const contact = formatMinimalContactLine(document)
  const bodyPt = layout.bodyPt
  const lh = layout.lineHeight
  const parts = [
    `<h1 style="margin:0 0 8pt 0;font-size:32pt;font-weight:700;color:${MINIMAL_COLOR_NAME};font-family:${MINIMAL_NAME_FONT};line-height:1.1;text-align:left;">${name}</h1>`,
    minimalHorizontalRule({ color: '#000000', weight: '1px', margin: '0 0 8pt 0' }),
  ]
  if (contact) {
    parts.push(
      `<p style="margin:0 0 8pt 0;font-size:9pt;line-height:${lh};color:${MINIMAL_COLOR_MUTED};font-family:${MINIMAL_FONT};text-align:left;">${contact}</p>`
    )
  }
  parts.push(minimalHorizontalRule({ color: MINIMAL_COLOR_RULE, weight: '1px', margin: '0' }))
  return `<header class="minimal-header" style="margin:0 0 ${layout.sectionGap} 0;">${parts.join('')}</header>`
}

function formatMinimalBullets(bullets, layout) {
  const list = bullets || []
  if (!list.length) return ''
  const bodyPt = layout.bodyPt
  const lh = layout.lineHeight
  return list
    .map((b) => {
      return `<p class="minimal-bullet-row" style="margin:0 0 ${MINIMAL_BULLET_GAP} 0;padding-left:10px;text-indent:-10px;font-size:${bodyPt}pt;line-height:${lh};color:${MINIMAL_COLOR_BODY};font-family:${MINIMAL_FONT};font-weight:400;"><span class="minimal-bullet-marker" style="display:inline-block;width:10px;margin-left:-10px;font-size:${bodyPt}pt;font-weight:400;">&#8226;</span><span class="minimal-bullet-text" style="font-weight:400;"> ${escapeHtml(b)}</span></p>`
    })
    .join('')
}

function formatMinimalExperience(experience, layout) {
  if (!experience?.length) return ''
  const lh = layout.lineHeight
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      const rowStyle =
        'display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;margin:0 0 2pt 0;'
      return `<div class="experience-item minimal-job" style="margin-bottom:${layout.jobGap};page-break-inside:avoid;font-family:${MINIMAL_FONT};">
        <div style="${rowStyle}">
          <span style="font-size:11pt;font-weight:700;color:${MINIMAL_COLOR_COMPANY};text-align:left;flex:1;min-width:0;">${company || '&#160;'}</span>
          ${dates ? `<span style="font-size:10pt;color:${MINIMAL_COLOR_MUTED};text-align:right;white-space:nowrap;flex-shrink:0;">${dates}</span>` : ''}
        </div>
        <p class="minimal-job-title" style="margin:0 0 4pt 0;font-size:10pt;font-style:italic;font-weight:400;color:${MINIMAL_COLOR_TITLE};text-align:left;line-height:${lh};font-family:${MINIMAL_FONT};">${title || '&#160;'}</p>
        ${formatMinimalBullets(job.bullets, layout)}
      </div>`
    })
    .join('')
}

function formatMinimalSkills(groups, layout) {
  if (!groups?.length) return ''
  const bodyPt = layout.bodyPt
  const lh = layout.lineHeight
  return groups
    .map((g) => {
      const label = escapeHtml(g.category || 'Skills')
      const items = (g.skills || []).map((s) => escapeHtml(String(s))).join(', ')
      return `<p class="minimal-skill-line" style="margin:0 0 4pt 0;font-size:${bodyPt}pt;line-height:${lh};color:${MINIMAL_COLOR_BODY};font-family:${MINIMAL_FONT};"><span style="font-weight:700;color:${MINIMAL_COLOR_BODY};">${label}:</span> ${items}</p>`
    })
    .join('')
}

function formatMinimalEducation(items, layout) {
  if (!Array.isArray(items) || items.length === 0) return ''
  const bodyPt = layout.bodyPt
  const lh = layout.lineHeight
  const rowStyle =
    'display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;margin:0;'
  return items
    .map((e) => {
      const degree = escapeHtml(e.degree || '')
      const inst = escapeHtml(e.institution || '')
      const year = escapeHtml(String(e.graduationYear || '').trim())
      return `<div class="education-item minimal-edu" style="margin-bottom:${layout.jobGap};page-break-inside:avoid;font-family:${MINIMAL_FONT};">
        <div style="${rowStyle}">
          <span style="font-size:${bodyPt}pt;font-weight:700;color:${MINIMAL_COLOR_COMPANY};text-align:left;flex:1;min-width:0;">${degree || '&#160;'}</span>
          ${year ? `<span style="font-size:${bodyPt}pt;color:${MINIMAL_COLOR_MUTED};text-align:right;white-space:nowrap;flex-shrink:0;">${year}</span>` : ''}
        </div>
        <p style="margin:2pt 0 0 0;font-size:${bodyPt}pt;font-style:italic;color:${MINIMAL_COLOR_MUTED};line-height:${lh};font-family:${MINIMAL_FONT};">${inst || '&#160;'}</p>
      </div>`
    })
    .join('')
}

function formatMinimalCertifications(items, layout) {
  if (!Array.isArray(items) || items.length === 0) return ''
  const bodyPt = layout.bodyPt
  const lh = layout.lineHeight
  return items
    .map((c) => {
      const name = escapeHtml(c.name || '')
      const issuer = c.issuer ? escapeHtml(c.issuer) : ''
      const year = c.year ? escapeHtml(String(c.year)) : ''
      const parts = [name, issuer, year].filter(Boolean)
      return `<p class="minimal-cert" style="margin:0 0 4pt 0;font-size:${bodyPt}pt;line-height:${lh};color:${MINIMAL_COLOR_BODY};font-family:${MINIMAL_FONT};">${parts.join(' · ')}</p>`
    })
    .join('')
}

/** Full Minimal template body (header + sections), inline styles only. */
export function formatMinimalResume(document, skillGroups, fitAdjustments = null) {
  const layout = resolveMinimalLayout(fitAdjustments)
  const bodyPt = layout.bodyPt
  const lh = layout.lineHeight
  const gap = layout.sectionGap
  const sections = []
  let sectionIndex = 0
  const nextFirst = () => sectionIndex++ === 0

  sections.push(formatMinimalHeader(document, layout))

  if (document.summary) {
    sections.push(
      minimalSectionHeader('Professional Summary', layout, { first: nextFirst() }),
      `<p style="margin:0 0 ${gap} 0;font-size:${bodyPt}pt;line-height:${lh};color:${MINIMAL_COLOR_BODY};font-family:${MINIMAL_FONT};">${escapeHtml(document.summary)}</p>`
    )
  }

  const experienceHtml = formatMinimalExperience(document.experience, layout)
  if (experienceHtml) {
    sections.push(
      minimalSectionHeader('Experience', layout, { first: nextFirst() }),
      `<div class="minimal-experience-block" style="margin:0 0 ${gap} 0;">${experienceHtml}</div>`
    )
  }

  const educationHtml = formatMinimalEducation(document.education, layout)
  if (educationHtml) {
    sections.push(
      minimalSectionHeader('Education', layout, { first: nextFirst() }),
      `<div class="minimal-education-block" style="margin:0 0 ${gap} 0;">${educationHtml}</div>`
    )
  }

  const certsHtml = formatMinimalCertifications(document.certifications, layout)
  if (certsHtml) {
    sections.push(
      minimalSectionHeader('Certifications', layout, { first: nextFirst() }),
      `<div class="minimal-certs-block" style="margin:0 0 ${gap} 0;">${certsHtml}</div>`
    )
  }

  const skillsHtml = formatMinimalSkills(skillGroups, layout)
  if (skillsHtml) {
    sections.push(
      minimalSectionHeader('Skills', layout, { first: nextFirst() }),
      `<div class="minimal-skills-block" style="margin:0;">${skillsHtml}</div>`
    )
  }

  return sections.join('')
}

export function formatExperienceHtml(experience, template = '', fitAdjustments = null) {
  const t = template?.toLowerCase()
  if (t === 'modern') return formatExperienceModern(experience)
  if (t === 'creative') return formatExperienceCreative(experience, fitAdjustments)
  if (t === 'minimal') return ''
  return formatExperienceAts(experience, fitAdjustments)
}

function formatSkillsAts(groups, fitAdjustments = null) {
  if (!groups?.length) return ''
  const layout = resolveAtsLayout(fitAdjustments)
  return groups
    .map((g) => {
      const items = (g.skills || []).map((s) => escapeHtml(String(s))).join(', ')
      const label = escapeHtml(g.category || 'Skills')
      return `<p class="skill-group resume-section" style="margin:0 0 2pt 0;font-size:${layout.compactPt}pt;line-height:${layout.lineHeight};font-family:${ATS_FONT};"><strong>${label}:</strong> ${items}</p>`
    })
    .join('')
}

function formatSkillsCreativeInline(groups, fitAdjustments = null) {
  if (!groups?.length) return ''
  const layout = resolveCreativeLayout(fitAdjustments)
  const bodyPt = layout.bodyPt
  const lh = layout.lineHeight
  return groups
    .map((g) => {
      const label = escapeHtml(g.category || 'Skills')
      const items = (g.skills || []).map((s) => escapeHtml(String(s))).join(', ')
      return `<p class="creative-skill-line skill-group resume-section" style="margin:0 0 4pt 0;font-size:${bodyPt}pt;line-height:${lh};color:#1a1a1a;font-family:${CREATIVE_FONT};"><span style="font-weight:700;color:${CREATIVE_ACCENT};font-family:${CREATIVE_HEADING_FONT};">${label}:</span> ${items}</p>`
    })
    .join('')
}

export function formatSkillGroupsHtml(skillGroups, template = '', fitAdjustments = null) {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) return ''
  const t = template?.toLowerCase()
  if (t === 'creative') return formatSkillsCreativeInline(skillGroups, fitAdjustments)
  if (t === 'minimal') return ''
  return formatSkillsAts(skillGroups, fitAdjustments)
}

export function formatEducationHtml(items, template = '') {
  const t = template?.toLowerCase()
  if (t === 'ats' && Array.isArray(items) && items.length > 0) {
    const fs = `${ATS_GENERAL_PT}pt`
    const rowStyle = `display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;margin:0;font-size:${fs};line-height:1.25;font-family:${ATS_FONT};`
    const leftGrow = 'flex:1;min-width:0;word-wrap:break-word;'
    const rightCell = 'flex-shrink:0;text-align:right;font-weight:bold;white-space:nowrap;'
    return items
      .map((e) => {
        const inst = escapeHtml(e.institution || '')
        const loc = escapeHtml(String(e.location || '').trim())
        const degree = escapeHtml(e.degree || '')
        const year = escapeHtml(String(e.graduationYear || '').trim())
        const instLine = [inst, loc].filter(Boolean).join(' | ')
        const gpaRaw = stripGpaPrefix(e.gpa)
        const gpa = gpaRaw ? escapeHtml(gpaRaw) : ''
        const gpaBlock = gpa ? `<p class="edu-gpa" style="margin:2pt 0 0 0;font-size:${fs};font-weight:normal;">GPA: ${gpa}</p>` : ''
        return `<div class="education-item resume-section" style="margin-bottom:8pt;font-family:${ATS_FONT};">
          <div class="ats-edu-degree-row" style="${rowStyle}">
            <span style="font-weight:bold;${leftGrow}">${degree || '&#160;'}</span>
            ${year ? `<span style="${rightCell}">${year}</span>` : ''}
          </div>
          <p class="ats-edu-inst-row" style="margin:0;font-size:${fs};font-weight:normal;line-height:1.25;">${instLine || '&#160;'}</p>
          ${gpaBlock}
        </div>`
      })
      .join('')
  }

  const fs = '10pt'
  const mb = t === 'ats' ? '8pt' : '6pt'
  const lh = '1.3'
  const fontFamily = ''
  const rowStyle = `display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;margin:0;font-size:${fs};line-height:${lh};${fontFamily}`
  const leftGrow = 'flex:1;min-width:0;word-wrap:break-word;'
  const rightCell = 'flex-shrink:0;text-align:right;margin-left:8px;max-width:40%;'
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
      const instWeight = 'font-weight:bold;'
      const row1 = `<div class="edu-row" style="${rowStyle}"><span style="${instWeight}${leftGrow}">${inst || '&#160;'}</span>${loc ? `<span style="${rightCell}">${loc}</span>` : `<span style="${rightCell}"></span>`}</div>`
      const row2 = `<div class="edu-row" style="${rowStyle}"><span style="${leftGrow}">${degree || '&#160;'}</span>${year ? `<span style="${rightCell}">${year}</span>` : `<span style="${rightCell}"></span>`}</div>`
      const gpaBlock = gpa ? `<p class="edu-gpa" style="margin:2pt 0 0 0;font-size:${fs};">GPA: ${gpa}</p>` : ''
      const honorsBlock = honors.length
        ? `<ul class="edu-honors" style="margin:2pt 0 0 0;padding-left:14px;list-style:disc;">${honors.map((h) => `<li style="font-size:${fs};">${escapeHtml(h)}</li>`).join('')}</ul>`
        : ''
      return `<div class="education-item resume-section" style="margin-bottom:${mb};">${row1}${row2}${gpaBlock}${honorsBlock}</div>`
    })
    .join('')
}

export function formatEducationBlock(items, template = '', fitAdjustments = null) {
  const inner = formatEducationHtml(items, template)
  if (!inner) return ''
  const t = template?.toLowerCase()
  const extraClass = t === 'ats' ? ' resume-section-block' : ''
  const mbStyle = t === 'ats' ? ` style="margin-bottom:${atsSectionBlockMargin(fitAdjustments)};"` : ''
  return `<div class="resume-education-block resume-section${extraClass}"${mbStyle}>${sectionHeading('Education', template, fitAdjustments)}${inner}</div>`
}

export function formatCertificationsHtml(items, template = '', sidebar = false, fitAdjustments = null) {
  const t = template?.toLowerCase()
  const layout = t === 'ats' ? resolveAtsLayout(fitAdjustments) : null
  const fs = sidebar ? '9.5pt' : t === 'ats' ? `${layout.compactPt}pt` : '10pt'
  const mb = sidebar ? '4pt' : t === 'ats' ? '2pt' : '6pt'
  const lh = t === 'ats' ? layout.lineHeight : '1.3'
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((c) => {
      const name = escapeHtml(c.name || '')
      const year = c.year ? escapeHtml(String(c.year)) : ''
      if (sidebar) {
        return `<p class="cert-item resume-section" style="margin:0 0 ${mb} 0;font-size:${fs};line-height:1.3;color:#1a1a1a;font-family:${MODERN_FONT};">${name}${year ? ` (${year})` : ''}</p>`
      }
      const issuer = c.issuer ? escapeHtml(c.issuer) : ''
      const mid = [name, issuer].filter(Boolean).join(' — ')
      const tail = year ? ` · ${year}` : ''
      return `<div class="cert-item resume-section" style="margin-bottom:${mb};"><p style="margin:0;font-size:${fs};line-height:${lh};">${mid}${tail}</p></div>`
    })
    .join('')
}

export function formatCertificationsBlock(items, template = '', fitAdjustments = null) {
  const inner = formatCertificationsHtml(items, template, false, fitAdjustments)
  if (!inner) return ''
  const t = template?.toLowerCase()
  const extraClass = t === 'ats' ? ' resume-section-block' : ''
  const mbStyle = t === 'ats' ? ` style="margin-bottom:${atsSectionBlockMargin(fitAdjustments)};"` : ''
  return `<div class="resume-certifications-block resume-section${extraClass}"${mbStyle}>${sectionHeading('Certifications', template, fitAdjustments)}${inner}</div>`
}

function formatContactLine(document, template) {
  const c = document.contact || {}
  const t = template?.toLowerCase()
  const linkedin = formatLinkedInDisplay(c.linkedin)
  const portfolio = String(c.portfolio || '').trim()

  if (t === 'ats') {
    const rawParts = []
    if (c.location?.trim()) rawParts.push(c.location.trim())
    if (c.phone?.trim()) rawParts.push(c.phone.trim())
    if (c.email?.trim()) rawParts.push(c.email.trim())
    if (linkedin) rawParts.push(linkedin)
    if (portfolio) {
      rawParts.push(portfolio.replace(/^https?:\/\//i, '').replace(/^www\./i, ''))
    }
    const line = rawParts.map((p) => escapeHtml(p)).join(' | ')
    return { line, extraLine: '', fontPt: ATS_CONTACT_PT, nowrap: false }
  }

  if (t === 'creative') {
    const rawParts = []
    if (c.location?.trim()) rawParts.push(c.location.trim())
    if (c.email?.trim()) rawParts.push(c.email.trim())
    if (c.phone?.trim()) rawParts.push(c.phone.trim())
    if (linkedin) rawParts.push(linkedin)
    if (portfolio) {
      rawParts.push(portfolio.replace(/^https?:\/\//i, '').replace(/^www\./i, ''))
    }
    const line = rawParts.map((p) => escapeHtml(p)).join(' · ')
    const contactHtml = line
      ? `<span class="creative-contact-line" style="display:block;font-size:9pt;line-height:1.3;color:#475569;font-family:${CREATIVE_FONT};white-space:nowrap;">${line}</span>`
      : ''
    return { line: contactHtml, extraLine: '', fontPt: 9, nowrap: true }
  }

  const parts = [c.email, c.phone, c.location].map((x) => String(x || '').trim()).filter(Boolean)
  const line = parts.map((p) => escapeHtml(p)).join(' · ')
  const extras = []
  if (linkedin) extras.push(escapeHtml(linkedin))
  if (portfolio) extras.push(escapeHtml(portfolio.replace(/^https?:\/\//i, '').replace(/^www\./i, '')))
  const extraLine = extras.join(' · ')
  return { line, extraLine }
}

function formatSidebarContact(document) {
  const c = document.contact || {}
  const blocks = []
  const pStyle = `margin:0 0 4pt 0;font-size:9.5pt;line-height:1.35;color:#1a1a1a;font-family:${MODERN_FONT};`
  if (c.email?.trim()) {
    blocks.push(`<p style="${pStyle}">${escapeHtml(c.email.trim())}</p>`)
  }
  if (c.phone?.trim()) {
    blocks.push(`<p style="${pStyle}">${escapeHtml(c.phone.trim())}</p>`)
  }
  if (c.location?.trim()) {
    blocks.push(`<p style="${pStyle}">${escapeHtml(c.location.trim())}</p>`)
  }
  const linkedin = formatLinkedInDisplay(c.linkedin)
  if (linkedin) {
    blocks.push(`<p style="${pStyle}">${escapeHtml(linkedin)}</p>`)
  }
  if (c.portfolio?.trim()) {
    const p = c.portfolio.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
    blocks.push(`<p style="margin:0;font-size:9.5pt;line-height:1.35;color:#1a1a1a;font-family:${MODERN_FONT};">${escapeHtml(p)}</p>`)
  }
  return blocks.join('')
}

export function getPdfStyles(template = '', fitAdjustments = null) {
  const t = template?.toLowerCase()
  let templateRules = 'body { font-size: 10.5pt; line-height: 1.3; }'
  if (t === 'ats') {
    const layout = resolveAtsLayout(fitAdjustments)
    templateRules = `
  body.tpl-ats { font-family: Georgia, 'Times New Roman', Times, serif !important; color: #000 !important; font-size: ${layout.bodyPt}pt; line-height: 1.25; }
  body.tpl-ats .resume-header { text-align: left !important; margin: 0 0 ${ATS_HEADER_AFTER_RULE} !important; }
  body.tpl-ats h1.resume-name { font-size: ${layout.namePt}pt !important; font-weight: bold !important; text-align: left !important; font-family: Georgia, 'Times New Roman', Times, serif !important; margin: 0 !important; }
  body.tpl-ats .ats-name-rule { border: none !important; border-top: 0.5pt solid #000 !important; margin: 4pt 0 6pt 0 !important; }
  body.tpl-ats .resume-contact { text-align: left !important; font-size: ${ATS_CONTACT_PT}pt !important; font-weight: normal !important; margin: 0 !important; }
  body.tpl-ats .resume-section-heading.ats-heading { font-size: ${ATS_SECTION_HEADER_PT}pt !important; text-transform: uppercase !important; }
  body.tpl-ats .resume-section-block { margin-bottom: ${layout.sectionSpacing} !important; }
  body.tpl-ats .ats-section-rule { border: none !important; border-top: 0.5pt solid #000 !important; margin: 2pt 0 ${layout.sectionRuleAfter} !important; }
  body.tpl-ats .experience-item { margin-bottom: ${layout.jobBlockSpacing} !important; }
  body.tpl-ats .resume-bullets.ats-bullets { margin: 1pt 0 0 0 !important; }
  body.tpl-ats .ats-bullet-row { display: flex !important; align-items: flex-start !important; margin-bottom: ${layout.bulletGap} !important; padding-left: 0.12in !important; font-size: ${layout.compactPt}pt !important; line-height: ${layout.lineHeight} !important; }
  body.tpl-ats .skill-group { font-size: ${layout.compactPt}pt !important; line-height: ${layout.lineHeight} !important; margin-bottom: 2pt !important; }
  body.tpl-ats .cert-item p { font-size: ${layout.compactPt}pt !important; line-height: ${layout.lineHeight} !important; }
  body.tpl-ats .ats-bullet-marker { flex-shrink: 0 !important; }`
  } else if (t === 'modern') {
    templateRules = `
  html, body.tpl-modern { height: 100% !important; margin: 0 !important; padding: 0 !important; font-family: ${MODERN_FONT} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body.tpl-modern table { width: 100% !important; height: 100% !important; min-height: 11in !important; border-collapse: collapse !important; table-layout: fixed !important; }
  body.tpl-modern table > tbody > tr { height: 100% !important; }
  body.tpl-modern td:first-child { height: 100% !important; min-height: 11in !important; vertical-align: top !important; background-color: ${MODERN_SLATE} !important; }`
  } else if (t === 'minimal') {
    const layout = resolveMinimalLayout(fitAdjustments)
    templateRules = `
  body.tpl-minimal { font-family: ${MINIMAL_FONT} !important; font-size: ${layout.bodyPt}pt !important; line-height: ${layout.lineHeight} !important; font-weight: 400 !important; color: ${MINIMAL_COLOR_BODY} !important; background: #ffffff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body.tpl-minimal .minimal-bullet-row,
  body.tpl-minimal .minimal-bullet-marker,
  body.tpl-minimal .minimal-bullet-text { font-weight: 400 !important; }
  body.tpl-minimal .minimal-bullet-row { margin-bottom: 0 !important; }
  body.tpl-minimal h1 { font-family: ${MINIMAL_NAME_FONT} !important; font-size: 32pt !important; font-weight: 700 !important; }`
  } else if (t === 'creative') {
    const layout = resolveCreativeLayout(fitAdjustments)
    templateRules = `
  body.tpl-creative { font-family: ${CREATIVE_FONT} !important; font-size: ${layout.bodyPt}pt !important; line-height: ${layout.lineHeight} !important; color: #1a1a1a !important; margin: 0 !important; padding: 0 !important; }
  body.tpl-creative h1 { font-family: ${CREATIVE_HEADING_FONT} !important; font-size: 28pt !important; }
  body.tpl-creative .creative-heading,
  body.tpl-creative .resume-education-block > h2,
  body.tpl-creative .resume-certifications-block > h2,
  body.tpl-creative .resume-skills-block > h2 { white-space: nowrap !important; letter-spacing: normal !important; word-break: normal !important; }
  body.tpl-creative .creative-contact-line,
  body.tpl-creative .resume-contact { font-size: 9pt !important; white-space: nowrap !important; }`
  }

  return `<style id="resume-pdf-base-styles">
  @page { size: letter; margin: ${getPdfMarginIn(t, fitAdjustments)}; }
  html, body { margin: 0 !important; padding: 0 !important; }
  .experience-item, .resume-section { page-break-inside: avoid; }
  h1, h2, .resume-section-heading { page-break-after: avoid; }
  ${templateRules}
  </style>`
}

/** @deprecated use getPdfStyles(template) */
export const PDF_STYLES = getPdfStyles()

export function buildReplacements(document, template = '', { skipFit = false } = {}) {
  const fitted = skipFit ? document : fitContentForTemplate(document, template)
  const t = template?.toLowerCase()
  const fitAdjustments =
    t === 'ats'
      ? fitted._fitAdjustments || getDefaultAtsFitAdjustments()
      : t === 'minimal'
        ? fitted._fitAdjustments || getDefaultMinimalFitAdjustments()
        : t === 'creative'
          ? fitted._fitAdjustments || getDefaultCreativeFitAdjustments()
          : fitted._fitAdjustments || null
  const groups = skillGroupsFromDocument(fitted)
  const contact = formatContactLine(fitted, t)
  const atsLayout = t === 'ats' ? resolveAtsLayout(fitAdjustments) : null
  const creativeLayout = t === 'creative' ? resolveCreativeLayout(fitAdjustments) : null
  const bodyPt =
    t === 'ats'
      ? `${atsLayout.bodyPt}pt`
      : t === 'minimal'
        ? '10.5pt'
        : t === 'creative'
          ? `${creativeLayout.bodyPt}pt`
          : '10pt'
  const bodyLh =
    t === 'minimal' ? '1.45' : t === 'creative' ? `${creativeLayout.lineHeight}` : t === 'ats' ? '1.25' : '1.35'

  const atsMb = t === 'ats' ? atsSectionBlockMargin(fitAdjustments) : null
  const summaryBlock =
    t === 'modern' || t === 'minimal'
      ? ''
      : fitted.summary
        ? `<div class="resume-summary-block resume-section"${atsMb ? ` style="margin-bottom:${atsMb};"` : ''}>${sectionHeading(t === 'ats' ? 'Professional Summary' : 'Summary', t, fitAdjustments)}<p style="margin:0;font-size:${bodyPt};line-height:${bodyLh};color:#000;font-family:${t === 'ats' ? ATS_FONT : 'inherit'};">${escapeHtml(fitted.summary)}</p></div>`
        : ''

  const experienceHtml = formatExperienceHtml(fitted.experience, template, fitAdjustments)
  const experienceBlock =
    t === 'modern' || t === 'minimal'
      ? ''
      : t === 'ats' && experienceHtml
        ? `<div class="resume-experience-block resume-section-block resume-section" style="margin-bottom:${atsMb};">${sectionHeading('Experience', template, fitAdjustments)}${experienceHtml}</div>`
        : t === 'creative' && experienceHtml
          ? `${sectionHeading('Experience', template, fitAdjustments)}${experienceHtml}`
          : experienceHtml

  return {
    '{{name}}': escapeHtml(fitted.name || ''),
    '{{email}}': escapeHtml(fitted.contact?.email || ''),
    '{{phone}}': escapeHtml(fitted.contact?.phone || ''),
    '{{location}}': escapeHtml(fitted.contact?.location || ''),
    '{{contact_line}}':
      t === 'ats'
        ? `<span style="font-size:${contact.fontPt || ATS_CONTACT_PT}pt;line-height:1.3;font-weight:normal;">${contact.line}</span>`
        : t === 'creative'
          ? contact.line
          : contact.line,
    '{{contact_extra_line}}': contact.extraLine,
    '{{contact_urls_block}}':
      t === 'ats' || t === 'creative' || !contact.extraLine
        ? ''
        : `<p style="margin:3pt 0 0 0;font-size:10pt;line-height:1.3;" class="contact-line resume-contact-line">${contact.extraLine}</p>`,
    '{{sidebar_name}}': escapeHtml(fitted.name || ''),
    '{{sidebar_contact}}': t === 'modern' ? '' : formatSidebarContact(fitted),
    '{{sidebar_skills}}': '',
    '{{sidebar_certifications}}': '',
    '{{sidebar_certifications_block}}': '',
    '{{modern_sidebar}}': t === 'modern' ? formatModernSidebar(fitted, groups) : '',
    '{{modern_main}}': t === 'modern' ? formatModernMain(fitted) : '',
    '{{minimal_content}}': t === 'minimal' ? formatMinimalResume(fitted, groups, fitAdjustments) : '',
    '{{summary}}': escapeHtml(fitted.summary || ''),
    '{{summary_block}}': summaryBlock,
    '{{experience}}': experienceHtml,
    '{{experience_block}}': experienceBlock,
    '{{education_block}}':
      t === 'modern' || t === 'minimal' ? '' : formatEducationBlock(fitted.education, template, fitAdjustments),
    '{{projects_block}}': formatProjectsBlock(fitted.projects, template, fitAdjustments),
    '{{certifications_block}}':
      t === 'modern' || t === 'minimal'
        ? ''
        : formatCertificationsBlock(fitted.certifications, template, fitAdjustments),
    '{{skills}}': t === 'modern' || t === 'minimal' ? '' : formatSkillGroupsHtml(groups, template),
    '{{skills_block}}':
      t === 'modern' || t === 'minimal' || !groups.length
        ? ''
        : t === 'ats'
          ? `<div class="resume-skills-block resume-section-block resume-section" style="margin-bottom:${atsMb};">${sectionHeading('Skills', template, fitAdjustments)}${formatSkillGroupsHtml(groups, template, fitAdjustments)}</div>`
          : `<div class="resume-skills-block resume-section-block resume-section"${t === 'creative' ? ` style="margin-bottom:${creativeLayout.sectionGap};"` : ''}>${sectionHeading('Skills', template, fitAdjustments)}${formatSkillGroupsHtml(groups, template, fitAdjustments)}</div>`,
  }
}

export function normalizeClientResumeContentForRender(clientContent, profile, template = '') {
  let { document, skillGroups, flatSkills } = normalizeResumeDocument(clientContent, profile)
  document = fitContentForTemplate(document, template)
  const fitAdjustments = document._fitAdjustments
  ;({ document, skillGroups, flatSkills } = normalizeResumeDocument(document, profile))
  if (template?.toLowerCase() === 'ats') {
    applyAtsContentCaps(document)
    document._fitAdjustments = fitAdjustments || getDefaultAtsFitAdjustments()
  }
  if (template?.toLowerCase() === 'modern') {
    applyModernContentCaps(document)
  }
  if (template?.toLowerCase() === 'minimal') {
    document._fitAdjustments = fitAdjustments || getDefaultMinimalFitAdjustments()
  }
  if (template?.toLowerCase() === 'creative') {
    document._fitAdjustments = fitAdjustments || getDefaultCreativeFitAdjustments()
  }
  const replacements = buildReplacements(document, template, { skipFit: true })
  const output = toLegacyContentOut(document, skillGroups, flatSkills)
  return { output, replacements, document }
}
