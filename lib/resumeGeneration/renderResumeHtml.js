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
const MODERN_ACCENT = '#1a1a2e'
const MODERN_SIDEBAR_BG = '#f0f4f8'
const MODERN_SIDEBAR_PADDING = '12px'
const MODERN_MAIN_PADDING = '20px'
const MODERN_BULLET_GAP = '4pt'
const MODERN_BULLET_LH = '1.35'
const MODERN_NAME_PT = 22
const MODERN_MAX_SKILL_CATEGORIES = 4
const MODERN_MAX_SKILLS_PER_CATEGORY = 4
const MODERN_MAX_CERTIFICATIONS = 3
const MODERN_SIDEBAR_MIN_HEIGHT = '9.4in'

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

export function getPdfMarginIn(template = '', fitAdjustments = null) {
  const t = template?.toLowerCase()
  if (t === 'ats') {
    return fitAdjustments?.marginIn || ATS_PDF_MARGIN_IN
  }
  if (t === 'modern') {
    return MODERN_PDF_MARGIN_IN
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

function sectionHeading(title, template, fitAdjustments = null) {
  const t = template?.toLowerCase()
  if (t === 'minimal') {
    const spaced = title
      .toUpperCase()
      .split('')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    return `<h2 class="resume-section-heading minimal-heading" style="margin:18px 0 7px 0;font-size:9.5pt;font-weight:400;letter-spacing:0.18em;text-transform:uppercase;color:#1a1a1a;">${escapeHtml(spaced)}</h2>`
  }
  if (t === 'modern') {
    return `<h2 class="resume-section-heading modern-heading" style="margin:0 0 6pt 0;font-size:10.5pt;font-weight:700;text-transform:uppercase;color:${MODERN_ACCENT};border-bottom:2px solid ${MODERN_ACCENT};padding-bottom:3px;font-family:${MODERN_FONT};">${escapeHtml(title)}</h2>`
  }
  if (t === 'creative') {
    return `<h2 class="resume-section-heading creative-heading" style="margin:14px 0 8px 0;font-size:12.5pt;font-weight:700;font-family:'Playfair Display',Georgia,serif;color:#1e3a5f;">${escapeHtml(title)}</h2>`
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

function formatBulletsModern(bullets) {
  const items = (bullets || [])
    .map(
      (b) =>
        `<p class="modern-bullet-row" style="margin:0 0 ${MODERN_BULLET_GAP} 0;padding-left:10pt;text-indent:-10pt;line-height:${MODERN_BULLET_LH};font-size:10pt;color:#1a1a1a;font-family:${MODERN_FONT};"><span style="display:inline-block;width:10pt;margin-left:-10pt;">&#8226;</span> ${escapeHtml(b)}</p>`
    )
    .join('')
  if (!items) return ''
  return `<div class="resume-bullets modern-bullets" style="margin:2pt 0 0 0;">${items}</div>`
}

function formatExperienceModern(experience) {
  if (!experience?.length) return ''
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      return `<div class="experience-item resume-section" style="margin-bottom:8pt;page-break-inside:avoid;font-family:${MODERN_FONT};">
        <p style="margin:0 0 2pt 0;font-size:10.5pt;font-weight:700;color:#1a1a1a;line-height:1.25;">${company}</p>
        <p style="margin:0 0 3pt 0;font-size:10pt;line-height:1.3;color:#1a1a1a;">
          <strong>${title}</strong>${dates ? ` | ${dates}` : ''}
        </p>
        ${formatBulletsModern(job.bullets)}
      </div>`
    })
    .join('')
}

function formatBulletsCreative(bullets) {
  const items = (bullets || [])
    .map((b) => `<li style="margin-bottom:3pt;line-height:1.35;font-size:10pt;color:#1a1a1a;">${escapeHtml(b)}</li>`)
    .join('')
  if (!items) return ''
  return `<ul class="resume-bullets" style="margin:4pt 0 0 0;padding-left:1.1em;list-style-type:disc;">${items}</ul>`
}

function formatExperienceCreative(experience) {
  if (!experience?.length) return ''
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      const loc = escapeHtml(job.location || '')
      return `<article class="experience-item creative-job-card resume-section" style="margin-bottom:10pt;padding:12pt 14pt;border:1px solid #e2e8f0;border-radius:6px;background:rgba(30,58,95,0.04);page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4pt;">
          <p style="margin:0;font-size:11.5pt;font-weight:700;color:#1e3a5f;line-height:1.2;">${company}</p>
          ${dates ? `<span style="font-size:9.5pt;color:#64748b;white-space:nowrap;">${dates}</span>` : ''}
        </div>
        <p style="margin:0 0 2pt 0;font-size:10.5pt;font-weight:600;color:#1a1a1a;">${title}${loc ? `<span style="font-weight:400;color:#64748b;"> · ${loc}</span>` : ''}</p>
        ${formatBulletsCreative(job.bullets)}
      </article>`
    })
    .join('')
}

function formatExperienceMinimal(experience) {
  if (!experience?.length) return ''
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '').replace(/–/g, '–')
      const bullets = (job.bullets || [])
        .map((b) => `<p style="margin:0 0 2pt 0;font-size:10.5pt;line-height:1.45;color:#1a1a1a;">— ${escapeHtml(b)}</p>`)
        .join('')
      return `<div class="experience-item resume-section" style="margin-bottom:14pt;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:2pt;">
          <span style="font-size:10.5pt;font-weight:400;color:#666666;">${company}</span>
          ${dates ? `<span style="font-size:10pt;color:#999999;white-space:nowrap;">${dates}</span>` : ''}
        </div>
        <p style="margin:0 0 4pt 0;font-size:10.5pt;font-weight:600;color:#1a1a1a;">${title}</p>
        ${bullets}
      </div>`
    })
    .join('')
}

export function formatExperienceHtml(experience, template = '', fitAdjustments = null) {
  const t = template?.toLowerCase()
  if (t === 'modern') return formatExperienceModern(experience)
  if (t === 'creative') return formatExperienceCreative(experience)
  if (t === 'minimal') return formatExperienceMinimal(experience)
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

function formatSkillsModernSidebar(groups) {
  if (!groups?.length) return ''
  return groups
    .map((g) => {
      const cat = escapeHtml((g.category || 'Skills').toUpperCase())
      const items = (g.skills || [])
        .map(
          (s) =>
            `<p style="margin:0 0 1pt 0;font-size:9pt;line-height:1.3;color:#1a1a1a;font-family:${MODERN_FONT};">${escapeHtml(s)}</p>`
        )
        .join('')
      return `<div class="skill-group resume-section" style="margin-bottom:6pt;font-family:${MODERN_FONT};">
        <p class="sidebar-skill-cat" style="margin:0 0 3pt 0;font-size:9pt;font-weight:700;text-transform:uppercase;color:${MODERN_ACCENT};">${cat}</p>
        ${items}
      </div>`
    })
    .join('')
}

export function formatModernSidebarCertificationsBlock(items) {
  const inner = formatCertificationsHtml(items, 'modern', true)
  if (!inner) return ''
  return `<div class="sidebar-bottom-block">
    <p class="sidebar-label" style="margin:0 0 4pt 0;font-size:9pt;font-weight:700;text-transform:uppercase;color:${MODERN_ACCENT};font-family:${MODERN_FONT};">Certifications</p>
    ${inner}
  </div>`
}

function formatSkillsCreativeChips(groups) {
  if (!groups?.length) return ''
  return groups
    .map((g) => {
      const chips = (g.skills || [])
        .map(
          (s) =>
            `<span style="display:inline-block;margin:0 4pt 4pt 0;padding:3pt 8pt;font-size:9pt;border:1px solid #cbd5e1;border-radius:12px;background:rgba(30,58,95,0.08);color:#1a1a1a;">${escapeHtml(s)}</span>`
        )
        .join('')
      return `<div class="skill-group resume-section" style="margin-bottom:10pt;">
        <p style="margin:0 0 6pt 0;font-size:10pt;font-weight:700;color:#1e3a5f;font-family:'Playfair Display',Georgia,serif;">${escapeHtml(g.category || 'Skills')}</p>
        <div>${chips}</div>
      </div>`
    })
    .join('')
}

function formatSkillsMinimalInline(groups) {
  if (!groups?.length) return ''
  return groups
    .map((g) => {
      const items = (g.skills || []).map((s) => escapeHtml(String(s))).join(', ')
      return `<p class="skill-group resume-section" style="margin:0 0 6pt 0;font-size:10.5pt;line-height:1.45;">
        <span style="color:#666666;">${escapeHtml(g.category || 'Skills')}</span>
        <span style="color:#1a1a1a;"> &nbsp;—&nbsp; ${items}</span>
      </p>`
    })
    .join('')
}

export function formatSkillGroupsHtml(skillGroups, template = '', fitAdjustments = null) {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) return ''
  const t = template?.toLowerCase()
  if (t === 'modern') return formatSkillsModernSidebar(skillGroups)
  if (t === 'creative') return formatSkillsCreativeChips(skillGroups)
  if (t === 'minimal') return formatSkillsMinimalInline(skillGroups)
  return formatSkillsAts(skillGroups, fitAdjustments)
}

export function formatEducationHtml(items, template = '') {
  const t = template?.toLowerCase()
  if (t === 'modern' && Array.isArray(items) && items.length > 0) {
    return items
      .map((e) => {
        const inst = escapeHtml(e.institution || '')
        const degree = escapeHtml(e.degree || '')
        const year = escapeHtml(String(e.graduationYear || '').trim())
        const line2 = [degree, year].filter(Boolean).join(' — ')
        return `<div class="education-item resume-section" style="margin-bottom:8pt;font-family:${MODERN_FONT};">
          <p style="margin:0 0 2pt 0;font-size:10pt;font-weight:700;color:#1a1a1a;line-height:1.25;">${inst || '&#160;'}</p>
          <p style="margin:0;font-size:10pt;line-height:1.3;color:#1a1a1a;">${line2 || '&#160;'}</p>
        </div>`
      })
      .join('')
  }
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

  const fs = t === 'minimal' ? '10.5pt' : '10pt'
  const mb = t === 'minimal' ? '12pt' : t === 'ats' ? '8pt' : '6pt'
  const lh = t === 'minimal' ? '1.45' : '1.3'
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
      const instWeight = t === 'minimal' ? 'font-weight:400;color:#666666;' : 'font-weight:bold;'
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
  body.tpl-modern { font-family: ${MODERN_FONT} !important; font-size: 10pt !important; line-height: 1.35 !important; color: #1a1a1a !important; }
  body.tpl-modern table.modern-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; }
  body.tpl-modern td.modern-sidebar-cell { width: 30% !important; vertical-align: top !important; background: ${MODERN_SIDEBAR_BG} !important; padding: ${MODERN_SIDEBAR_PADDING} !important; }
  body.tpl-modern td.modern-main-cell { width: 70% !important; vertical-align: top !important; background: #ffffff !important; padding: ${MODERN_MAIN_PADDING} !important; }
  body.tpl-modern table.sidebar-inner { width: 100% !important; height: ${MODERN_SIDEBAR_MIN_HEIGHT} !important; border-collapse: collapse !important; }
  body.tpl-modern h1.resume-name { font-size: ${MODERN_NAME_PT}pt !important; color: ${MODERN_ACCENT} !important; white-space: nowrap !important; margin: 0 0 10pt 0 !important; line-height: 1.1 !important; }
  body.tpl-modern p.sidebar-label { color: ${MODERN_ACCENT} !important; font-weight: bold !important; }
  body.tpl-modern p.sidebar-skill-cat { color: ${MODERN_ACCENT} !important; }
  body.tpl-modern h2.modern-heading { font-size: 10.5pt !important; color: ${MODERN_ACCENT} !important; border-bottom: 2px solid ${MODERN_ACCENT} !important; }
  body.tpl-modern td.modern-sidebar-cell p { color: #1a1a1a !important; }
  body.tpl-modern .modern-bullet-row { font-size: 10pt !important; color: #1a1a1a !important; line-height: ${MODERN_BULLET_LH} !important; margin-bottom: ${MODERN_BULLET_GAP} !important; }`
  } else if (t === 'minimal') {
    templateRules = `
  body.tpl-minimal { font-family: Inter, Helvetica Neue, sans-serif !important; color: #1a1a1a !important; line-height: 1.45; }
  body.tpl-minimal h1 { font-size: 26pt; font-weight: 300 !important; }
  body.tpl-minimal .minimal-heading { letter-spacing: 0.18em !important; }`
  } else if (t === 'creative') {
    templateRules = `
  body.tpl-creative { font-family: 'Source Sans 3', Open Sans, sans-serif !important; }
  body.tpl-creative h1 { font-family: 'Playfair Display', Georgia, serif !important; font-size: 34pt !important; }`
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
    t === 'ats' ? fitted._fitAdjustments || getDefaultAtsFitAdjustments() : fitted._fitAdjustments || null
  const groups = skillGroupsFromDocument(fitted)
  const contact = formatContactLine(fitted, t)
  const atsLayout = t === 'ats' ? resolveAtsLayout(fitAdjustments) : null
  const bodyPt = t === 'ats' ? `${atsLayout.bodyPt}pt` : `${t === 'minimal' ? 10.5 : 10}pt`
  const bodyLh = t === 'minimal' ? '1.45' : t === 'ats' ? '1.25' : '1.35'

  const atsMb = t === 'ats' ? atsSectionBlockMargin(fitAdjustments) : null
  const summaryBlock = fitted.summary
    ? `<div class="resume-summary-block resume-section"${atsMb ? ` style="margin-bottom:${atsMb};"` : t === 'modern' ? ' style="margin-bottom:10pt;"' : ''}>${sectionHeading(t === 'ats' ? 'Professional Summary' : 'Summary', t, fitAdjustments)}<p style="margin:0;font-size:${bodyPt};line-height:${bodyLh};color:${t === 'modern' ? '#1a1a1a' : '#000'};font-family:${t === 'ats' ? ATS_FONT : t === 'modern' ? MODERN_FONT : 'inherit'};">${escapeHtml(fitted.summary)}</p></div>`
    : ''

  const experienceHtml = formatExperienceHtml(fitted.experience, template, fitAdjustments)
  const experienceBlock =
    t === 'ats' && experienceHtml
      ? `<div class="resume-experience-block resume-section-block resume-section" style="margin-bottom:${atsMb};">${sectionHeading('Experience', template, fitAdjustments)}${experienceHtml}</div>`
      : t === 'modern' && experienceHtml
        ? `<div class="resume-experience-block resume-section" style="margin-bottom:10pt;">${sectionHeading('Experience', template)}${experienceHtml}</div>`
        : experienceHtml

  return {
    '{{name}}': escapeHtml(fitted.name || ''),
    '{{email}}': escapeHtml(fitted.contact?.email || ''),
    '{{phone}}': escapeHtml(fitted.contact?.phone || ''),
    '{{location}}': escapeHtml(fitted.contact?.location || ''),
    '{{contact_line}}':
      t === 'ats'
        ? `<span style="font-size:${contact.fontPt || ATS_CONTACT_PT}pt;line-height:1.3;font-weight:normal;">${contact.line}</span>`
        : contact.line,
    '{{contact_extra_line}}': contact.extraLine,
    '{{contact_urls_block}}':
      t === 'ats' || !contact.extraLine
        ? ''
        : `<p style="margin:3pt 0 0 0;font-size:10pt;line-height:1.3;" class="contact-line resume-contact-line">${contact.extraLine}</p>`,
    '{{sidebar_name}}':
      t === 'modern'
        ? `<h1 class="resume-name" style="margin:0 0 10pt 0;font-size:${MODERN_NAME_PT}pt;font-weight:700;line-height:1.1;color:${MODERN_ACCENT};white-space:nowrap;font-family:${MODERN_FONT};">${escapeHtml(fitted.name || '')}</h1>`
        : escapeHtml(fitted.name || ''),
    '{{sidebar_contact}}': formatSidebarContact(fitted),
    '{{sidebar_skills}}': t === 'modern' ? formatSkillsModernSidebar(groups) : '',
    '{{sidebar_certifications}}': '',
    '{{sidebar_certifications_block}}':
      t === 'modern' ? formatModernSidebarCertificationsBlock(fitted.certifications) : '',
    '{{summary}}': escapeHtml(fitted.summary || ''),
    '{{summary_block}}': summaryBlock,
    '{{experience}}': experienceHtml,
    '{{experience_block}}': experienceBlock,
    '{{education_block}}': formatEducationBlock(fitted.education, template, fitAdjustments),
    '{{projects_block}}': formatProjectsBlock(fitted.projects, template, fitAdjustments),
    '{{certifications_block}}':
      t === 'modern' ? '' : formatCertificationsBlock(fitted.certifications, template, fitAdjustments),
    '{{skills}}': t === 'modern' ? '' : formatSkillGroupsHtml(groups, template),
    '{{skills_block}}':
      t === 'modern' || !groups.length
        ? ''
        : t === 'ats'
          ? `<div class="resume-skills-block resume-section-block resume-section" style="margin-bottom:${atsMb};">${sectionHeading('Skills', template, fitAdjustments)}${formatSkillGroupsHtml(groups, template, fitAdjustments)}</div>`
          : `<div class="resume-skills-block resume-section-block resume-section">${sectionHeading('Skills', template)}${formatSkillGroupsHtml(groups, template)}</div>`,
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
  const replacements = buildReplacements(document, template, { skipFit: true })
  const output = toLegacyContentOut(document, skillGroups, flatSkills)
  return { output, replacements, document }
}
