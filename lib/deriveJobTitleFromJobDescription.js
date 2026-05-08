/** First meaningful line of job description, for resume library labels. */
export function deriveJobTitleFromJobDescription(jd) {
  const s = jd == null ? '' : String(jd).trim()
  if (!s) return 'Tailored resume'
  const line = s.split(/\r?\n/).find((l) => l.trim()) || ''
  const cleaned = line.trim().replace(/^[-*•\d.)\s]+/i, '').slice(0, 120)
  return cleaned || 'Tailored resume'
}
