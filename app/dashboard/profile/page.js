'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getResumeProfileCompletionPercent,
  hasWorkExperience,
  hasEducation,
  hasSkills,
  hasCertifications,
  hasLocation,
  str,
} from '@/lib/resumeProfileChecklist'

const BUILDER_HREF = '/dashboard/build-resume'
const GRADIENT_TOP = 'bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]'

function workRoleCount(profile) {
  const wx = profile?.work_experience
  if (!Array.isArray(wx)) return 0
  return wx.filter((j) => str(j?.jobTitle ?? j?.title) && str(j?.companyName ?? j?.company)).length
}

function educationEntryCount(profile) {
  const ed = profile?.education
  if (!Array.isArray(ed)) return 0
  return ed.filter((e) => str(e?.degreeName ?? e?.degree) && str(e?.schoolName ?? e?.institution ?? e?.school)).length
}

function certificationEntryCount(profile) {
  const c = profile?.certifications
  if (!Array.isArray(c)) return 0
  return c.filter((x) => str(x?.certificationName ?? x?.name) || str(x?.issuer)).length
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

export default function ProfileCompletionPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState(null)
  const [savingKey, setSavingKey] = useState(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [summary, setSummary] = useState('')
  const [skillsText, setSkillsText] = useState('')

  const inputClass =
    'w-full px-4 py-2.5 border border-[#eaeaf2] rounded-xl text-[#1a1a2e] bg-white focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all'

  const syncFormFromProfile = useCallback((p) => {
    if (!p) {
      setFullName('')
      setEmail('')
      setPhone('')
      setCity('')
      setCountry('')
      setLinkedinUrl('')
      setPortfolioUrl('')
      setSummary('')
      setSkillsText('')
      return
    }
    setFullName(str(p.full_name))
    setEmail(str(p.email))
    setPhone(str(p.phone_number))
    setCity(str(p.city))
    setCountry(str(p.country))
    setLinkedinUrl(str(p.linkedin_url))
    setPortfolioUrl(str(p.portfolio_url))
    setSummary(str(p.summary))
    setSkillsText(Array.isArray(p.skills) ? p.skills.map((x) => str(x)).filter(Boolean).join(', ') : '')
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      setLoadError(null)
      try {
        const { data: { user: u }, error: authErr } = await supabase.auth.getUser()
        if (cancelled) return
        if (authErr || !u) {
          router.replace('/login')
          return
        }
        setUser(u)

        const { data: row, error: profErr } = await supabase
          .from('resume_profiles')
          .select('*')
          .eq('user_id', u.id)
          .maybeSingle()

        if (cancelled) return
        if (profErr && profErr.code !== 'PGRST116') {
          setLoadError(profErr.message || 'Could not load profile')
          setProfile(null)
          syncFormFromProfile(null)
        } else {
          setProfile(row || null)
          syncFormFromProfile(row || null)
          if (!str(row?.email) && u.email) {
            setEmail(u.email)
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Something went wrong')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [router, syncFormFromProfile])

  const pct = getResumeProfileCompletionPercent(profile)

  async function saveUpdates(key, updates) {
    if (!user) return
    setSaveError(null)
    setSavingKey(key)
    try {
      const payload = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
        ...updates,
      }
      const { data, error } = await supabase.from('resume_profiles').upsert(payload, { onConflict: 'user_id' }).select().single()
      if (error) throw error
      setProfile(data)
      syncFormFromProfile(data)
    } catch (e) {
      setSaveError(e?.message || 'Save failed')
    } finally {
      setSavingKey(null)
    }
  }

  function FieldShell({ ok, title, children, hintMissing }) {
    return (
      <div className="ds-card relative overflow-hidden rounded-2xl border border-[#eaeaf2] bg-white p-5 sm:p-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.06)]">
        <div className={`absolute left-0 right-0 top-0 h-1 ${GRADIENT_TOP}`} />
        <div className="flex gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              ok ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
            }`}
          >
            {ok ? <CheckIcon /> : <AlertIcon />}
          </div>
          <div className="min-w-0 flex-1 space-y-3 pt-0.5">
            <h2 className="text-base font-bold text-[#1a1a2e]">{title}</h2>
            {!ok && hintMissing ? (
              <p className="text-sm font-medium text-orange-700 bg-orange-50/80 border border-orange-100 rounded-lg px-3 py-2">{hintMissing}</p>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-3xl min-w-0">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[#6366f1] hover:text-[#7c3aed] transition-colors"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </Link>

      <h1 className="text-2xl font-extrabold text-[#1a1a2e] sm:text-3xl mb-2">
        Profile{' '}
        <span className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">completion</span>
      </h1>
      <p className="text-[#5c5c7a] mb-8 text-sm sm:text-base">
        Complete your resume profile to get stronger AI output and ATS scores. Green checks mean you&apos;re set; orange prompts mean there&apos;s more to add.
      </p>

      {loadError && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      )}
      {saveError && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      )}

      <div className="ds-card relative mb-8 overflow-hidden rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.06)]">
        <div className={`absolute left-0 right-0 top-0 h-1.5 ${GRADIENT_TOP}`} />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#5c5c7a]">Overall completion</p>
            <p className="mt-1 text-4xl font-extrabold text-[#1a1a2e]">{pct}%</p>
          </div>
          <Link
            href={BUILDER_HREF}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] transition hover:opacity-95 ds-btn-glow"
          >
            Open full resume builder
          </Link>
        </div>
        <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-[#eaeaf2]">
          <div
            className={`h-full rounded-full ${GRADIENT_TOP} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-5">
        <FieldShell
          ok={Boolean(str(profile?.full_name))}
          title="Full name"
          hintMissing="Add your full name as it should appear on resumes."
        >
          {str(profile?.full_name) ? (
            <p className="text-sm text-[#5c5c7a]">
              <span className="font-medium text-[#1a1a2e]">{str(profile?.full_name)}</span>
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            <button
              type="button"
              disabled={savingKey === 'full_name'}
              onClick={() => saveUpdates('full_name', { full_name: fullName.trim() || null })}
              className="shrink-0 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ds-btn-glow"
            >
              {savingKey === 'full_name' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </FieldShell>

        <FieldShell
          ok={Boolean(str(profile?.email))}
          title="Email"
          hintMissing="Add a professional email recruiters can reach you at."
        >
          {str(profile?.email) ? (
            <p className="text-sm font-medium text-[#1a1a2e]">{str(profile.email)}</p>
          ) : user?.email ? (
            <p className="text-xs text-[#5c5c7a]">
              Signed in as <span className="font-medium text-[#1a1a2e]">{user.email}</span> — you can copy it below or enter another address.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            <button
              type="button"
              disabled={savingKey === 'email'}
              onClick={() => saveUpdates('email', { email: email.trim() || null })}
              className="shrink-0 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ds-btn-glow"
            >
              {savingKey === 'email' ? 'Saving…' : 'Save'}
            </button>
          </div>
          {!str(profile?.email) && user?.email ? (
            <button
              type="button"
              className="text-sm font-medium text-[#6366f1] hover:text-[#7c3aed] underline-offset-2 hover:underline"
              onClick={() => {
                setEmail(user.email)
                void saveUpdates('email', { email: user.email })
              }}
            >
              Use my account email ({user.email})
            </button>
          ) : null}
        </FieldShell>

        <FieldShell
          ok={Boolean(str(profile?.phone_number))}
          title="Phone"
          hintMissing="Add a phone number so employers can reach you quickly."
        >
          {str(profile?.phone_number) ? <p className="text-sm font-medium text-[#1a1a2e]">{str(profile.phone_number)}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
            <button
              type="button"
              disabled={savingKey === 'phone'}
              onClick={() => saveUpdates('phone', { phone_number: phone.trim() || null })}
              className="shrink-0 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ds-btn-glow"
            >
              {savingKey === 'phone' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </FieldShell>

        <FieldShell
          ok={hasLocation(profile)}
          title="Location"
          hintMissing="Add at least your city or country (both is best)."
        >
          {hasLocation(profile) ? (
            <p className="text-sm font-medium text-[#1a1a2e]">
              {[str(profile?.city), str(profile?.country)].filter(Boolean).join(', ') || '—'}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" />
          </div>
          <button
            type="button"
            disabled={savingKey === 'location'}
            onClick={() =>
              saveUpdates('location', {
                city: city.trim() || null,
                country: country.trim() || null,
              })
            }
            className="rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ds-btn-glow"
          >
            {savingKey === 'location' ? 'Saving…' : 'Save location'}
          </button>
        </FieldShell>

        <FieldShell
          ok={Boolean(str(profile?.linkedin_url))}
          title="LinkedIn URL"
          hintMissing="Paste your LinkedIn profile URL — many recruiters expect it."
        >
          {str(profile?.linkedin_url) ? (
            <a
              href={str(profile.linkedin_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#6366f1] hover:text-[#7c3aed] break-all"
            >
              {str(profile.linkedin_url)}
            </a>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input className={inputClass} type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
            <button
              type="button"
              disabled={savingKey === 'linkedin'}
              onClick={() => saveUpdates('linkedin', { linkedin_url: linkedinUrl.trim() || null })}
              className="shrink-0 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ds-btn-glow"
            >
              {savingKey === 'linkedin' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </FieldShell>

        <FieldShell
          ok={Boolean(str(profile?.portfolio_url))}
          title="Portfolio URL"
          hintMissing="Optional but recommended for design, engineering, or creative roles."
        >
          {str(profile?.portfolio_url) ? (
            <a
              href={str(profile.portfolio_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-[#6366f1] hover:text-[#7c3aed] break-all"
            >
              {str(profile.portfolio_url)}
            </a>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input className={inputClass} type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://yourportfolio.com" />
            <button
              type="button"
              disabled={savingKey === 'portfolio'}
              onClick={() => saveUpdates('portfolio', { portfolio_url: portfolioUrl.trim() || null })}
              className="shrink-0 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ds-btn-glow"
            >
              {savingKey === 'portfolio' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </FieldShell>

        <FieldShell
          ok={hasWorkExperience(profile)}
          title="Work experience"
          hintMissing="Add at least one role with a job title and company in the resume builder."
        >
          {hasWorkExperience(profile) ? (
            <p className="text-sm text-[#5c5c7a]">
              <span className="font-semibold text-emerald-700">{workRoleCount(profile)} role(s)</span> ready for tailoring.
            </p>
          ) : null}
          <Link
            href={BUILDER_HREF}
            className="inline-flex w-fit items-center rounded-xl border border-[#6366f1]/40 bg-[#f8f8ff] px-4 py-2 text-sm font-semibold text-[#6366f1] hover:bg-[#6366f1]/10 transition-colors"
          >
            {hasWorkExperience(profile) ? 'Edit work experience' : 'Add work experience'}
          </Link>
        </FieldShell>

        <FieldShell
          ok={hasEducation(profile)}
          title="Education"
          hintMissing="Add at least one degree with school name and program."
        >
          {hasEducation(profile) ? (
            <p className="text-sm text-[#5c5c7a]">
              <span className="font-semibold text-emerald-700">{educationEntryCount(profile)}</span>{' '}
              {educationEntryCount(profile) === 1 ? 'entry' : 'entries'} on file.
            </p>
          ) : null}
          <Link
            href={BUILDER_HREF}
            className="inline-flex w-fit items-center rounded-xl border border-[#6366f1]/40 bg-[#f8f8ff] px-4 py-2 text-sm font-semibold text-[#6366f1] hover:bg-[#6366f1]/10 transition-colors"
          >
            {hasEducation(profile) ? 'Edit education' : 'Add education'}
          </Link>
        </FieldShell>

        <FieldShell
          ok={hasSkills(profile)}
          title="Skills"
          hintMissing="List skills separated by commas, or manage them step-by-step in the builder."
        >
          {hasSkills(profile) ? (
            <p className="text-sm text-[#1a1a2e]">
              <span className="font-semibold text-emerald-700">{profile?.skills?.length ?? 0}</span> skill(s) saved.
            </p>
          ) : null}
          <textarea
            className={`${inputClass} min-h-[88px]`}
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="e.g. Python, SQL, AWS, Communication"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingKey === 'skills'}
              onClick={() => {
                const skills = skillsText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                saveUpdates('skills', { skills })
              }}
              className="rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ds-btn-glow"
            >
              {savingKey === 'skills' ? 'Saving…' : 'Save skills'}
            </button>
            <Link
              href={BUILDER_HREF}
              className="inline-flex items-center rounded-xl border border-[#eaeaf2] bg-white px-4 py-2.5 text-sm font-semibold text-[#5c5c7a] hover:border-[#6366f1]/40 hover:text-[#6366f1] transition-colors"
            >
              Edit in builder
            </Link>
          </div>
        </FieldShell>

        <FieldShell
          ok={hasCertifications(profile)}
          title="Certifications"
          hintMissing="Add certifications (name, issuer, year) in the resume builder."
        >
          {hasCertifications(profile) ? (
            <p className="text-sm text-[#5c5c7a]">
              <span className="font-semibold text-emerald-700">{certificationEntryCount(profile)} certification(s)</span> on file.
            </p>
          ) : null}
          <Link
            href={BUILDER_HREF}
            className="inline-flex w-fit items-center rounded-xl border border-[#6366f1]/40 bg-[#f8f8ff] px-4 py-2 text-sm font-semibold text-[#6366f1] hover:bg-[#6366f1]/10 transition-colors"
          >
            {hasCertifications(profile) ? 'Edit certifications' : 'Add certifications'}
          </Link>
        </FieldShell>

        <FieldShell
          ok={Boolean(str(profile?.summary))}
          title="Summary"
          hintMissing="Write a short professional summary — it anchors your generated resumes."
        >
          {str(profile?.summary) ? (
            <p className="text-sm text-[#5c5c7a] line-clamp-4 whitespace-pre-wrap">{str(profile.summary)}</p>
          ) : null}
          <textarea
            className={`${inputClass} min-h-[120px]`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="3–5 sentences about your background, strengths, and what you're looking for."
          />
          <button
            type="button"
            disabled={savingKey === 'summary'}
            onClick={() => saveUpdates('summary', { summary: summary.trim() || null })}
            className="rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ds-btn-glow"
          >
            {savingKey === 'summary' ? 'Saving…' : 'Save summary'}
          </button>
          <Link href={BUILDER_HREF} className="block text-sm font-medium text-[#6366f1] hover:text-[#7c3aed]">
            Or edit alongside other sections in the resume builder →
          </Link>
        </FieldShell>
      </div>
    </div>
  )
}
