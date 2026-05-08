/** Shared resume profile completion rules (dashboard stat + /dashboard/profile). */

export function str(v) {
  return typeof v === 'string' ? v.trim() : ''
}

export function hasWorkExperience(profile) {
  const wx = profile?.work_experience
  if (!Array.isArray(wx) || wx.length === 0) return false
  return wx.some((j) => {
    const title = str(j?.jobTitle ?? j?.title)
    const company = str(j?.companyName ?? j?.company)
    return Boolean(title && company)
  })
}

export function hasEducation(profile) {
  const ed = profile?.education
  if (!Array.isArray(ed) || ed.length === 0) return false
  return ed.some((e) => {
    const degree = str(e?.degreeName ?? e?.degree)
    const school = str(e?.schoolName ?? e?.institution ?? e?.school)
    return Boolean(degree && school)
  })
}

export function hasSkills(profile) {
  const s = profile?.skills
  return Array.isArray(s) && s.some((x) => str(x))
}

export function hasCertifications(profile) {
  const c = profile?.certifications
  if (!Array.isArray(c) || c.length === 0) return false
  return c.some((x) => str(x?.certificationName ?? x?.name) || str(x?.issuer))
}

export function hasLocation(profile) {
  return Boolean(str(profile?.city) || str(profile?.country))
}

/**
 * Weights sum to 100; includes summary + certifications (dashboard previously omitted these).
 */
export function getResumeProfileCompletionPercent(profile) {
  if (!profile) return 0
  let score = 0
  if (str(profile.full_name)) score += 10
  if (str(profile.email)) score += 10
  if (str(profile.phone_number)) score += 10
  if (hasLocation(profile)) score += 10
  if (hasWorkExperience(profile)) score += 18
  if (hasEducation(profile)) score += 12
  if (hasSkills(profile)) score += 12
  if (str(profile.linkedin_url)) score += 4
  if (str(profile.portfolio_url)) score += 4
  if (hasCertifications(profile)) score += 5
  if (str(profile.summary)) score += 5
  return Math.min(score, 100)
}
