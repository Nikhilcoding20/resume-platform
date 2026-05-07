'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AtsScoreLoadingOverlay from '@/app/components/AtsScoreLoadingOverlay'

const JOB_DESCRIPTION_STORAGE_KEY = 'job-description'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

function isAcceptedFile(file) {
  if (!file) return false
  const type = file.type?.toLowerCase()
  const name = file.name?.toLowerCase() || ''
  return ACCEPTED_TYPES.includes(type) ||
    name.endsWith('.pdf') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx') ||
    name.endsWith('.txt')
}

function scoreColor(score) {
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

function scoreRingColor(score) {
  if (score >= 70) return 'stroke-green-500'
  if (score >= 50) return 'stroke-yellow-500'
  return 'stroke-red-500'
}

function sanitizeHandoffText(str, maxLen) {
  if (str == null || typeof str !== 'string') return ''
  return str
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen)
}

/** Builds instructions passed to /api/generate-resume (sessionStorage) after profile is filled via extract-resume. */
function buildAtsBuilderPrompt(analysis, resumeText) {
  const lines = []
  lines.push(
    'Use the resume profile data (from the candidate\'s current resume) as the source of truth for employers, titles, dates, and education. Do not invent roles or credentials.'
  )
  lines.push('Tailor the rewritten resume to the job description and apply every ATS improvement below.')

  if (analysis?.overall_score != null) {
    lines.push(`ATS overall score: ${analysis.overall_score}/100.`)
  }
  const km = analysis?.keyword_match
  const em = analysis?.experience_match
  const sm = analysis?.skills_match
  if (km != null || em != null || sm != null) {
    lines.push(`Subscores — Keyword match: ${km ?? '—'}/100, Experience match: ${em ?? '—'}/100, Skills match: ${sm ?? '—'}/100.`)
  }

  const missing = analysis?.missing_keywords || []
  if (missing.length) {
    lines.push(`Missing keywords (integrate naturally where truthful): ${missing.join(', ')}`)
  }
  const strong = analysis?.strong_keywords || []
  if (strong.length) {
    lines.push(`Strong keywords to keep or reinforce: ${strong.join(', ')}`)
  }

  const wins = analysis?.quick_wins || []
  wins.forEach((w, i) => {
    lines.push(`Quick win ${i + 1}: ${w}`)
  })

  const recs = analysis?.recommendations || []
  recs.forEach((rec, i) => {
    const tip = typeof rec === 'string' ? rec : rec?.tip
    const where = typeof rec === 'object' && rec?.where_to_add ? ` Where to add: ${rec.where_to_add}` : ''
    if (tip) lines.push(`Recommendation ${i + 1}: ${tip}.${where}`)
  })

  const plan = analysis?.full_improvement_plan || []
  plan.forEach((step, i) => {
    lines.push(`Improvement plan ${i + 1}: ${step}`)
  })

  const working = analysis?.what_is_working || []
  if (working.length) {
    lines.push('Preserve these strengths:')
    working.forEach((w) => lines.push(`- ${w}`))
  }

  const snippet = sanitizeHandoffText(resumeText || '', 4500)
  if (snippet) {
    lines.push('')
    lines.push('Reference — resume text from ATS check (stay consistent with extracted profile):')
    lines.push(snippet)
  }

  return sanitizeHandoffText(lines.join('\n'), 11500)
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-[#eaeaf2] rounded-xl overflow-hidden bg-white shadow-sm hover:border-[#06b6d4]/30 hover:shadow-md transition-all">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 w-full items-center justify-between px-4 py-3 text-left font-medium text-[#1a1a2e] transition-colors bg-white/80 hover:bg-[#f8f8ff]"
      >
        {title}
        <span className="text-[#06b6d4]">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="p-4 bg-[#f8f8ff]/80 border-t border-[#eaeaf2] text-[#5c5c7a]">{children}</div>}
    </div>
  )
}

export default function AtsCheckerPage() {
  const router = useRouter()
  const [file, setFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [jobDescription, setJobDescription] = useState('')
  const [showAtsHandoffBanner, setShowAtsHandoffBanner] = useState(false)
  const [savedResumeName, setSavedResumeName] = useState('')
  const [highlightUpload, setHighlightUpload] = useState(false)
  const [jobUrl, setJobUrl] = useState('')
  const [fetchJobLoading, setFetchJobLoading] = useState(false)
  const [fetchJobError, setFetchJobError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fixLoading, setFixLoading] = useState(false)
  const [error, setError] = useState(null)
  const [atsProgress, setAtsProgress] = useState(0)
  const atsProgressIntervalRef = useRef(null)

  const stopAtsProgress = () => {
    if (atsProgressIntervalRef.current) {
      clearInterval(atsProgressIntervalRef.current)
      atsProgressIntervalRef.current = null
    }
  }

  useEffect(() => {
    if (!loading) {
      stopAtsProgress()
      return
    }
    setAtsProgress(0)
    atsProgressIntervalRef.current = setInterval(() => {
      setAtsProgress((p) => (p >= 90 ? 90 : Math.min(90, p + 0.4)))
    }, 120)
    return stopAtsProgress
  }, [loading])
  const [result, setResult] = useState(null)
  const [resumeText, setResumeText] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const params = new URLSearchParams(window.location.search)
      const fromHomepage = params.get('from') === 'homepage'
      const r = sessionStorage.getItem('ats-prefill-resume')
      const j = sessionStorage.getItem('ats-prefill-job')
      if (r?.trim()) {
        setFile(new File([r], 'pasted-resume.txt', { type: 'text/plain' }))
        sessionStorage.removeItem('ats-prefill-resume')
      }
      if (j?.trim()) {
        setJobDescription(j)
        sessionStorage.removeItem('ats-prefill-job')
      }

      if (fromHomepage) {
        const homepageJobDescription = localStorage.getItem('ats_job_description')
        const homepageResumeName = localStorage.getItem('ats_resume_name')

        if (homepageJobDescription?.trim()) {
          setJobDescription(homepageJobDescription)
        }
        if (homepageResumeName?.trim()) {
          setSavedResumeName(homepageResumeName.trim())
        }

        const hasSavedAtsContext = Boolean(homepageJobDescription?.trim() || homepageResumeName?.trim())
        if (hasSavedAtsContext) {
          setShowAtsHandoffBanner(true)
          setHighlightUpload(true)
        }
      }

      localStorage.removeItem('ats_job_description')
      localStorage.removeItem('ats_resume_name')
    } catch {
      /* ignore */
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (isAcceptedFile(droppedFile)) {
      setFile(droppedFile)
      setHighlightUpload(false)
      setError(null)
    } else {
      setFile(null)
      setError('Please upload a PDF, Word, or TXT file.')
    }
  }, [])

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files[0]
    if (isAcceptedFile(selectedFile)) {
      setFile(selectedFile)
      setHighlightUpload(false)
      setError(null)
    } else {
      setFile(null)
      setError('Please upload a PDF, Word, or TXT file.')
    }
  }, [])

  const handleFetchJob = async () => {
    if (!jobUrl.trim()) return

    setFetchJobLoading(true)
    setFetchJobError(null)

    try {
      const res = await fetch('/api/fetch-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch job description')
      }
      setJobDescription(data.text || '')
    } catch (err) {
      setFetchJobError(err.message || 'Could not fetch job description')
    } finally {
      setFetchJobLoading(false)
    }
  }

  const handleCheck = async () => {
    if (!file || !jobDescription.trim()) {
      setError('Please upload a resume and paste the job description.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setResumeText(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to continue.')
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('jobDescription', jobDescription.trim())

      const res = await fetch('/api/ats-checker', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze resume')
      }

      stopAtsProgress()
      setAtsProgress(100)
      await new Promise((r) => setTimeout(r, 500))

      setResumeText(data.resumeText || null)
      const { resumeText: _, ...analysis } = data
      setResult(analysis)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleMakeChanges = async () => {
    if (!result || !resumeText || !jobDescription.trim()) return

    setFixLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ats-fix-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          atsAnalysis: result,
          jobDescription: jobDescription.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate improved resume')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'improved-resume.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setFixLoading(false)
    }
  }

  const handleBuildResumeWithFixes = () => {
    if (!result || !resumeText?.trim() || !jobDescription.trim()) {
      setError('Need ATS results, resume text, and a job description to open the resume builder.')
      return
    }
    setError(null)
    try {
      const prompt = buildAtsBuilderPrompt(result, resumeText)
      sessionStorage.setItem('resume-generate-additional-instructions', prompt)
      sessionStorage.setItem('ats-handoff-pending', '1')
      sessionStorage.setItem('ats-handoff-resume-text', resumeText)
      sessionStorage.setItem('ats-handoff-post-upload', 'choose-template')
      const jd = jobDescription.replace(/\u2028/g, '').replace(/\u2029/g, '')
      localStorage.setItem(JOB_DESCRIPTION_STORAGE_KEY, encodeURIComponent(sanitizeHandoffText(jd, 800000)))
    } catch (e) {
      console.error('[ats-checker] Build resume handoff failed:', e)
      setError('Could not start the resume builder. Please try again.')
      return
    }
    router.push('/dashboard/upload-resume')
  }

  const handleCheckAnotherResume = () => {
    setResult(null)
    setResumeText(null)
    setError(null)
    setFile(null)
    setFileInputKey((k) => k + 1)
    stopAtsProgress()
    setAtsProgress(0)
  }

  return (
    <div className="relative mx-auto max-w-6xl min-w-0">
      <AtsScoreLoadingOverlay active={loading} progress={atsProgress} headline="Your ATS score is being calculated..." />
      {showAtsHandoffBanner && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3 text-sm text-[#3730a3]">
          <div>
            <p className="font-medium">
              Almost there! We saved your job description. Just upload your resume one more time to see your ATS score.
            </p>
            {savedResumeName && (
              <p className="mt-1 text-xs text-[#4f46e5]">
                Last selected resume: <span className="font-medium">{savedResumeName}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAtsHandoffBanner(false)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#c7d2fe] text-[#4f46e5] transition-colors hover:bg-white"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}
      <h1 className="text-2xl font-semibold bg-gradient-to-r from-[#06b6d4] to-white bg-clip-text text-transparent mb-8">ATS Score Checker</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-sm font-medium text-[#5c5c7a] mb-3">Resume</h2>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !loading && document.getElementById('ats-file-input').click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging ? 'border-[#06b6d4] bg-[#06b6d4]/10 shadow-[0_0_24px_rgba(6,182,212,0.2)]' : 'border-[#eaeaf2] hover:border-[#06b6d4]/50 bg-[#f8f8ff]/50'
            } ${highlightUpload && !file ? 'border-[#6366f1] bg-[#eef2ff] ring-2 ring-[#6366f1]/30 shadow-[0_0_30px_rgba(99,102,241,0.35)]' : ''} ${loading ? 'pointer-events-none opacity-70' : ''}`}
          >
            <input
              key={fileInputKey}
              id="ats-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <p className="text-[#1a1a2e] font-medium">{file.name}</p>
            ) : (
              <p className="text-[#5c5c7a]">Click or drag and drop your resume here</p>
            )}
            <p className="text-sm text-[#5c5c7a] mt-1">PDF, Word, or TXT</p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-[#5c5c7a] mb-3">Job Description</h2>
          <textarea
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value)
              setFetchJobError(null)
            }}
            placeholder="Paste the job description here..."
            rows={10}
            disabled={loading}
            className="w-full px-4 py-3 border border-[#eaeaf2] rounded-xl focus:ring-2 focus:ring-[#06b6d4] bg-white text-[#1a1a2e] placeholder-[#9ca3af] resize-y disabled:opacity-70 transition-all"
          />
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#eaeaf2]" />
            <span className="text-sm font-medium text-[#5c5c7a]">OR</span>
            <div className="flex-1 h-px bg-[#eaeaf2]" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => {
                setJobUrl(e.target.value)
                setFetchJobError(null)
              }}
              placeholder="Paste job posting URL (LinkedIn, Indeed, Glassdoor, etc.)"
              className="min-h-11 w-full flex-1 rounded-xl border border-[#eaeaf2] bg-white px-4 py-3 text-[#1a1a2e] placeholder-[#9ca3af] transition-all focus:ring-2 focus:ring-[#06b6d4] disabled:opacity-70"
              disabled={loading || fetchJobLoading}
            />
            <button
              type="button"
              onClick={handleFetchJob}
              disabled={loading || fetchJobLoading || !jobUrl.trim()}
              className="min-h-11 w-full shrink-0 rounded-xl px-4 py-3 font-medium text-white transition-all btn-gradient-teal ds-btn-glow disabled:opacity-40 sm:w-auto sm:px-5"
            >
              {fetchJobLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Fetching...
                </span>
              ) : (
                'Fetch Job Description'
              )}
            </button>
          </div>
          {fetchJobError && <p className="mt-2 text-sm text-red-400">{fetchJobError}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheck}
        disabled={!file || !jobDescription.trim() || loading}
        className="min-h-11 w-full rounded-xl px-6 py-3.5 text-lg font-semibold text-white shadow-[0_0_28px_rgba(6,182,212,0.25)] transition-all btn-gradient-teal ds-btn-glow disabled:opacity-40 sm:py-4"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing...
          </span>
        ) : (
          'Check ATS Score'
        )}
      </button>

      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="mt-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-8 p-6 bg-white border border-[#eaeaf2] shadow-sm rounded-xl border border-[#eaeaf2] shadow-[0_0_40px_rgba(6,182,212,0.08)]">
            <div className="flex-shrink-0">
              <div className="relative w-36 h-36 drop-shadow-[0_0_20px_rgba(6,182,212,0.35)]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#eaeaf2" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={scoreRingColor(result.overall_score ?? 0)}
                    strokeDasharray={`${(result.overall_score ?? 0) * 2.83} 283`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-4xl font-bold ${scoreColor(result.overall_score ?? 0)}`}>
                    {result.overall_score ?? 0}
                  </span>
                </div>
              </div>
              <p className="text-center text-sm text-[#5c5c7a] mt-2">Overall Score</p>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl border border-[#eaeaf2]">
                <p className="text-xs text-[#06b6d4] uppercase tracking-wide mb-1">Keyword Match</p>
                <p className="text-2xl font-semibold text-[#1a1a2e]">{result.keyword_match ?? '—'}/100</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-[#eaeaf2]">
                <p className="text-xs text-[#06b6d4] uppercase tracking-wide mb-1">Experience Match</p>
                <p className="text-2xl font-semibold text-[#1a1a2e]">{result.experience_match ?? '—'}/100</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-[#eaeaf2]">
                <p className="text-xs text-[#06b6d4] uppercase tracking-wide mb-1">Skills Match</p>
                <p className="text-2xl font-semibold text-[#1a1a2e]">{result.skills_match ?? '—'}/100</p>
              </div>
            </div>
          </div>

          <CollapsibleSection title="Missing Keywords" defaultOpen={true}>
            <div className="flex flex-wrap gap-2">
              {(result.missing_keywords || []).length ? (
                (result.missing_keywords || []).map((kw, i) => (
                  <span key={`${kw}-${i}`} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    {kw}
                  </span>
                ))
              ) : (
                <p className="text-[#5c5c7a] text-sm">None identified</p>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Strong Keywords">
            <div className="flex flex-wrap gap-2">
              {(result.strong_keywords || []).length ? (
                (result.strong_keywords || []).map((kw, i) => (
                  <span key={`${kw}-${i}`} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {kw}
                  </span>
                ))
              ) : (
                <p className="text-[#5c5c7a] text-sm">None identified</p>
              )}
            </div>
          </CollapsibleSection>

          {(result.quick_wins?.length > 0) && (
            <CollapsibleSection title="Quick Wins" defaultOpen={true}>
              <ul className="space-y-2">
                {(result.quick_wins || []).map((win, i) => (
                  <li key={`qw-${i}`} className="flex items-start gap-2 text-[#cbd5e1]">
                    <span className="text-amber-500 font-bold">{i + 1}.</span>
                    {win}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {(result.recommendations?.length > 0) && (
            <CollapsibleSection title="Recommendations">
              <ul className="space-y-3">
                {(result.recommendations || []).map((rec, i) => {
                  const tip = typeof rec === 'string' ? rec : rec?.tip
                  const where = typeof rec === 'object' && rec?.where_to_add ? rec.where_to_add : ''
                  return (
                  <li key={`rec-${i}`} className="p-3 bg-white rounded-lg border border-[#eaeaf2]">
                    <p className="text-[#1a1a2e] font-medium">{tip}</p>
                    {where ? (
                      <p className="text-sm text-[#5c5c7a] mt-1">
                        <span className="font-medium">Where to add:</span> {where}
                      </p>
                    ) : null}
                  </li>
                  )
                })}
              </ul>
            </CollapsibleSection>
          )}

          {(result.what_is_working?.length > 0) && (
            <CollapsibleSection title="What is Working">
              <ul className="space-y-2">
                {(result.what_is_working || []).map((item, i) => (
                  <li key={`wiw-${i}`} className="flex items-start gap-2 text-[#cbd5e1]">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {(result.full_improvement_plan?.length > 0) && (
            <CollapsibleSection title="Full Improvement Plan">
              <ol className="space-y-2 list-decimal list-inside text-[#cbd5e1]">
                {(result.full_improvement_plan || []).map((step, i) => (
                  <li key={`plan-${i}`}>{step}</li>
                ))}
              </ol>
            </CollapsibleSection>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t border-[#eaeaf2]">
            <button
              type="button"
              onClick={handleBuildResumeWithFixes}
              className="flex-1 min-h-12 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-indigo-200/40 btn-gradient ds-btn-glow transition-all hover:opacity-95"
            >
              Build Resume with These Fixes
            </button>
            <button
              type="button"
              onClick={handleCheckAnotherResume}
              className="flex-1 min-h-12 rounded-xl px-6 py-3.5 text-[15px] font-semibold border-2 border-[#eaeaf2] bg-white text-[#1a1a2e] hover:border-[#6366f1]/40 hover:bg-[#f8f8ff] transition-all"
            >
              Check Another Resume
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
