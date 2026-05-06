/** Shared cover letter HTML for PDF rendering and consistent preview styling. */

export function escapeHtml(text) {
  if (text == null) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatDateWithOrdinal() {
  const d = new Date()
  const day = d.getDate()
  const ord = (n) => {
    if (n >= 11 && n <= 13) return `${n}th`
    const s = ['th', 'st', 'nd', 'rd']
    return `${n}${s[n % 10] || 'th'}`
  }
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${ord(day)} ${months[d.getMonth()]}, ${d.getFullYear()}`
}

export function paragraphsToHtml(plainText) {
  const escaped = escapeHtml(plainText)
  const paragraphs = escaped.split(/\n\n+/).filter((p) => p.trim())
  return paragraphs.map((p) => `<p style="margin: 0 0 14px 0;">${p.replace(/\n/g, '<br />')}</p>`).join('')
}

export function buildCoverLetterInnerHtml(header, bodyHtml) {
  const { fullName, email, phone, linkedin } = header
  const contactParts = [email, phone, linkedin].filter(Boolean).map(escapeHtml)
  const contactLine = contactParts.length ? contactParts.join(' &nbsp;|&nbsp; ') : ''

  return `
<div class="header">
  <h1 class="name">${escapeHtml(fullName || '')}</h1>
  ${contactLine ? `<p class="contact">${contactLine}</p>` : ''}
</div>
<p class="date">${formatDateWithOrdinal()}</p>
<p class="salutation">Dear Hiring Manager,</p>
<div class="body">
${bodyHtml}
</div>
<p class="closing">Sincerely,</p>
<p class="spacer">&nbsp;</p>
<p class="spacer">&nbsp;</p>
<p class="signature">${escapeHtml(fullName || '')}</p>
`
}

const PRINT_STYLES = `
    html, body, body * {
      font-family: 'Calibri', 'Trebuchet MS', sans-serif !important;
    }
    body {
      font-size: 12px;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .header { text-align: center; margin-bottom: 20px; }
    .name { font-size: 20px; font-weight: bold; margin: 0 0 6px 0; }
    .contact { margin: 0; font-size: 12px; }
    .date { text-align: right; margin: 0 0 20px 0; }
    .salutation { margin: 0 0 14px 0; }
    .body p { margin: 0 0 14px 0; page-break-inside: avoid; }
    .closing { margin: 24px 0 0 0; }
    .spacer { margin: 0; }
    .signature { margin: 0; }
`

export function getCoverLetterPdfFilename(fullName) {
  const name = (fullName || '').trim()
  if (!name) return 'cover_letter.pdf'
  const parts = name.split(/\s+/).filter(Boolean)
  const sanitized = parts.map((p) => p.replace(/[^a-zA-Z0-9-]/g, '')).filter(Boolean)
  const base = sanitized.length >= 2
    ? `${sanitized[0]}_${sanitized.slice(1).join('_')}`
    : sanitized[0] || 'cover_letter'
  return `${base}_cover_letter.pdf`
}

/** Full HTML document for Puppeteer PDF (A4 margins applied in page.pdf). */
export function buildPrintableCoverLetterDocument(header, plainBodyText) {
  const bodyHtml = paragraphsToHtml(plainBodyText)
  const inner = buildCoverLetterInnerHtml(header, bodyHtml)
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${PRINT_STYLES}</style>
</head>
<body>
${inner}
</body>
</html>`
}
