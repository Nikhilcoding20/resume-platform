'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUsage, canCreateCoverLetterForUser } from '@/lib/checkUsage'
import Link from 'next/link'
import UpgradeLimitModal from '@/app/components/UpgradeLimitModal'
import { formatDateWithOrdinal } from '@/lib/coverLetterDocument'

const APP_BRAND = 'Unemployed Club'

const COVER_LETTER_TIPS = [
  {
    text: 'A great cover letter tells a story your resume cannot.',
    emoji: '📖',
    source: 'Harvard Business Review · Narrative & impact',
  },
  {
    text: '83% of hiring managers say a cover letter influences their decision.',
    emoji: '💼',
    source: 'Unemployed Club · Hiring manager insights',
  },
  {
    text: 'Address the hiring manager by name whenever possible.',
    emoji: '👤',
    source: 'Career experts · Personalization',
  },
  {
    text: 'Show enthusiasm for the specific company—not just the role.',
    emoji: '❤️',
    source: 'Recruiter feedback · Culture fit signals',
  },
  {
    text: 'Our AI is writing your personalized cover letter right now…',
    emoji: '✨',
    source: 'Unemployed Club · Matched to your resume & job',
  },
]

const TIP_INTERVAL_MS = 5000
const EXIT_ANIM_MS = 500

function CoverLetterGeneratingOverlay({ active, progress }) {
  const [tipIndex, setTipIndex] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!active) {
      setTipIndex(0)
      setExiting(false)
      return
    }
    let timeoutId
    const id = setInterval(() => {
      setExiting(true)
      timeoutId = setTimeout(() => {
        setTipIndex((i) => (i + 1) % COVER_LETTER_TIPS.length)
        setExiting(false)
      }, EXIT_ANIM_MS)
    }, TIP_INTERVAL_MS)
    return () => {
      clearInterval(id)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [active])

  if (!active) return null

  const tip = COVER_LETTER_TIPS[tipIndex]
  const pct = Math.round(progress)

  return (
    <div className="fixed inset-0 z-[200] flex min-h-screen flex-col bg-white" aria-busy="true" aria-live="polite">
      <header className="bg-white/90 backdrop-blur-md border-b border-[#eaeaf2] py-4 flex justify-center"><span className="text-sm font-semibold bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">{APP_BRAND}</span></header>
      <div className="shrink-0 px-4 py-5 sm:px-8 bg-[#f8f8ff] border-b border-[#eaeaf2]">
        <p className="mb-3 font-semibold text-[#1a1a2e]">Your cover letter is being generated...</p>
        <div className="flex items-center gap-4">
          <div className="h-2 flex-1 rounded-full bg-[#eaeaf2] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#a855f7] transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-bold tabular-nums text-[#5c5c7a] min-w-[2.5rem] text-right">{pct}%</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 bg-dot-grid-light">
        <div key={tipIndex} className={`w-full max-w-lg rounded-2xl border border-[#eaeaf2] bg-white p-8 shadow-lg relative overflow-hidden ${exiting ? 'animate-tip-card-out' : 'animate-tip-card-in'}`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#06b6d4]" />
          <div className="text-4xl text-center mb-4">{tip.emoji}</div>
          <p className="text-center font-semibold text-[#1a1a2e] text-lg">{tip.text}</p>
          <p className="text-center text-sm text-[#5c5c7a] mt-3">{tip.source}</p>
        </div>
        <div className="flex gap-2 mt-8">
          {COVER_LETTER_TIPS.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === tipIndex ? 'w-6 bg-gradient-to-r from-[#6366f1] to-[#a855f7]' : 'w-1.5 bg-[#eaeaf2]'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

function CoverLetterLivePreview({ header, bodyText }) {
  const contactParts = [header?.email, header?.phone, header?.linkedin].filter(Boolean)
  const paragraphs = (bodyText || '').split(/\n\n+/).filter((p) => p.trim())

  return (
    <div
      className="text-black"
      style={{
        fontFamily: "'Calibri', 'Trebuchet MS', ui-sans-serif, sans-serif",
        fontSize: 12,
        lineHeight: 1.6,
      }}
    >
      <div className="text-center mb-5">
        <h2 className="text-[20px] font-bold m-0 mb-1.5 leading-tight">{header?.fullName || ''}</h2>
        {contactParts.length > 0 && (
          <p className="m-0 text-[12px] text-black">
            {contactParts.join(' \u00a0|\u00a0 ')}
          </p>
        )}
      </div>
      <p className="text-right m-0 mb-5 text-[12px]">{formatDateWithOrdinal()}</p>
      <p className="m-0 mb-3.5 text-[12px]">Dear Hiring Manager,</p>
      <div className="mb-0">
        {paragraphs.map((para, i) => (
          <p key={i} className="m-0 mb-3.5 text-[12px] whitespace-pre-wrap last:mb-0">
            {para}
          </p>
        ))}
      </div>
      <p className="mt-6 mb-0 text-[12px]">Sincerely,</p>
      <p className="m-0 h-4" aria-hidden />
      <p className="m-0 h-4" aria-hidden />
      <p className="m-0 text-[12px]">{header?.fullName || ''}</p>
    </div>
  )
}

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
  return (
    ACCEPTED_TYPES.includes(type) ||
    name.endsWith('.pdf') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx') ||
    name.endsWith('.txt')
  )
}

export default function CoverLetterPage() {
  const router = useRouter()
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [initLoading, setInitLoading] = useState(true)
  const [showLimitOverlay, setShowLimitOverlay] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressIntervalRef = useRef(null)
  const [result, setResult] = useState(null)
  const [editedBody, setEditedBody] = useState('')
  const [downloadLoading, setDownloadLoading] = useState(false)

  const stopProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }

  useEffect(() => {
    if (!loading) {
      stopProgress()
      return
    }
    setProgress(0)
    progressIntervalRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? 90 : Math.min(90, p + 0.4)))
    }, 120)
    return stopProgress
  }, [loading])

  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const usage = await getUsage(supabase, user.id)
      if (!cancelled && !(await canCreateCoverLetterForUser(supabase, user.id, usage))) {
        setShowLimitOverlay(true)
      }
      if (!cancelled) setInitLoading(false)
    }
    check()
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch job description')
      }
      setJobDescription(data.text || '')
    } catch (err) {
      setFetchError(err.message || 'Could not fetch job description')
    } finally {
      setFetchLoading(false)
    }
  }

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
      setError(null)
    } else {
      setFile(null)
      setError('Please upload a PDF, Word, or TXT file.')
    }
  }, [])

  const handleGenerate = async () => {
    if (!file || !jobDescription.trim()) {
      setError('Please upload a resume and enter the job description.')
      return
    }

    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const usage = await getUsage(supabase, session.user.id)
      if (!(await canCreateCoverLetterForUser(supabase, session.user.id, usage))) {
        setShowLimitOverlay(true)
        return
      }

      setLoading(true)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('jobDescription', jobDescription.trim())
      formData.append('userId', session.user.id)
      formData.append('responseFormat', 'json')

      const res = await fetch('/api/generate-cover-letter', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      if (res.status === 403) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'limit_reached') {
          setError(null)
          setShowLimitOverlay(true)
        } else {
          setError(data.message || data.error || 'You cannot generate a cover letter right now.')
        }
        setLoading(false)
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      const data = await res.json()
      stopProgress()
      setProgress(100)
      await new Promise((r) => setTimeout(r, 500))

      setResult({
        filename: data.filename || 'cover_letter.pdf',
        bodyText: data.bodyText || '',
        header: data.header || { fullName: '', email: '', phone: '', linkedin: '' },
      })
      setEditedBody(data.bodyText || '')
    } catch (err) {
      setError(err.message || 'Failed to generate cover letter')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!result) return
    const bodyText = editedBody.trim()
    if (!bodyText) {
      setError('Cover letter text is empty.')
      return
    }

    setError(null)
    setDownloadLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }

      const res = await fetch('/api/render-cover-letter-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ header: result.header, bodyText }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Download failed (${res.status})`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const disposition = res.headers.get('Content-Disposition')
      const match = disposition?.match(/filename="?([^";\n]+)"?/)
      const filename = match?.[1] || result.filename || 'cover_letter.pdf'
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Failed to download PDF')
    } finally {
      setDownloadLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!file || !jobDescription.trim()) {
      setError('Please upload a resume and enter the job description.')
      return
    }
    setError(null)
    await handleGenerate()
  }

  const handleBackToInputs = () => {
    setResult(null)
    setEditedBody('')
    setError(null)
  }

  if (initLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full min-w-0 max-w-full overflow-x-hidden">
      <UpgradeLimitModal
        open={showLimitOverlay}
        variant="cover-letter"
        onClose={() => setShowLimitOverlay(false)}
      />
      <CoverLetterGeneratingOverlay active={loading} progress={progress} />
      {result ? (
        <div className="flex min-h-[calc(100vh-4rem)] w-full min-w-0 max-w-full flex-col rounded-xl border border-slate-200/80 bg-slate-100 py-2">
          <h1 className="shrink-0 bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text pb-6 pt-4 text-2xl font-bold text-transparent">
            Your cover letter
          </h1>
          <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-6 pb-8 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-[4%]">
            <div className="flex min-w-0 justify-start lg:justify-start">
              <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/60 lg:max-w-[640px]">
                <div className="max-h-[min(75vh,900px)] overflow-y-auto px-4 py-8 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                  <CoverLetterLivePreview header={result.header} bodyText={editedBody} />
                </div>
              </div>
            </div>
            <div className="min-w-0 flex flex-col gap-5">
              <div className="bg-white rounded-xl shadow-lg shadow-slate-200/60 border border-slate-200/80 p-6">
                <h2 className="text-sm font-semibold text-[#1a1a2e] mb-2">Edit letter body</h2>
                <p className="text-xs text-[#5c5c7a] mb-3">
                  Adjust paragraphs below. Separate paragraphs with a blank line. Salutation and closing stay fixed to match the PDF.
                </p>
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 border border-[#eaeaf2] rounded-xl focus:ring-2 focus:ring-[#6366f1]/25 resize-y text-[#1a1a2e] text-sm leading-relaxed bg-white transition-all min-h-[220px]"
                />
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadLoading || !editedBody.trim()}
                  className="min-h-11 w-full rounded-xl px-6 py-3 font-semibold text-white shadow-md transition-all btn-gradient ds-btn-glow hover:shadow-lg disabled:opacity-40"
                >
                  {downloadLoading ? 'Preparing PDF…' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={loading || !file || !jobDescription.trim()}
                  className="min-h-11 w-full rounded-xl px-6 py-3 font-semibold border-2 border-[#6366f1] text-[#6366f1] bg-white hover:bg-[#f8f8ff] disabled:opacity-40 transition-colors"
                >
                  {loading ? 'Regenerating…' : 'Regenerate with AI'}
                </button>
                <button
                  type="button"
                  onClick={handleBackToInputs}
                  disabled={loading}
                  className="text-sm font-medium text-[#5c5c7a] hover:text-[#6366f1] text-left disabled:opacity-40"
                >
                  ← Back to resume & job description
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent mb-6">Generate Cover Letter</h1>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white rounded-xl border border-[#eaeaf2] p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] to-[#06b6d4]" />
              <h2 className="text-sm font-semibold text-[#5c5c7a] mb-3 mt-1">Upload your resume</h2>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  isDragging ? 'border-[#6366f1] bg-indigo-50/80' : 'border-[#eaeaf2] hover:border-[#6366f1]/50'
                }`}
              >
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="resume-upload"
                  className="cursor-pointer block"
                >
                  {file ? (
                    <p className="text-[#1a1a2e] font-medium">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-[#5c5c7a]">Drag and drop your resume here, or</p>
                      <p className="text-[#6366f1] font-medium mt-2">click to browse</p>
                      <p className="text-xs text-[#5c5c7a] mt-2">PDF, Word, or TXT</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#eaeaf2] p-6 shadow-sm hover:shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a855f7] to-[#06b6d4]" />
              <h2 className="text-sm font-semibold text-[#5c5c7a] mb-3 mt-1">Job description</h2>
              <textarea
                value={jobDescription}
                onChange={(e) => { setJobDescription(e.target.value); setFetchError(null) }}
                placeholder="Paste the job description here..."
                rows={12}
                className="w-full px-4 py-3 border border-[#eaeaf2] rounded-xl focus:ring-2 focus:ring-[#6366f1]/25 resize-y text-[#1a1a2e] bg-white transition-all"
              />
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-[#eaeaf2]" />
                <span className="text-sm text-[#5c5c7a]">OR</span>
                <div className="flex-1 h-px bg-[#eaeaf2]" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => { setJobUrl(e.target.value); setFetchError(null) }}
                  placeholder="Job posting URL"
                  className="min-h-11 w-full flex-1 rounded-xl border border-[#eaeaf2] bg-white px-4 py-3 transition-all focus:ring-2 focus:ring-[#6366f1]/25"
                  disabled={fetchLoading}
                />
                <button type="button" onClick={handleFetchJob} disabled={fetchLoading || !jobUrl.trim()} className="min-h-11 w-full shrink-0 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-all btn-gradient ds-btn-glow hover:shadow-lg disabled:opacity-40 sm:w-auto">
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

              {fetchError && <p className="mt-2 text-sm text-red-600">{fetchError}</p>}
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading || !file || !jobDescription.trim()}
              className="min-h-11 w-full rounded-xl px-8 py-3 font-semibold text-white shadow-md transition-all btn-gradient ds-btn-glow hover:shadow-lg disabled:opacity-40 sm:w-auto"
            >
              {loading ? 'Generating...' : 'Generate Cover Letter'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
