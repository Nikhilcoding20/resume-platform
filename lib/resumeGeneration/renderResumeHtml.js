import {
  normalizeResumeDocument,
  toLegacyContentOut,
  stripGpaPrefix,
} from '@/lib/resumeGeneration/normalizeResumeDocument'

export const PDF_MARGIN_IN = '0.75in'

export const PDF_STYLES = `
<style>
  html, body, body * {
    font-family: 'Calibri', 'Trebuchet MS', sans-serif !important;
  }
  body { font-size: 11px !important; line-height: 1.35 !important; margin: 0 !important; padding: 0 !important; }
  body > div:first-child, body > header, body header { text-align: center !important; }
  h1, .resume-name {
    font-size: 18px !important;
    font-weight: bold !important;
    page-break-after: avoid;
    margin-bottom: 4px !important;
    line-height: 1.2 !important;
  }
  h1 + p, header p, .contact-line, .resume-contact-line {
    font-size: 10.5px !important;
    line-height: 1.35 !important;
  }
  h2.resume-section-heading,
  .resume-education-block > h2.resume-section-heading,
  .resume-certifications-block > h2.resume-section-heading {
    font-size: 11px !important;
    font-weight: bold !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
    border-bottom: 1px solid currentColor !important;
    padding-bottom: 3px !important;
    margin: 10px 0 6px 0 !important;
    page-break-after: avoid;
  }
  .resume-section { margin-bottom: 8px !important; page-break-inside: avoid; }
  .experience-item { margin-bottom: 8pt !important; page-break-inside: avoid; }
  .exp-header-row { display: flex !important; justify-content: space-between !important; align-items: baseline !important; gap: 8px !important; }
  .exp-title { font-weight: bold !important; flex: 1 !important; min-width: 0 !important; }
  .exp-dates { flex-shrink: 0 !important; text-align: right !important; }
  .exp-company-line { margin: 0 0 2px 0 !important; font-size: 10.5px !important; }
  .resume-bullets {
    margin: 2px 0 0 0 !important;
    padding-left: 1.15em !important;
    list-style-type: disc !important;
    list-style-position: outside !important;
  }
  .resume-bullets li { margin-bottom: 4pt !important; line-height: 1.35 !important; }
  .education-item .edu-row { box-sizing: border-box !important; }
  .education-item .edu-gpa { margin: 2px 0 0 0 !important; }
  .education-item ul.edu-honors { margin: 4px 0 0 0 !important; padding-left: 18px !important; }
  .education-item ul.edu-honors li { margin-bottom: 2px !important; }
</style>
`

export function escapeHtml(text) {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function usesOnePageCompactFormatters(template) {
  return template === 'modern' || template === 'ats' || template === 'minimal' || template === 'creative'
}

function sectionHeading(title, template) {
  const compact = usesOnePageCompactFormatters(template)
  const fs = compact ? '11px' : '12px'
  const margin = compact ? '8px 0 4px 0' : '10px 0 6px 0'
  return `<h2 class="resume-section-heading" style="margin:${margin};font-size:${fs};font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid currentColor;padding-bottom:3px;line-height:1.3;">${escapeHtml(title)}</h2>`
}

export function formatExperienceHtml(experience, template = '') {
  const compact = usesOnePageCompactFormatters(template)
  const fs = compact ? '10.5px' : '11px'
  const titleFs = compact ? '10.5px' : '11px'
  if (!Array.isArray(experience) || experience.length === 0) {
    return '<p class="resume-section">No experience listed.</p>'
  }
  return experience
    .map((job) => {
      const title = escapeHtml(job.title || '')
      const company = escapeHtml(job.company || '')
      const loc = escapeHtml(job.location || '')
      const dates = escapeHtml(job.dates || '')
      const companyLine = [company, loc].filter(Boolean).join(' · ')
      const bullets = (job.bullets || [])
        .map(
          (b) =>
            `<li style="margin-bottom:4pt;line-height:1.35;font-size:${fs};">${escapeHtml(b)}</li>`
        )
        .join('')
      return `<div class="experience-item resume-section" style="margin-bottom:8pt;">
          <div class="exp-header-row" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0 0 2px 0;font-size:${titleFs};line-height:1.25;">
            <span class="exp-title" style="font-weight:bold;flex:1;min-width:0;">${title || '&#160;'}</span>
            ${dates ? `<span class="exp-dates" style="flex-shrink:0;text-align:right;">${dates}</span>` : ''}
          </div>
          ${companyLine ? `<p class="exp-company-line" style="margin:0 0 2px 0;font-size:${fs};line-height:1.3;">${companyLine}</p>` : ''}
          ${bullets ? `<ul class="resume-bullets" style="margin:2px 0 0 0;padding-left:1.15em;list-style-position:outside;">${bullets}</ul>` : ''}
        </div>`
    })
    .join('')
}

export function formatSkillGroupsHtml(skillGroups, template = '') {
  if (!Array.isArray(skillGroups) || skillGroups.length === 0) return ''
  const compact = usesOnePageCompactFormatters(template)
  const modern = template === 'modern'
  const mb = compact ? '6px' : '8px'
  const catStyle = modern ? 'font-weight: 700; color: #2563eb;' : 'font-weight: bold;'
  const fontBlock = compact ? 'font-size: 10.5px; line-height: 1.3;' : 'line-height: 1.35;'
  return skillGroups
    .map((g) => {
      const items = (g.skills || []).map((s) => escapeHtml(String(s))).join(', ')
      return `<div class="skill-group resume-section" style="margin-bottom: ${mb}; ${fontBlock}"><span style="${catStyle}">${escapeHtml(g.category || 'Skills')}:</span> ${items}</div>`
    })
    .join('')
}

export function formatEducationHtml(items, template = '') {
  const compact = usesOnePageCompactFormatters(template)
  const fs = compact ? '10px' : '11px'
  const mb = compact ? '4px' : '8px'
  const lh = compact ? '1.3' : '1.25'
  const rowStyle = `display:flex;justify-content:space-between;align-items:baseline;gap:8px;width:100%;margin:0;font-size:${fs};line-height:${lh};`
  const leftGrow = 'flex:1;min-width:0;word-wrap:break-word;overflow-wrap:break-word;'
  const rightCell =
    'flex-shrink:0;text-align:right;margin-left:8px;max-width:40%;word-wrap:break-word;overflow-wrap:break-word;'
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
      const row1 = `<div class="edu-row" style="${rowStyle}"><span style="font-weight:bold;${leftGrow}">${inst || '&#160;'}</span>${row1Right}</div>`
      const row2Right = year
        ? `<span style="font-weight:normal;${rightCell}">${year}</span>`
        : `<span style="${rightCell}" aria-hidden="true"></span>`
      const row2 = `<div class="edu-row" style="${rowStyle}"><span style="font-weight:normal;${leftGrow}">${degree || '&#160;'}</span>${row2Right}</div>`
      const gpaBlock = gpa
        ? `<p class="edu-gpa" style="margin:2px 0 0 0;padding:0;font-size:${fs};line-height:${lh};">GPA: ${gpa}</p>`
        : ''
      const honorsItems = honors
        .map((h) => `<li style="margin-bottom:2px;line-height:${lh};font-size:${fs};">${escapeHtml(h)}</li>`)
        .join('')
      const honorsBlock = honorsItems
        ? `<ul class="edu-honors" style="margin:2px 0 0 0;padding-left:14px;list-style-type:disc;">${honorsItems}</ul>`
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

export function formatCertificationsHtml(items, template = '') {
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

export function formatCertificationsBlock(items, template = '') {
  const inner = formatCertificationsHtml(items, template)
  if (!inner) return ''
  return `<div class="resume-certifications-block resume-section">${sectionHeading('Certifications', template)}${inner}</div>`
}

function formatContactLine(document) {
  const c = document.contact || {}
  const parts = [c.email, c.phone, c.location].map((x) => String(x || '').trim()).filter(Boolean)
  return parts.map((p) => escapeHtml(p)).join(' | ')
}

function formatContactUrlsBlock(document) {
  const c = document.contact || {}
  const parts = []
  if (c.linkedin?.trim()) parts.push(`LinkedIn: ${escapeHtml(c.linkedin.trim())}`)
  if (c.portfolio?.trim()) parts.push(`Website: ${escapeHtml(c.portfolio.trim())}`)
  if (!parts.length) return ''
  return `<p style="margin: 4px 0 0 0;" class="contact-line resume-contact-line">${parts.join(' · ')}</p>`
}

function formatSidebarUrls(document) {
  const c = document.contact || {}
  const blocks = []
  if (c.linkedin?.trim()) {
    blocks.push(
      `<p style="margin: 0 0 5px 0; font-size: 10px; line-height: 1.35; word-break: break-all;">LinkedIn<br/>${escapeHtml(c.linkedin.trim())}</p>`
    )
  }
  if (c.portfolio?.trim()) {
    blocks.push(
      `<p style="margin: 0; font-size: 10px; line-height: 1.35; word-break: break-all;">Website<br/>${escapeHtml(c.portfolio.trim())}</p>`
    )
  }
  return blocks.join('')
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

/** Build template placeholders from canonical resume document (JSON → HTML only here). */
export function buildReplacements(document, template = '') {
  const groups = skillGroupsFromDocument(document)

  const c = document.contact || {}
  return {
    '{{name}}': escapeHtml(document.name || ''),
    '{{email}}': escapeHtml(c.email || ''),
    '{{phone}}': escapeHtml(c.phone || ''),
    '{{location}}': escapeHtml(c.location || ''),
    '{{contact_urls_block}}': formatContactUrlsBlock(document),
    '{{sidebar_urls}}': formatSidebarUrls(document),
    '{{summary}}': escapeHtml(document.summary || ''),
    '{{experience}}': formatExperienceHtml(document.experience, template),
    '{{education_block}}': formatEducationBlock(document.education, template),
    '{{certifications_block}}': formatCertificationsBlock(document.certifications, template),
    '{{skills}}': formatSkillGroupsHtml(groups, template),
    '{{contact_line}}': formatContactLine(document),
  }
}

export function normalizeClientResumeContentForRender(clientContent, profile, template = '') {
  const { document, skillGroups, flatSkills } = normalizeResumeDocument(clientContent, profile)
  const output = toLegacyContentOut(document, skillGroups, flatSkills)
  const replacements = buildReplacements(document, template)
  return { output, replacements, document }
}
