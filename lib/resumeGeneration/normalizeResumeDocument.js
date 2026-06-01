const WEAK_BULLET_START =
  /^(responsible for|helped|assisted|worked on|supported|participated in)\b/i

const MONTH_YEAR =
  /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i

export function stripGpaPrefix(value) {
  if (value == null || value === '') return ''
  return String(value).trim().replace(/^\s*GPA\s*:\s*/i, '').trim()
}

export function normalizeHonorsArray(raw) {
  if (!raw || typeof raw !== 'object') return []
  const h = raw.honors ?? raw.awards ?? raw.honorsAndAwards ?? raw.award
  if (Array.isArray(h)) return h.map((x) => String(x).trim()).filter(Boolean)
  if (typeof h === 'string' && h.trim()) return h.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  return []
}

export function normalizeEducationEntry(raw) {
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
  return { degree: degreeS, institution: institutionS, graduationYear: yearS, location: locationS, gpa, honors }
}

function educationKey(entry) {
  return `${entry.institution.toLowerCase()}|${entry.degree.toLowerCase()}|${(entry.graduationYear || '').toLowerCase()}`
}

export function educationFromProfile(profile) {
  const arr = Array.isArray(profile?.education) ? profile.education : []
  return arr.map(normalizeEducationEntry).filter(Boolean)
}

export function mergeEducationFromProfile(parsedList, profile) {
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

export function normalizeCertEntry(raw) {
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

export function mergeCertificationsFromProfile(parsedList, profile) {
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

export function skillsObjectToGroups(skillsValue, profile) {
  let groups = []
  if (skillsValue && typeof skillsValue === 'object' && !Array.isArray(skillsValue)) {
    groups = Object.entries(skillsValue)
      .map(([category, list]) => ({
        category: String(category).trim() || 'Skills',
        skills: (Array.isArray(list) ? list : []).map((s) => String(s).trim()).filter(Boolean),
      }))
      .filter((g) => g.skills.length > 0)
  }
  if (Array.isArray(skillsValue)) {
    const flat = skillsValue.map((s) => String(s).trim()).filter(Boolean)
    if (flat.length) groups = chunkSkillsIntoGroups(flat)
  }
  if (!groups.length && Array.isArray(skillsValue?.skillGroups)) {
    groups = skillsValue.skillGroups
      .filter((g) => g && typeof g === 'object')
      .map((g) => ({
        category: String(g.category || g.name || 'Skills').trim() || 'Skills',
        skills: (Array.isArray(g.skills) ? g.skills : []).map((s) => String(s).trim()).filter(Boolean),
      }))
      .filter((g) => g.skills.length > 0)
  }
  let flat = groups.flatMap((g) => g.skills)
  if (!flat.length && Array.isArray(profile?.skills)) {
    flat = profile.skills.map((s) => String(s).trim()).filter(Boolean)
    if (flat.length) groups = chunkSkillsIntoGroups(flat)
  }
  return { skillGroups: groups, flatSkills: groups.flatMap((g) => g.skills) }
}

function wordCount(text) {
  return String(text).trim().split(/\s+/).filter(Boolean).length
}

const TRAILING_WEAK_WORDS = new Set([
  'and', 'or', 'to', 'by', 'with', 'for', 'up', 'in', 'on', 'of', 'a', 'an', 'the',
  'as', 'at', 'into', 'from', 'via', 'through', 'across', 'over', 'under', 'between',
])

/** Cut at a natural phrase boundary — never end on a dangling conjunction. */
export function truncateWordsNatural(text, maxWords = 20) {
  const words = String(text).trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')

  let cutAt = maxWords
  for (let i = maxWords - 1; i >= Math.max(12, maxWords - 6); i--) {
    const token = words[i].replace(/[,;.:]+$/, '')
    if (words[i].endsWith(',') || words[i].endsWith(';') || /^and$|^while$|^by$|^through$|^including$/i.test(token)) {
      cutAt = i
      break
    }
  }

  let cut = words.slice(0, cutAt)
  while (cut.length > 10) {
    const last = cut[cut.length - 1].toLowerCase().replace(/[^\w]/g, '')
    if (!TRAILING_WEAK_WORDS.has(last)) break
    cut.pop()
  }

  return cut.join(' ').replace(/[,;]\s*$/, '').trim()
}

function normalizeBulletKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/^[\s•\-–—*]+/, '')
    .replace(/[^\w\s%$]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Flatten newline-embedded bullets, strip leading markers, dedupe. */
export function flattenAndDedupeBullets(bullets) {
  const seen = new Set()
  const out = []
  for (const raw of bullets || []) {
    const parts = String(raw || '')
      .split(/\r?\n/)
      .map((s) => s.replace(/^[\s•\-–—*]+/, '').trim())
      .filter(Boolean)
    for (const part of parts) {
      const key = normalizeBulletKey(part)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(part)
    }
  }
  return out
}

function sanitizeBullet(text) {
  let s = String(text).trim()
  s = s.replace(/\([^)]{2,}\)/g, '').replace(/\s+/g, ' ').trim()
  s = s.replace(/\b(I|me|my|we|our|us)\b/gi, '').replace(/\s+/g, ' ').trim()
  s = s.replace(/\.\s*$/, '')
  if (WEAK_BULLET_START.test(s)) {
    s = s.replace(WEAK_BULLET_START, '').replace(/^[,:\s-]+/, '').trim()
    if (s) s = s.charAt(0).toUpperCase() + s.slice(1)
  }
  return truncateWordsNatural(s, 20)
}

function formatDateRange(start, end, isCurrent) {
  const s = String(start || '').trim()
  let e = String(end || '').trim()
  if (isCurrent || /^present$/i.test(e)) e = 'Present'
  if (s && e) return `${s} – ${e}`
  if (s) return s
  return e
}

function parseLegacyDates(datesStr) {
  const d = String(datesStr || '').trim()
  if (!d) return { start: '', end: '', isCurrent: false }
  const parts = d.split(/\s*[–—-]\s*/)
  if (parts.length >= 2) {
    const end = parts[parts.length - 1].trim()
    return {
      start: parts[0].trim(),
      end,
      isCurrent: /^present$/i.test(end),
    }
  }
  return { start: d, end: '', isCurrent: false }
}

function normalizeExperienceEntry(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const title = String(raw.title ?? '').trim()
  const company = String(raw.company ?? '').trim()
  const location = String(raw.location ?? '').trim()

  let start = String(raw.start ?? '').trim()
  let end = String(raw.end ?? '').trim()
  let isCurrent = Boolean(raw.isCurrent)
  if (!start && !end && raw.dates) {
    const parsed = parseLegacyDates(raw.dates)
    start = parsed.start
    end = parsed.end
    isCurrent = parsed.isCurrent
  }
  if (/^present$/i.test(end)) isCurrent = true

  let bullets = raw.bullets
  if (typeof bullets === 'string') {
    bullets = bullets.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  } else if (!Array.isArray(bullets)) {
    bullets = []
  }
  if (bullets.length === 0 && raw.description) {
    bullets = String(raw.description)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  bullets = flattenAndDedupeBullets(bullets)
  bullets = bullets.map((b) => sanitizeBullet(b)).filter(Boolean).slice(0, 4)

  if (!title && !company && !start && !end && bullets.length === 0) return null

  return {
    title,
    company,
    location,
    start,
    end,
    isCurrent: isCurrent || index === 0,
    bullets,
    dates: formatDateRange(start, end, isCurrent),
  }
}

function enforceSummarySentences(summary, maxSentences = 3) {
  const text = String(summary || '').trim()
  if (!text) return ''
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  if (sentences.length <= maxSentences) {
    if (sentences.length === 1) return sentences[0]
    return sentences.slice(0, maxSentences).join(' ')
  }
  return sentences.slice(0, maxSentences).join(' ')
}

function contactFromProfile(profile, parsedContact = {}) {
  const c = parsedContact && typeof parsedContact === 'object' ? parsedContact : {}
  const location =
    String(c.location || '').trim() ||
    [profile.city, profile.country].filter(Boolean).join(', ') ||
    ''
  return {
    email: String(c.email || profile.email || '').trim(),
    phone: String(c.phone || profile.phone_number || '').trim(),
    location,
    linkedin: String(c.linkedin || profile.linkedin_url || '').trim(),
    portfolio: String(c.portfolio || profile.portfolio_url || '').trim(),
  }
}

/**
 * Normalize AI or client JSON into canonical resume document + legacy API shape.
 */
export function normalizeResumeDocument(parsed, profile) {
  const contact = contactFromProfile(profile, parsed?.contact)
  const name = String(parsed?.name || profile?.full_name || '').trim()

  const experience = (Array.isArray(parsed?.experience) ? parsed.experience : [])
    .map((job, i) => normalizeExperienceEntry(job, i))
    .filter(Boolean)
    .slice(0, 4)

  const education = mergeEducationFromProfile(parsed?.education, profile)
  const certifications = mergeCertificationsFromProfile(parsed?.certifications, profile)
  const { skillGroups, flatSkills } = skillsObjectToGroups(
    parsed?.skills ?? { skillGroups: parsed?.skillGroups },
    profile
  )

  const document = {
    name,
    contact,
    summary: enforceSummarySentences(parsed?.summary),
    experience,
    education,
    certifications,
    skills: Object.fromEntries(skillGroups.map((g) => [g.category, g.skills])),
  }

  return { document, skillGroups, flatSkills }
}

/** Legacy content shape for dashboard editor / API responses. */
export function toLegacyContentOut(document, skillGroups, flatSkills) {
  const { contact } = document
  return {
    name: document.name,
    email: contact.email,
    phone: contact.phone,
    location: contact.location,
    linkedin_url: contact.linkedin,
    portfolio_url: contact.portfolio,
    summary: document.summary,
    experience: document.experience.map((job) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      start: job.start,
      end: job.end,
      dates: job.dates,
      bullets: job.bullets,
    })),
    skillGroups,
    skills: flatSkills,
    education: document.education,
    certifications: document.certifications,
    contact: document.contact,
  }
}

export function countProfileJobs(profile) {
  const we = Array.isArray(profile?.work_experience) ? profile.work_experience : []
  return we.filter(
    (j) =>
      j &&
      (String(j.jobTitle || j.title || '').trim() ||
        String(j.companyName || j.company || '').trim())
  ).length
}

export function parseAiJson(rawText) {
  const cleaned = rawText.replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  return JSON.parse(cleaned)
}
