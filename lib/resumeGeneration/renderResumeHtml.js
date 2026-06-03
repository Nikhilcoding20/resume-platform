import {
  normalizeResumeDocument,
  toLegacyContentOut,
  stripGpaPrefix,
  flattenAndDedupeBullets,
  strictDedupeBullets,
  dedupeExperienceBullets,
} from '@/lib/resumeGeneration/normalizeResumeDocument'

export const PDF_MARGIN_IN = '0.75in'
export const ATS_PDF_MARGIN_IN = '0.65in'
const ATS_BODY_PT = 10.5
const ATS_NAME_PT = 28
const ATS_SECTION_HEADER_PT = 11
const ATS_CONTACT_PT = 10
const ATS_COMPANY_PT = 9.5
const ATS_BULLET_LINE_HEIGHT = 1.4
const ATS_BULLET_GAP = '3pt'
const ATS_HEADER_AFTER_RULE = '8pt'
const ATS_SECTION_SPACING = '12pt'
const ATS_JOB_BLOCK_SPACING = '10pt'
const ATS_FONT = "Georgia,'Times New Roman',Times,serif"

export function getPdfMarginIn(template = '') {
  return template?.toLowerCase() === 'ats' ? ATS_PDF_MARGIN_IN : PDF_MARGIN_IN
}

function atsBodyPt(fitAdjustments = null) {
  const fontDelta = fitAdjustments?.fontSizeDelta || 0
  return Math.max(9.5, ATS_BODY_PT + fontDelta)
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

const ATS_MAX_SKILL_CATEGORIES = 4
const ATS_MAX_SKILLS_PER_CATEGORY = 5
const ATS_SUMMARY_SENTENCES = 4

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

function enforceAtsHardLimits(doc) {
  doc.experience = dedupeExperienceBullets(doc.experience)
  doc.experience = applyRoleBulletLimits(doc.experience, 'ats')
  trimSkillsPerCategory(doc, ATS_MAX_SKILLS_PER_CATEGORY, ATS_MAX_SKILL_CATEGORIES)
  doc.summary = trimSummaryToSentences(doc.summary, ATS_SUMMARY_SENTENCES)
  return doc
}

/** Iteratively trim ATS content until estimated lines fit one page. */
function fitAtsContentToOnePage(doc, limit) {
  enforceAtsHardLimits(doc)
  if (estimateContentLines(doc, 'ats') <= limit) return doc

  let passes = 0
  while (estimateContentLines(doc, 'ats') > limit && passes < 24) {
    passes += 1

    doc.experience = applyAllRolesBulletCap(doc.experience, 3)
    if (estimateContentLines(doc, 'ats') <= limit) break

    trimSkillsPerCategory(doc, 4, ATS_MAX_SKILL_CATEGORIES)
    if (estimateContentLines(doc, 'ats') <= limit) break

    if (skillGroupsFromDocument(doc).length > 1) {
      dropLastSkillsCategory(doc)
      trimSkillsPerCategory(doc, 4, ATS_MAX_SKILL_CATEGORIES)
      if (estimateContentLines(doc, 'ats') <= limit) break
    }

    doc.summary = trimSummaryToSentences(doc.summary, ATS_SUMMARY_SENTENCES)
    if (estimateContentLines(doc, 'ats') <= limit) break
  }

  if (estimateContentLines(doc, 'ats') > limit) {
    doc._fitAdjustments = { fontSizeDelta: -0.5, lineHeight: 1.15 }
  }
  return doc
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
  const bulletFactor = t === 'ats' ? 1.12 : 1.2
  const headerLines = t === 'ats' ? 5 : 8
  let lines = headerLines
  lines += Math.ceil(String(document.summary || '').length / (t === 'ats' ? 100 : 95))
  for (const job of document.experience || []) {
    lines += t === 'ats' ? 2.5 : 3
    lines += (job.bullets || []).length * bulletFactor
  }
  lines += (document.education || []).length * (t === 'ats' ? 1.8 : 2)
  lines += (document.certifications || []).length * (t === 'ats' ? 0.8 : 1)
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
    return fitAtsContentToOnePage(doc, limit)
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

function sectionHeading(title, template) {
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
    return `<h2 class="resume-section-heading modern-heading" style="margin:12px 0 6px 0;font-size:10.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:3px;">${escapeHtml(title)}</h2>`
  }
  if (t === 'creative') {
    return `<h2 class="resume-section-heading creative-heading" style="margin:14px 0 8px 0;font-size:12.5pt;font-weight:700;font-family:'Playfair Display',Georgia,serif;color:#1e3a5f;">${escapeHtml(title)}</h2>`
  }
  if (t === 'ats') {
    const displayTitle = atsSectionTitle(title)
    return `<h2 class="resume-section-heading ats-heading" style="margin:0;font-size:${ATS_SECTION_HEADER_PT}pt;font-weight:bold;text-transform:uppercase;letter-spacing:0;color:#000;line-height:1.2;font-family:${ATS_FONT};">${escapeHtml(displayTitle)}</h2><hr class="ats-section-rule" style="border:none;border-top:0.5pt solid #000;margin:2pt 0 6pt 0;width:100%;height:0;" />`
  }
  return `<h2 class="resume-section-heading ats-heading" style="margin:12px 0 6px 0;font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;color:#000;border-bottom:1pt solid #000;padding-bottom:3px;line-height:1.3;">${escapeHtml(title.toUpperCase())}</h2>`
}

function formatBulletsAts(bullets, fitAdjustments = null) {
  const bodyPt = atsBodyPt(fitAdjustments)
  const lh = fitAdjustments?.lineHeight || ATS_BULLET_LINE_HEIGHT
  const items = strictDedupeBullets(bullets, (b) => bulletQualityScore(b))
    .map(
      (b) =>
        `<div class="ats-bullet-row" style="display:flex;align-items:flex-start;gap:0.35em;margin:0 0 ${ATS_BULLET_GAP} 0;padding-left:0.12in;line-height:${lh};font-size:${bodyPt}pt;font-family:${ATS_FONT};">
          <span class="ats-bullet-marker" style="flex-shrink:0;line-height:${lh};">&#8226;</span>
          <span class="ats-bullet-text" style="flex:1;min-width:0;">${escapeHtml(b)}</span>
        </div>`
    )
    .join('')
  if (!items) return ''
  return `<div class="resume-bullets ats-bullets" style="margin:2pt 0 0 0;">${items}</div>`
}

function formatExperienceAts(experience, fitAdjustments = null) {
  if (!experience?.length) return ''
  const bodyPt = atsBodyPt(fitAdjustments)
  const rowStyle = `display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;font-family:${ATS_FONT};`
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const loc = escapeHtml(job.location || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      const companyLine = [company, loc].filter(Boolean).join(' | ')
      return `<div class="experience-item resume-section" style="margin-bottom:${ATS_JOB_BLOCK_SPACING};page-break-inside:avoid;font-family:${ATS_FONT};">
        <div class="ats-job-title-row" style="${rowStyle}margin:0 0 1pt 0;font-size:${bodyPt}pt;line-height:1.25;">
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
  const bodyPt = atsBodyPt(fitAdjustments)
  return projects
    .map((proj) => {
      const name = escapeHtml(proj.name || '')
      const bullets = formatBulletsAts(proj.bullets, fitAdjustments)
      return `<div class="project-item resume-section" style="margin-bottom:8pt;page-break-inside:avoid;font-family:${ATS_FONT};">
        <p class="ats-project-name" style="margin:0 0 3pt 0;font-size:${bodyPt}pt;font-weight:bold;line-height:1.25;">${name}</p>
        ${bullets}
      </div>`
    })
    .join('')
}

export function formatProjectsBlock(projects, template = '', fitAdjustments = null) {
  if (template?.toLowerCase() !== 'ats') return ''
  const inner = formatProjectsAts(projects, fitAdjustments)
  if (!inner) return ''
  return `<div class="resume-projects-block resume-section-block resume-section">${sectionHeading('Projects', template)}${inner}</div>`
}

function formatBulletsModern(bullets) {
  const items = (bullets || [])
    .map((b) => `<li style="margin-bottom:3pt;line-height:1.3;font-size:10pt;color:#1a1a1a;">${escapeHtml(b)}</li>`)
    .join('')
  if (!items) return ''
  return `<ul class="resume-bullets" style="margin:3pt 0 0 0;padding-left:1.1em;list-style-type:disc;">${items}</ul>`
}

function formatExperienceModern(experience) {
  if (!experience?.length) return ''
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      return `<div class="experience-item resume-section" style="margin-bottom:7pt;page-break-inside:avoid;">
        <p style="margin:0 0 2pt 0;font-size:10.5pt;font-weight:700;color:#1e3a5f;line-height:1.25;">${company}</p>
        <p style="margin:0 0 3pt 0;font-size:10pt;line-height:1.3;">
          <span style="font-weight:700;color:#1a1a1a;">${title}</span>
          ${dates ? `<span style="color:#666666;"> &nbsp;|&nbsp; ${dates}</span>` : ''}
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

function formatSkillsAts(groups) {
  if (!groups?.length) return ''
  return groups
    .map((g) => {
      const items = (g.skills || []).map((s) => escapeHtml(String(s))).join(', ')
      const label = escapeHtml(g.category || 'Skills')
      return `<p class="skill-group resume-section" style="margin:0 0 4pt 0;font-size:${ATS_BODY_PT}pt;line-height:1.35;font-family:${ATS_FONT};"><strong>${label}:</strong> ${items}</p>`
    })
    .join('')
}

function formatSkillsModernSidebar(groups) {
  if (!groups?.length) return ''
  return groups
    .map((g) => {
      const cat = escapeHtml((g.category || 'Skills').toUpperCase())
      const items = (g.skills || [])
        .map((s) => `<div style="font-size:9.5pt;line-height:1.35;color:#e2e8f0;margin-bottom:2pt;">${escapeHtml(s)}</div>`)
        .join('')
      return `<div class="skill-group resume-section" style="margin-bottom:10pt;">
        <p style="margin:0 0 4pt 0;font-size:9pt;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;">${cat}</p>
        ${items}
      </div>`
    })
    .join('')
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

export function formatSkillGroupsHtml(skillGroups, template = '') {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) return ''
  const t = template?.toLowerCase()
  if (t === 'modern') return formatSkillsModernSidebar(skillGroups)
  if (t === 'creative') return formatSkillsCreativeChips(skillGroups)
  if (t === 'minimal') return formatSkillsMinimalInline(skillGroups)
  return formatSkillsAts(skillGroups)
}

export function formatEducationHtml(items, template = '') {
  const t = template?.toLowerCase()
  if (t === 'ats' && Array.isArray(items) && items.length > 0) {
    const fs = `${ATS_BODY_PT}pt`
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

export function formatEducationBlock(items, template = '') {
  const inner = formatEducationHtml(items, template)
  if (!inner) return ''
  const extraClass = template?.toLowerCase() === 'ats' ? ' resume-section-block' : ''
  return `<div class="resume-education-block resume-section${extraClass}">${sectionHeading('Education', template)}${inner}</div>`
}

export function formatCertificationsHtml(items, template = '', sidebar = false) {
  const fs = sidebar ? '9.5pt' : '10pt'
  const mb = sidebar ? '4pt' : '6pt'
  if (!Array.isArray(items) || items.length === 0) return ''
  return items
    .map((c) => {
      const name = escapeHtml(c.name || '')
      const year = c.year ? escapeHtml(String(c.year)) : ''
      if (sidebar) {
        return `<p class="cert-item resume-section" style="margin:0 0 ${mb} 0;font-size:${fs};line-height:1.35;color:#e2e8f0;">${name}${year ? ` (${year})` : ''}</p>`
      }
      const issuer = c.issuer ? escapeHtml(c.issuer) : ''
      const mid = [name, issuer].filter(Boolean).join(' — ')
      const tail = year ? ` · ${year}` : ''
      return `<div class="cert-item resume-section" style="margin-bottom:${mb};"><p style="margin:0;font-size:${fs};line-height:1.3;">${mid}${tail}</p></div>`
    })
    .join('')
}

export function formatCertificationsBlock(items, template = '') {
  const inner = formatCertificationsHtml(items, template, false)
  if (!inner) return ''
  const extraClass = template?.toLowerCase() === 'ats' ? ' resume-section-block' : ''
  return `<div class="resume-certifications-block resume-section${extraClass}">${sectionHeading('Certifications', template)}${inner}</div>`
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
  if (c.email?.trim()) {
    blocks.push(`<p style="margin:0 0 5pt 0;font-size:9.5pt;line-height:1.35;color:#e2e8f0;word-break:break-all;">${escapeHtml(c.email.trim())}</p>`)
  }
  if (c.phone?.trim()) {
    blocks.push(`<p style="margin:0 0 5pt 0;font-size:9.5pt;line-height:1.35;color:#e2e8f0;">${escapeHtml(c.phone.trim())}</p>`)
  }
  if (c.location?.trim()) {
    blocks.push(`<p style="margin:0 0 8pt 0;font-size:9.5pt;line-height:1.35;color:#e2e8f0;">${escapeHtml(c.location.trim())}</p>`)
  }
  const linkedin = formatLinkedInDisplay(c.linkedin)
  if (linkedin) {
    blocks.push(`<p style="margin:0 0 5pt 0;font-size:9.5pt;line-height:1.35;color:#e2e8f0;word-break:break-all;">${escapeHtml(linkedin)}</p>`)
  }
  if (c.portfolio?.trim()) {
    const p = c.portfolio.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '')
    blocks.push(`<p style="margin:0;font-size:9.5pt;line-height:1.35;color:#e2e8f0;word-break:break-all;">${escapeHtml(p)}</p>`)
  }
  return blocks.join('')
}

export function getPdfStyles(template = '') {
  const t = template?.toLowerCase()
  let templateRules = 'body { font-size: 10.5pt; line-height: 1.3; }'
  if (t === 'ats') {
    templateRules = `
  body.tpl-ats { font-family: Georgia, 'Times New Roman', Times, serif !important; color: #000 !important; font-size: ${ATS_BODY_PT}pt; line-height: 1.25; }
  body.tpl-ats .resume-header { text-align: left !important; margin: 0 0 ${ATS_HEADER_AFTER_RULE} !important; }
  body.tpl-ats h1.resume-name { font-size: ${ATS_NAME_PT}pt !important; font-weight: bold !important; text-align: left !important; font-family: Georgia, 'Times New Roman', Times, serif !important; margin: 0 !important; }
  body.tpl-ats .ats-name-rule { border: none !important; border-top: 0.5pt solid #000 !important; margin: 4pt 0 6pt 0 !important; }
  body.tpl-ats .resume-contact { text-align: left !important; font-size: ${ATS_CONTACT_PT}pt !important; font-weight: normal !important; margin: 0 !important; }
  body.tpl-ats .resume-section-heading.ats-heading { font-size: ${ATS_SECTION_HEADER_PT}pt !important; text-transform: uppercase !important; }
  body.tpl-ats .resume-section-block { margin-bottom: ${ATS_SECTION_SPACING} !important; }
  body.tpl-ats .ats-section-rule { border: none !important; border-top: 0.5pt solid #000 !important; margin: 2pt 0 6pt 0 !important; }
  body.tpl-ats .experience-item { margin-bottom: ${ATS_JOB_BLOCK_SPACING} !important; }
  body.tpl-ats .resume-bullets.ats-bullets { margin: 2pt 0 0 0 !important; }
  body.tpl-ats .ats-bullet-row { display: flex !important; align-items: flex-start !important; margin-bottom: ${ATS_BULLET_GAP} !important; padding-left: 0.12in !important; font-size: ${ATS_BODY_PT}pt !important; line-height: ${ATS_BULLET_LINE_HEIGHT} !important; }
  body.tpl-ats .skill-group { font-size: ${ATS_BODY_PT}pt !important; line-height: 1.35 !important; }
  body.tpl-ats .ats-bullet-marker { flex-shrink: 0 !important; }`
  } else if (t === 'modern') {
    templateRules = `
  body.tpl-modern { font-family: Inter, Calibri, sans-serif !important; }
  body.tpl-modern .modern-layout { display: flex !important; min-height: auto !important; }
  body.tpl-modern .modern-sidebar { width: 30% !important; background: #1e3a5f !important; padding: 16pt 12pt !important; }
  body.tpl-modern .modern-main { width: 70% !important; padding: 16pt 14pt !important; }`
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
  @page { size: letter; margin: ${getPdfMarginIn(t)}; }
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
  const fitAdjustments = fitted._fitAdjustments || null
  const groups = skillGroupsFromDocument(fitted)
  const t = template?.toLowerCase()
  const contact = formatContactLine(fitted, t)
  const fontDelta = fitAdjustments?.fontSizeDelta || 0
  const bodyPt = t === 'ats' ? `${atsBodyPt(fitAdjustments)}pt` : `${Math.max(10, (t === 'minimal' ? 10.5 : 10) + fontDelta)}pt`
  const bodyLh = t === 'minimal' ? '1.45' : fitAdjustments?.lineHeight || (t === 'ats' ? ATS_BULLET_LINE_HEIGHT : '1.35')

  const summaryBlock = fitted.summary
    ? `<div class="resume-summary-block resume-section-block resume-section">${sectionHeading(t === 'ats' ? 'Professional Summary' : 'Summary', t)}<p style="margin:0;font-size:${bodyPt};line-height:${bodyLh};color:#000;font-family:${t === 'ats' ? ATS_FONT : 'inherit'};">${escapeHtml(fitted.summary)}</p></div>`
    : ''

  const experienceHtml = formatExperienceHtml(fitted.experience, template, fitAdjustments)
  const experienceBlock =
    t === 'ats' && experienceHtml
      ? `<div class="resume-experience-block resume-section-block resume-section">${sectionHeading('Experience', template)}${experienceHtml}</div>`
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
    '{{sidebar_contact}}': formatSidebarContact(fitted),
    '{{sidebar_skills}}': t === 'modern' ? formatSkillsModernSidebar(groups) : '',
    '{{sidebar_certifications}}':
      t === 'modern' ? formatCertificationsHtml(fitted.certifications, t, true) : '',
    '{{summary}}': escapeHtml(fitted.summary || ''),
    '{{summary_block}}': summaryBlock,
    '{{experience}}': experienceHtml,
    '{{experience_block}}': experienceBlock,
    '{{education_block}}': formatEducationBlock(fitted.education, template),
    '{{projects_block}}': formatProjectsBlock(fitted.projects, template, fitAdjustments),
    '{{certifications_block}}': t === 'modern' ? '' : formatCertificationsBlock(fitted.certifications, template),
    '{{skills}}': t === 'modern' ? '' : formatSkillGroupsHtml(groups, template),
    '{{skills_block}}':
      t === 'modern'
        ? ''
        : `<div class="resume-skills-block resume-section-block resume-section">${sectionHeading('Skills', template)}${formatSkillGroupsHtml(groups, template)}</div>`,
  }
}

export function normalizeClientResumeContentForRender(clientContent, profile, template = '') {
  let { document, skillGroups, flatSkills } = normalizeResumeDocument(clientContent, profile)
  document = fitContentForTemplate(document, template)
  ;({ document, skillGroups, flatSkills } = normalizeResumeDocument(document, profile))
  const replacements = buildReplacements(document, template, { skipFit: true })
  const output = toLegacyContentOut(document, skillGroups, flatSkills)
  return { output, replacements, document }
}
