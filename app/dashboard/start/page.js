'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getUsage, canCreateResumeForUser } from '@/lib/checkUsage'
import UpgradeLimitModal from '@/app/components/UpgradeLimitModal'

const STORAGE_KEY = 'job-description'

function parseJsonArray(value) {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function StartPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [profile, setProfile] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [showJobStep, setShowJobStep] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function checkProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }
        setAuthUser(user)
        const usage = await getUsage(supabase, user.id)
        if (!(await canCreateResumeForUser(supabase, user.id, usage))) {
          if (cancelled) return
          setShowUpgradeModal(true)
        }
        const { data, error } = await supabase
          .from('resume_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (cancelled) return
        setHasProfile(!error && data != null)
        setProfile(data)
      } catch {
        if (!cancelled) setHasProfile(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    checkProfile()
    return () => { cancelled = true }
  }, [router])

  const handleFetchJob = async () => {
    if (!jobUrl.trim()) return
    setFetchLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/fetch-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch job description')
      setJobDescription(data.text || '')
    } catch (err) {
      setFetchError(err.message || 'Could not fetch job description')
    } finally {
      setFetchLoading(false)
    }
  }

  const handleContinue = () => {
    if (!jobDescription.trim()) return
    try {
      const encoded = encodeURIComponent(jobDescription.trim())
      localStorage.setItem(STORAGE_KEY, encoded)
      router.push('/dashboard/choose-template')
    } catch (e) {
      console.error('Error saving job description to localStorage:', e)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    )
  }

  if (showUpgradeModal) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto opacity-50 pointer-events-none">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">Build Your Resume</h1>
        </div>
        <UpgradeLimitModal
          open={showUpgradeModal}
          variant="resume"
          onClose={() => setShowUpgradeModal(false)}
        />
      </>
    )
  }

  if (hasProfile && !showJobStep) {
    const workExp = parseJsonArray(profile?.work_experience)
    const education = parseJsonArray(profile?.education)
    const skills = parseJsonArray(profile?.skills)
    const projects = parseJsonArray(profile?.projects)
    const certifications = parseJsonArray(profile?.certifications)
    const recentJobs = workExp.slice(0, 2)

    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          Confirm Your Resume
        </h1>
        <p className="text-gray-500 mb-8 text-center">
          We found your saved resume profile. Review it and continue or upload a different one.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="flex flex-col gap-4 order-2 lg:order-1">
            <button
              type="button"
              onClick={() => setShowJobStep(true)}
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Continue with This Resume
            </button>
            <Link
              href="/dashboard/upload-resume"
              className="w-full py-4 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors text-center"
            >
              Upload a Different Resume
            </Link>
            <Link
              href="/dashboard/build-resume"
              className="w-full py-3 px-6 border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold rounded-xl transition-colors text-center text-sm"
            >
              Start From Scratch
            </Link>
          </div>

          <div className="order-1 lg:order-2">
            <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-lg shadow-slate-200/80 p-4">
              <div
                className="bg-white border border-slate-200 rounded-[0.5rem] shadow-md shadow-slate-300/70 mx-auto overflow-hidden"
                style={{ aspectRatio: '210 / 297' }}
              >
                <div className="h-full w-full px-4 py-3 overflow-auto">
                  {/* Header */}
                  <div className="text-center mb-2">
                    <p className="text-[8px] font-semibold text-slate-900 leading-tight">
                      {profile?.full_name || authUser?.user_metadata?.full_name || authUser?.email || 'Your Name'}
                    </p>
                    <p className="mt-0.5 text-[8px] text-slate-600 leading-snug">
                      {[profile?.email, profile?.phone_number, [profile?.city, profile?.country].filter(Boolean).join(', ')].filter(Boolean).join('  •  ')}
                    </p>
                  </div>

                  <div className="h-px bg-slate-200 my-1.5" />

                  {/* Summary */}
                  {profile?.summary && (
                    <section className="mb-2">
                      <h3 className="text-[8px] font-semibold tracking-[0.18em] text-slate-500 uppercase mb-1">
                        Summary
                      </h3>
                      <p className="text-[8px] leading-snug text-slate-800 whitespace-pre-line">
                        {profile.summary}
                      </p>
                    </section>
                  )}

                  {/* Experience */}
                  {workExp.length > 0 && (
                    <section className="mb-2">
                      <h3 className="text-[8px] font-semibold tracking-[0.18em] text-slate-500 uppercase mb-1">
                        Experience
                      </h3>
                      <div className="space-y-1">
                        {workExp.map((job, i) => (
                            <div key={i} className="text-[8px] leading-snug text-slate-800">
                              <p className="font-semibold text-slate-900">
                                {job.jobTitle || '—'}
                                {job.companyName && (
                                  <span className="font-normal text-slate-700"> @ {job.companyName}</span>
                                )}
                              </p>
                              {(job.startDate || job.endDate) && (
                                <p className="text-[8px] text-slate-500 mb-0.5">
                                  {job.startDate || '—'} – {job.endDate || 'Present'}
                                </p>
                              )}
                              {job.description && (
                                <p className="text-[8px] text-slate-800 whitespace-pre-line">
                                  {job.description}
                                </p>
                              )}
                            </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Education */}
                  {education.length > 0 && (
                    <section className="mb-2">
                      <h3 className="text-[8px] font-semibold tracking-[0.18em] text-slate-500 uppercase mb-1">
                        Education
                      </h3>
                      <div className="space-y-0.5">
                        {education.map((edu, i) => (
                          <div key={i} className="text-[8px] leading-snug text-slate-800">
                            <p className="font-semibold text-slate-900">
                              {edu.degreeName || '—'}
                            </p>
                            <p className="text-[8px] text-slate-700">
                              {edu.schoolName || '—'}
                              {edu.graduationYear && ` • ${edu.graduationYear}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <section className="mt-2">
                      <h3 className="text-[8px] font-semibold tracking-[0.18em] text-slate-500 uppercase mb-1">
                        Skills
                      </h3>
                      <p className="text-[8px] text-slate-800">
                        {skills.join(', ')}
                      </p>
                    </section>
                  )}

                  {/* Certifications */}
                  {certifications.length > 0 && (
                    <section className="mt-2">
                      <h3 className="text-[8px] font-semibold tracking-[0.18em] text-slate-500 uppercase mb-1">
                        Certifications
                      </h3>
                      <div className="space-y-0.5">
                        {certifications.map((cert, i) => (
                          <div key={i} className="text-[8px] leading-snug text-slate-800">
                            <p className="font-semibold text-slate-900">
                              {cert.certificationName || '—'}
                            </p>
                            {(cert.issuer || cert.year) && (
                              <p className="text-[8px] text-slate-700">
                                {cert.issuer || '—'}
                                {cert.year && ` • ${cert.year}`}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Projects */}
                  {projects.length > 0 && (
                    <section className="mt-2">
                      <h3 className="text-[8px] font-semibold tracking-[0.18em] text-slate-500 uppercase mb-1">
                        Projects
                      </h3>
                      <div className="space-y-0.5">
                        {projects.map((project, i) => (
                          <div key={i} className="text-[8px] leading-snug text-slate-800">
                            <p className="font-semibold text-slate-900">
                              {project.projectName || '—'}
                            </p>
                            {project.description && (
                              <p className="text-[8px] text-slate-700">
                                {project.description}
                              </p>
                            )}
                            {project.url && (
                              <p className="text-[8px] text-slate-500 truncate">
                                {project.url}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (hasProfile && showJobStep) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
          What job are you applying for?
        </h1>
        <p className="text-sm text-blue-600 font-medium mb-6">
          We will use your saved resume profile.
        </p>

        <textarea
          value={jobDescription}
          onChange={(e) => {
            setJobDescription(e.target.value)
            setFetchError(null)
          }}
          placeholder="Paste the job description here"
          rows={12}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-gray-900 placeholder-gray-400"
        />

        <div className="w-full flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm font-medium text-gray-500">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="w-full flex gap-2">
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => {
              setJobUrl(e.target.value)
              setFetchError(null)
            }}
            placeholder="Paste job posting URL (LinkedIn, Indeed, Glassdoor, etc.)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
            disabled={fetchLoading}
          />
          <button
            type="button"
            onClick={handleFetchJob}
            disabled={fetchLoading || !jobUrl.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shrink-0"
          >
            {fetchLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Fetching...
              </span>
            ) : (
              'Fetch Job Description'
            )}
          </button>
        </div>

        {fetchError && (
          <p className="w-full mt-2 text-sm text-red-600">{fetchError}</p>
        )}

        <div className="flex gap-3 w-full mt-6">
          <button
            type="button"
            onClick={() => setShowJobStep(false)}
            className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!jobDescription.trim()}
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2 text-center">
        Build Your Resume
      </h1>
      <p className="text-gray-500 mb-8 text-center">
        Get started by uploading an existing resume or building one from scratch.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
        <Link
          href="/dashboard/upload-resume"
          className="group flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all text-center"
        >
          <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Existing Resume</h2>
          <p className="text-sm text-gray-500">Import your resume and we&apos;ll optimize it for ATS</p>
        </Link>

        <Link
          href="/dashboard/build-resume"
          className="group flex flex-col items-center p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all text-center"
        >
          <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Build From Scratch</h2>
          <p className="text-sm text-gray-500">Create your resume step by step with our guided form</p>
        </Link>
      </div>

      <div className="w-full mt-6">
        <Link
          href="/dashboard/build-resume"
          className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          Prefer to start from scratch? Build manually
        </Link>
      </div>
    </div>
  )
}
