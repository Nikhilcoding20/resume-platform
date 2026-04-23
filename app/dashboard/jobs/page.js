'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isPro } from '@/lib/subscription'

async function jobsApiHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

const STORAGE_KEY = 'job-description'

const JOB_TYPES = [
  { value: 'any', label: 'All types' },
  { value: 'fulltime', label: 'Full time' },
  { value: 'parttime', label: 'Part time' },
  { value: 'remote', label: 'Remote' },
  { value: 'contract', label: 'Contract' },
]

const DATE_POSTED = [
  { value: 'any', label: 'Any time' },
  { value: 'today', label: 'Past 24 hours' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
]

const COUNTRIES = [
  { value: 'any', label: 'Any country' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'IN', label: 'India' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IE', label: 'Ireland' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SG', label: 'Singapore' },
  { value: 'JP', label: 'Japan' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
]

function sanitizeJobDescription(str) {
  if (str == null || typeof str !== 'string') return ''
  return str
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\u2028/g, '')
    .replace(/\u2029/g, '')
    .trim()
}

function formatJobTypeLabel(type, isRemote) {
  const t = (type || '').toUpperCase()
  if (isRemote) return 'Remote'
  if (t === 'FULLTIME') return 'Full time'
  if (t === 'PARTTIME') return 'Part time'
  if (t === 'CONTRACTOR') return 'Contract'
  if (t === 'INTERN') return 'Intern'
  if (!t || t === '—') return 'Not specified'
  return type
}

function formatPostedDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function buildJobPayload(job) {
  const header = [
    `${job.title} — ${job.company}`,
    job.location ? `Location: ${job.location}` : null,
    `Employment: ${formatJobTypeLabel(job.type, job.jobIsRemote)}`,
    job.postedAt ? `Posted: ${formatPostedDate(job.postedAt)}` : null,
    job.applyUrl ? `Apply / listing: ${job.applyUrl}` : null,
  ]
    .filter(Boolean)
    .join('\n')
  return `${header}\n\n---\n\n${job.description || job.snippet || ''}`
}

function parseJsonArray(value) {
  if (value == null) return []
  if (Array.isArray(value)) return value
  try {
    const p = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

/** Build JSearch query from resume profile (most recent job title + skills). */
function buildRecommendationQuery(profile) {
  if (!profile) return ''
  const jobs = parseJsonArray(profile.work_experience)
  const titles = jobs
    .map((j) => String(j?.jobTitle || j?.job_title || '').trim())
    .filter(Boolean)
  const primaryTitle = titles[0] || ''
  const skillsRaw = profile.skills
  const skills = Array.isArray(skillsRaw)
    ? skillsRaw.map((s) => String(s).trim()).filter(Boolean).slice(0, 12)
    : []
  const skillStr = skills.join(' ')
  const q = [primaryTitle, skillStr].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  if (q.length > 200) return `${q.slice(0, 197).trim()}…`
  return q
}

function buildRecommendationLocation(profile) {
  if (!profile) return ''
  const city = String(profile.city || '').trim()
  const ctry = String(profile.country || '').trim()
  if (city && ctry) return `${city}, ${ctry}`
  return city || ctry || ''
}

function mergeJobLists(prev, incoming) {
  const ids = new Set(prev.map((j) => j.id))
  const out = [...prev]
  for (const j of incoming) {
    if (!j?.id || ids.has(j.id)) continue
    ids.add(j.id)
    out.push(j)
  }
  return out
}

/** Gradient outline + gradient label; spinner while loading */
function LoadMoreJobsButton({ onClick, loading }) {
  return (
    <div className="flex justify-center mt-10 w-full">
      <div className="p-[2px] rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] shadow-[0_4px_20px_-6px_rgba(99,102,241,0.35)]">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          aria-busy={loading}
          className="flex items-center justify-center gap-2.5 min-w-[220px] px-8 py-3 rounded-[10px] bg-white font-semibold text-sm transition-colors hover:bg-[#fafaff] disabled:opacity-55 disabled:pointer-events-none"
        >
          {loading && (
            <span
              className="h-5 w-5 shrink-0 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin"
              aria-hidden
            />
          )}
          <span className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
            Load More Jobs
          </span>
        </button>
      </div>
    </div>
  )
}

function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_4px_24px_-8px_rgba(99,102,241,0.12)] animate-pulse">
      <div className="h-3 w-24 bg-[#eaeaf2] rounded-lg mb-3" />
      <div className="h-6 w-4/5 max-w-md bg-[#f0f0f7] rounded-lg mb-4" />
      <div className="h-3 w-full bg-[#f5f5fa] rounded mb-2" />
      <div className="h-3 w-2/3 bg-[#f5f5fa] rounded mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="h-6 w-20 bg-[#eaeaf2] rounded-lg" />
        <div className="h-6 w-24 bg-[#eaeaf2] rounded-lg" />
      </div>
      <div className="h-10 w-full bg-[#f0f0f7] rounded-xl" />
    </div>
  )
}

const selectClass =
  'w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] text-sm bg-white focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all appearance-none cursor-pointer'

function ProJobBoardLockOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-board-pro-title"
    >
      <div className="absolute inset-0 bg-white/55 backdrop-blur-md" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-[#eaeaf2] bg-white p-8 sm:p-10 shadow-[0_24px_80px_-20px_rgba(99,102,241,0.35)] text-center">
        <div className="text-5xl mb-4" aria-hidden>
          🔒
        </div>
        <h2
          id="job-board-pro-title"
          className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#7c3aed] via-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent mb-4"
        >
          Pro Feature
        </h2>
        <p className="text-[#5c5c7a] text-sm sm:text-base leading-relaxed mb-8">
          Job Board is available on Pro plans only. Upgrade to search thousands of real jobs and get matched resumes
          in one click.
        </p>
        <Link
          href="/dashboard/pricing"
          className="block w-full px-8 py-3.5 btn-gradient ds-btn-glow rounded-xl font-semibold text-white shadow-md hover:shadow-lg transition-all text-center mb-4"
        >
          Upgrade Now →
        </Link>
        <Link
          href="/dashboard"
          className="text-sm text-[#9ca3af] hover:text-[#6b7280] underline-offset-2 hover:underline"
        >
          Go Back
        </Link>
      </div>
    </div>
  )
}

function JobCard({ job, onBuildResume }) {
  return (
    <article
      className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_4px_24px_-8px_rgba(99,102,241,0.12)] hover:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.2)] transition-shadow duration-300 flex flex-col relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#06b6d4] opacity-90" />
      <p className="text-sm font-semibold text-[#6366f1] mt-2">{job.company}</p>
      <h2 className="text-lg font-bold text-[#1a1a2e] mt-1 mb-3 leading-snug group-hover:text-[#6366f1] transition-colors">
        {job.title}
      </h2>
      <div className="flex flex-wrap gap-2 text-xs text-[#5c5c7a] mb-3">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f8f8ff] border border-[#eaeaf2]">
          {job.location}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f8f8ff] border border-[#eaeaf2]">
          {formatJobTypeLabel(job.type, job.jobIsRemote)}
        </span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f8f8ff] border border-[#eaeaf2]">
          {formatPostedDate(job.postedAt)}
        </span>
      </div>
      <p className="text-sm text-[#5c5c7a] leading-relaxed flex-1 mb-5">{job.snippet}</p>
      <div className="flex flex-col sm:flex-row gap-3 mt-auto">
        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 rounded-xl text-center text-sm font-semibold border border-[#eaeaf2] text-[#1a1a2e] bg-white hover:bg-[#f8f8ff] hover:border-[#d4d4e8] transition-all shadow-sm"
          >
            View Job
          </a>
        ) : (
          <span className="flex-1 py-2.5 px-4 rounded-xl text-center text-sm font-semibold border border-[#eaeaf2] text-[#9ca3af] bg-[#fafafa]">
            No link
          </span>
        )}
        <button
          type="button"
          onClick={() => onBuildResume(job)}
          className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold btn-gradient ds-btn-glow text-white shadow-md hover:shadow-lg transition-all"
        >
          Build Resume for This Job
        </button>
      </div>
    </article>
  )
}

export default function JobsPage() {
  const router = useRouter()
  const [proAccess, setProAccess] = useState('loading')
  const [keywords, setKeywords] = useState('')
  const [location, setLocation] = useState('')
  const [jobType, setJobType] = useState('any')
  const [datePosted, setDatePosted] = useState('any')
  const [country, setCountry] = useState('any')
  const [jobs, setJobs] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  const [profileLoading, setProfileLoading] = useState(true)
  const [hasResumeProfile, setHasResumeProfile] = useState(false)
  const [canRecommend, setCanRecommend] = useState(false)
  const [recommendedJobs, setRecommendedJobs] = useState([])
  const [recLoading, setRecLoading] = useState(false)
  const [recError, setRecError] = useState(null)
  const [recPage, setRecPage] = useState(1)
  const [recHasMore, setRecHasMore] = useState(false)
  const [recLoadingMore, setRecLoadingMore] = useState(false)
  const recFetchParamsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setProAccess('free')
        return
      }
      const pro = await isPro(supabase, user.id)
      if (!cancelled) setProAccess(pro ? 'pro' : 'free')
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (proAccess !== 'pro') return
    let cancelled = false
    async function loadRecommendations() {
      setProfileLoading(true)
      setRecError(null)
      setRecommendedJobs([])
      recFetchParamsRef.current = null
      setRecPage(1)
      setRecHasMore(false)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (!user) {
          setHasResumeProfile(false)
          setCanRecommend(false)
          setProfileLoading(false)
          return
        }
        const { data: profile, error: profileError } = await supabase
          .from('resume_profiles')
          .select('work_experience, skills, city, country')
          .eq('user_id', user.id)
          .maybeSingle()
        if (cancelled) return
        if (profileError || !profile) {
          setHasResumeProfile(false)
          setCanRecommend(false)
          setProfileLoading(false)
          return
        }
        setHasResumeProfile(true)
        const q = buildRecommendationQuery(profile)
        const loc = buildRecommendationLocation(profile)
        if (!q) {
          setCanRecommend(false)
          setProfileLoading(false)
          return
        }
        setCanRecommend(true)
        setProfileLoading(false)
        setRecLoading(true)
        const sp = new URLSearchParams({
          query: q,
          page: '1',
          jobType: 'any',
          datePosted: 'any',
          country: 'any',
        })
        if (loc) sp.set('location', loc)
        const headers = await jobsApiHeaders()
        const res = await fetch(`/api/jobs?${sp.toString()}`, { headers })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setRecError(data.error || 'Could not load recommendations')
          setRecommendedJobs([])
          setRecHasMore(false)
        } else {
          const list = Array.isArray(data.jobs) ? data.jobs : []
          setRecommendedJobs(list)
          setRecPage(1)
          setRecHasMore(Boolean(data.hasMore))
          recFetchParamsRef.current = { query: q, location: loc }
        }
      } catch (e) {
        if (!cancelled) {
          setRecError(e.message || 'Could not load recommendations')
          setRecommendedJobs([])
        }
      } finally {
        if (!cancelled) {
          setRecLoading(false)
          setProfileLoading(false)
        }
      }
    }
    loadRecommendations()
    return () => {
      cancelled = true
    }
  }, [proAccess])

  const fetchJobs = useCallback(
    async (pageNum, append) => {
      if (proAccess !== 'pro') return
      const q = keywords.trim()
      if (!q) {
        setError('Enter a job title or keywords to search.')
        return
      }
      if (append) setLoadingMore(true)
      else {
        setLoading(true)
        setError(null)
        setSearched(true)
      }
      try {
        const sp = new URLSearchParams({
          query: q,
          page: String(pageNum),
          jobType,
          datePosted,
          country,
        })
        if (location.trim()) sp.set('location', location.trim())
        const headers = await jobsApiHeaders()
        const res = await fetch(`/api/jobs?${sp.toString()}`, { headers })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Search failed')
        const list = Array.isArray(data.jobs) ? data.jobs : []
        setJobs((prev) => (append ? [...prev, ...list] : list))
        setHasMore(Boolean(data.hasMore))
        setPage(pageNum)
      } catch (e) {
        setError(e.message || 'Something went wrong')
        if (!append) setJobs([])
        setHasMore(false)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [keywords, location, jobType, datePosted, country, proAccess]
  )

  const handleRecLoadMore = useCallback(async () => {
    if (proAccess !== 'pro') return
    const params = recFetchParamsRef.current
    if (!params?.query || !recHasMore || recLoadingMore || recLoading) return
    setRecLoadingMore(true)
    try {
      const nextPage = recPage + 1
      const sp = new URLSearchParams({
        query: params.query,
        page: String(nextPage),
        jobType: 'any',
        datePosted: 'any',
        country: 'any',
      })
      if (params.location) sp.set('location', params.location)
      const headers = await jobsApiHeaders()
      const res = await fetch(`/api/jobs?${sp.toString()}`, { headers })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRecError(data.error || 'Could not load more jobs')
        return
      }
      const list = Array.isArray(data.jobs) ? data.jobs : []
      setRecommendedJobs((prev) => mergeJobLists(prev, list))
      setRecPage(nextPage)
      setRecHasMore(Boolean(data.hasMore))
    } catch (e) {
      setRecError(e.message || 'Could not load more jobs')
    } finally {
      setRecLoadingMore(false)
    }
  }, [recPage, recHasMore, recLoadingMore, recLoading, proAccess])

  const handleSearch = (e) => {
    e?.preventDefault?.()
    setPage(1)
    void fetchJobs(1, false)
  }

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return
    void fetchJobs(page + 1, true)
  }

  const handleBuildResume = (job) => {
    const text = sanitizeJobDescription(buildJobPayload(job))
    if (!text) return
    try {
      localStorage.setItem(STORAGE_KEY, encodeURIComponent(text))
      router.push('/dashboard/choose-template')
    } catch (err) {
      console.error(err)
    }
  }

  if (proAccess === 'loading') {
    return (
      <div className="max-w-6xl mx-auto min-h-[50vh] flex flex-col items-center justify-center gap-4">
        <div
          className="h-10 w-10 rounded-full border-2 border-[#6366f1] border-t-transparent animate-spin"
          aria-hidden
        />
        <p className="text-sm text-[#5c5c7a]">Checking access…</p>
      </div>
    )
  }

  return (
    <>
      <div
        className={`max-w-6xl mx-auto relative ${proAccess === 'free' ? 'blur-[3px] pointer-events-none select-none' : ''}`}
      >
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent mb-2">
          Find jobs
        </h1>
        <p className="text-[#5c5c7a] text-sm sm:text-base max-w-2xl">
          Search real-time listings, then tailor your resume to a role in one click.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.15)] mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <label htmlFor="job-keywords" className="block text-sm font-medium text-[#1a1a2e] mb-1">
              Job title / keywords
            </label>
            <input
              id="job-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Product Designer, React"
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all"
            />
          </div>
          <div>
            <label htmlFor="job-location" className="block text-sm font-medium text-[#1a1a2e] mb-1">
              Location
            </label>
            <input
              id="job-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, Remote"
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all"
            />
          </div>
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div>
            <label htmlFor="filter-type" className="block text-sm font-medium text-[#1a1a2e] mb-1">
              Job type
            </label>
            <select
              id="filter-type"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className={selectClass}
            >
              {JOB_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-date" className="block text-sm font-medium text-[#1a1a2e] mb-1">
              Date posted
            </label>
            <select
              id="filter-date"
              value={datePosted}
              onChange={(e) => setDatePosted(e.target.value)}
              className={selectClass}
            >
              {DATE_POSTED.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-country" className="block text-sm font-medium text-[#1a1a2e] mb-1">
              Country
            </label>
            <select
              id="filter-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={selectClass}
            >
              {COUNTRIES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Row 3 */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 btn-gradient ds-btn-glow rounded-xl font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!searched && (
        <section className="mb-10" aria-label="Recommended jobs">
          {profileLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          )}
          {!profileLoading && (!hasResumeProfile || !canRecommend) && (
            <div className="rounded-2xl border border-[#eaeaf2] bg-white p-10 sm:p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,0.06)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
              <p className="text-lg font-semibold text-[#1a1a2e] mb-2 mt-2">
                Build your resume first to get personalised job recommendations
              </p>
              <p className="text-[#5c5c7a] text-sm max-w-md mx-auto mb-6">
                Add your work history and skills to your profile — we&apos;ll match you with roles that fit your background.
              </p>
              <Link
                href="/dashboard/build-resume"
                className="inline-flex px-8 py-3 btn-gradient ds-btn-glow rounded-xl font-semibold text-white shadow-md hover:shadow-lg transition-all"
              >
                Build your resume
              </Link>
            </div>
          )}
          {!profileLoading && hasResumeProfile && canRecommend && (
            <>
              <h2 className="text-xl font-bold text-[#1a1a2e] mb-6 flex items-center gap-2">
                <span className="text-2xl leading-none" aria-hidden>
                  ✨
                </span>
                Recommended For You
              </h2>
              {recError && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {recError}
                </div>
              )}
              {recLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <JobCardSkeleton key={i} />
                  ))}
                </div>
              )}
              {!recLoading && !recError && recommendedJobs.length === 0 && (
                <div className="rounded-2xl border border-[#eaeaf2] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
                  <p className="text-lg font-semibold text-[#1a1a2e] mb-2">No recommendations yet</p>
                  <p className="text-[#5c5c7a] text-sm max-w-md mx-auto">
                    We couldn&apos;t find listings for your profile right now. Try a manual search above.
                  </p>
                </div>
              )}
              {!recLoading && recommendedJobs.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recommendedJobs.map((job) => (
                      <JobCard key={job.id} job={job} onBuildResume={handleBuildResume} />
                    ))}
                  </div>
                  {recHasMore && (
                    <LoadMoreJobsButton onClick={handleRecLoadMore} loading={recLoadingMore} />
                  )}
                </>
              )}
            </>
          )}
        </section>
      )}

      {searched && loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {searched && !loading && jobs.length === 0 && !error && (
        <div className="rounded-2xl border border-[#eaeaf2] bg-white p-12 text-center shadow-[0_4px_24px_rgba(15,23,42,0.06)]">
          <p className="text-lg font-semibold text-[#1a1a2e] mb-2">No jobs found</p>
          <p className="text-[#5c5c7a] text-sm max-w-md mx-auto">
            Try different keywords, widening the location, relaxing filters, or searching again later — listings update often.
          </p>
        </div>
      )}

      {searched && !loading && jobs.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onBuildResume={handleBuildResume} />
            ))}
          </div>
          {hasMore && (
            <LoadMoreJobsButton onClick={handleLoadMore} loading={loadingMore} />
          )}
        </>
      )}
      </div>
      {proAccess === 'free' ? <ProJobBoardLockOverlay /> : null}
    </>
  )
}
