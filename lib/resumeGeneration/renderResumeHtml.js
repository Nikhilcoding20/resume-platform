import {
  normalizeResumeDocument,
  toLegacyContentOut,
  stripGpaPrefix,
} from '@/lib/resumeGeneration/normalizeResumeDocument'

export const PDF_MARGIN_IN = '0.75in'

const TEMPLATE_LINE_LIMITS = {
  ats: 48,
  modern: 48,
  minimal: 38,
  creative: 42,
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
  const list = (bullets || []).map((b, i) => ({ b: String(b).trim(), i, score: bulletQualityScore(b) })).filter((x) => x.b)
  if (list.length === 0) return []
  const floor = Math.min(minCount, list.length)
  const cap = Math.min(Math.max(maxCount, floor), list.length)
  if (list.length <= cap) return list.map((x) => x.b)
  const ranked = [...list].sort((a, b) => b.score - a.score || a.i - b.i)
  const kept = new Set(ranked.slice(0, cap).map((x) => x.i))
  return list.filter((x) => kept.has(x.i)).map((x) => x.b)
}

function bulletsForRoleIndex(jobIndex) {
  return jobIndex < 2 ? 4 : 3
}

function applyRoleBulletLimits(experience) {
  return (experience || []).map((job, i) => ({
    ...job,
    bullets: selectBestBullets(job.bullets, bulletsForRoleIndex(i), MIN_BULLETS_PER_ROLE),
  }))
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

function estimateContentLines(document) {
  let lines = 8
  lines += Math.ceil(String(document.summary || '').length / 90)
  for (const job of document.experience || []) {
    lines += 3
    lines += (job.bullets || []).length * 1.2
  }
  lines += (document.education || []).length * 2
  lines += (document.certifications || []).length
  lines += skillGroupsFromDocument(document).length * 2
  return Math.round(lines)
}

/** Trim content to fit one-page line budget before render. */
export function fitContentForTemplate(document, template) {
  const limit = TEMPLATE_LINE_LIMITS[template] || 45
  const doc = JSON.parse(JSON.stringify(document))

  // Step 1: Apply per-role bullet limits (4 recent, 3 older) keeping strongest quantified bullets.
  doc.experience = applyRoleBulletLimits(doc.experience)
  if (estimateContentLines(doc) <= limit) return doc

  // Step 2: Trim summary to 2 sentences (never trim bullets below minimum first).
  doc.summary = trimSummaryToSentences(doc.summary, 2)
  if (estimateContentLines(doc) <= limit) return doc

  // Step 3: Trim non-experience sections; bullets stay at minimum 3 per role.
  doc.certifications = (doc.certifications || []).slice(0, 4)
  const groups = skillGroupsFromDocument(doc)
  doc.skills = Object.fromEntries(
    groups.slice(0, 5).map((g) => [g.category, g.skills.slice(0, 8)])
  )
  if (estimateContentLines(doc) <= limit) return doc

  // Step 4: Drop oldest roles beyond 4 (each role still keeps minimum 3 bullets).
  doc.experience = applyRoleBulletLimits((doc.experience || []).slice(0, 4))
  if (estimateContentLines(doc) <= limit) return doc

  // Step 5: Last resort — reduce font size by 0.5pt (minimum 10pt body).
  doc._fitAdjustments = { fontSizeDelta: -0.5, lineHeight: 1.15 }
  return doc
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
  return `<h2 class="resume-section-heading ats-heading" style="margin:12px 0 6px 0;font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;color:#000;border-bottom:1pt solid #000;padding-bottom:3px;line-height:1.3;">${escapeHtml(title.toUpperCase())}</h2>`
}

function formatBulletsAts(bullets, fitAdjustments = null) {
  const fontDelta = fitAdjustments?.fontSizeDelta || 0
  const bodyPt = Math.max(10, 10.5 + fontDelta)
  const lh = fitAdjustments?.lineHeight || 1.25
  const items = (bullets || [])
    .map(
      (b) =>
        `<li class="ats-bullet-item" style="margin:0 0 3pt 0;padding-left:0.14in;text-indent:-0.14in;line-height:${lh};font-size:${bodyPt}pt;list-style:none;display:block;">&#8226;&nbsp;${escapeHtml(b)}</li>`
    )
    .join('')
  if (!items) return ''
  return `<ul class="resume-bullets ats-bullets" style="margin:2pt 0 0 0;padding:0 0 0 0.25in;list-style:none;">${items}</ul>`
}

function formatExperienceAts(experience, fitAdjustments = null) {
  if (!experience?.length) return '<p class="resume-section">No experience listed.</p>'
  const fontDelta = fitAdjustments?.fontSizeDelta || 0
  const bodyPt = Math.max(10, 10.5 + fontDelta)
  return experience
    .map((job) => {
      const company = escapeHtml(job.company || '')
      const loc = escapeHtml(job.location || '')
      const title = escapeHtml(job.title || '')
      const dates = escapeHtml(job.dates || '')
      return `<div class="experience-item resume-section" style="margin-bottom:7pt;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0 0 1pt 0;font-size:${bodyPt};line-height:1.25;">
          <span style="font-weight:bold;flex:1;min-width:0;">${company || '&#160;'}</span>
          ${loc ? `<span style="flex-shrink:0;text-align:right;">${loc}</span>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0 0 2pt 0;font-size:${bodyPt};line-height:1.25;">
          <span style="font-style:italic;flex:1;min-width:0;">${title || '&#160;'}</span>
          ${dates ? `<span style="flex-shrink:0;text-align:right;">${dates}</span>` : ''}
        </div>
        ${formatBulletsAts(job.bullets, fitAdjustments)}
      </div>`
    })
    .join('')
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
      return `<div class="skill-group resume-section" style="margin-bottom:5pt;font-size:10.5pt;line-height:1.3;display:flex;gap:12px;">
        <span style="font-weight:bold;min-width:140px;flex-shrink:0;">${label}:</span>
        <span style="flex:1;">${items}</span>
      </div>`
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
  const fs = t === 'minimal' ? '10.5pt' : '10pt'
  const mb = t === 'minimal' ? '12pt' : '6pt'
  const lh = t === 'minimal' ? '1.45' : '1.3'
  const rowStyle = `display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;margin:0;font-size:${fs};line-height:${lh};`
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
  return `<div class="resume-education-block resume-section">${sectionHeading('Education', template)}${inner}</div>`
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
  return `<div class="resume-certifications-block resume-section">${sectionHeading('Certifications', template)}${inner}</div>`
}

function formatContactLine(document, template) {
  const c = document.contact || {}
  const parts = [c.email, c.phone, c.location].map((x) => String(x || '').trim()).filter(Boolean)
  const line = parts.map((p) => escapeHtml(p)).join(' · ')
  const linkedin = formatLinkedInDisplay(c.linkedin)
  const portfolio = String(c.portfolio || '').trim()
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
  const base = `
  @page { size: letter; margin: ${PDF_MARGIN_IN}; }
  html, body { margin: 0 !important; padding: 0 !important; }
  .experience-item, .resume-section { page-break-inside: avoid; }
  h1, h2, .resume-section-heading { page-break-after: avoid; }
  `
  if (t === 'ats') {
    return `${base}<style>body.tpl-ats{font-family:Georgia,Garamond,serif!important;color:#000!important;font-size:10.5pt;line-height:1.25;}body.tpl-ats h1{font-size:17pt;font-weight:bold;}body.tpl-ats .resume-bullets.ats-bullets{list-style:none!important;padding-left:0.25in!important;margin-left:0!important;}body.tpl-ats .resume-bullets.ats-bullets li.ats-bullet-item{display:block!important;list-style:none!important;}</style>`
  }
  if (t === 'modern') {
    return `${base}<style>body.tpl-modern{font-family:Inter,Calibri,sans-serif!important;}body.tpl-modern .modern-layout{display:flex!important;min-height:auto!important;}body.tpl-modern .modern-sidebar{width:30%!important;background:#1e3a5f!important;padding:16pt 12pt!important;}body.tpl-modern .modern-main{width:70%!important;padding:16pt 14pt!important;}</style>`
  }
  if (t === 'minimal') {
    return `${base}<style>body.tpl-minimal{font-family:Inter,Helvetica Neue,sans-serif!important;color:#1a1a1a!important;line-height:1.45;}body.tpl-minimal h1{font-size:26pt;font-weight:300!important;}body.tpl-minimal .minimal-heading{letter-spacing:0.18em!important;}</style>`
  }
  if (t === 'creative') {
    return `${base}<style>body.tpl-creative{font-family:'Source Sans 3',Open Sans,sans-serif!important;}body.tpl-creative h1{font-family:'Playfair Display',Georgia,serif!important;font-size:34pt!important;}</style>`
  }
  return `${base}<style>body{font-size:10.5pt;line-height:1.3;}</style>`
}

/** @deprecated use getPdfStyles(template) */
export const PDF_STYLES = getPdfStyles()

export function buildReplacements(document, template = '') {
  const fitted = fitContentForTemplate(document, template)
  const fitAdjustments = fitted._fitAdjustments || null
  const groups = skillGroupsFromDocument(fitted)
  const t = template?.toLowerCase()
  const contact = formatContactLine(fitted, t)
  const fontDelta = fitAdjustments?.fontSizeDelta || 0
  const bodyPt = Math.max(10, (t === 'minimal' ? 10.5 : 10) + fontDelta)

  const summaryBlock = fitted.summary
    ? `<div class="resume-summary-block resume-section">${sectionHeading(t === 'ats' ? 'Professional Summary' : 'Summary', t)}<p style="margin:0;font-size:${bodyPt};line-height:${t === 'minimal' ? '1.45' : fitAdjustments?.lineHeight || '1.35'};color:#1a1a1a;">${escapeHtml(fitted.summary)}</p></div>`
    : ''

  return {
    '{{name}}': escapeHtml(fitted.name || ''),
    '{{email}}': escapeHtml(fitted.contact?.email || ''),
    '{{phone}}': escapeHtml(fitted.contact?.phone || ''),
    '{{location}}': escapeHtml(fitted.contact?.location || ''),
    '{{contact_line}}': contact.line,
    '{{contact_extra_line}}': contact.extraLine,
    '{{contact_urls_block}}': contact.extraLine
      ? `<p style="margin:3pt 0 0 0;font-size:10pt;line-height:1.3;" class="contact-line resume-contact-line">${contact.extraLine}</p>`
      : '',
    '{{sidebar_contact}}': formatSidebarContact(fitted),
    '{{sidebar_skills}}': t === 'modern' ? formatSkillsModernSidebar(groups) : '',
    '{{sidebar_certifications}}':
      t === 'modern' ? formatCertificationsHtml(fitted.certifications, t, true) : '',
    '{{summary}}': escapeHtml(fitted.summary || ''),
    '{{summary_block}}': summaryBlock,
    '{{experience}}': formatExperienceHtml(fitted.experience, template, fitAdjustments),
    '{{education_block}}': formatEducationBlock(fitted.education, template),
    '{{certifications_block}}': t === 'modern' ? '' : formatCertificationsBlock(fitted.certifications, template),
    '{{skills}}': t === 'modern' ? '' : formatSkillGroupsHtml(groups, template),
    '{{skills_block}}':
      t === 'modern'
        ? ''
        : `<div class="resume-skills-block resume-section">${sectionHeading('Skills', template)}${formatSkillGroupsHtml(groups, template)}</div>`,
  }
}

export function normalizeClientResumeContentForRender(clientContent, profile, template = '') {
  const { document, skillGroups, flatSkills } = normalizeResumeDocument(clientContent, profile)
  const replacements = buildReplacements(document, template)
  const output = toLegacyContentOut(document, skillGroups, flatSkills)
  return { output, replacements, document }
}
