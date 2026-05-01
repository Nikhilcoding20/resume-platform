'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isPro } from '@/lib/subscription'
import InterviewPremiumLockOverlay from '@/app/components/InterviewPremiumLockOverlay'
import SavedResumePreviewPanel from '@/app/components/SavedResumePreviewPanel'

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

function isAcceptedFile(file) {
  if (!file) return false
  const type = file?.type?.toLowerCase()
  const name = (file?.name || '').toLowerCase()
  return ACCEPTED_TYPES.includes(type) || name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt')
}

export default function InterviewSetupPage() {
  const router = useRouter()
  const [resumeSource, setResumeSource] = useState('saved') // 'saved' | 'upload'
  const [profile, setProfile] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [interviewType, setInterviewType] = useState('Mixed')
  const [difficulty, setDifficulty] = useState('Mid Level')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [initLoading, setInitLoading] = useState(true)
  const [planLocked, setPlanLocked] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      if (!cancelled) setAuthUser(user)
      const pro = await isPro(supabase, user.id)
      if (cancelled) return
      if (!pro) {
        setPlanLocked(true)
        setInitLoading(false)
        return
      }
      const { data } = await supabase.from('resume_profiles').select('*').eq('user_id', user.id).single()
      if (!cancelled) {
        setProfile(data)
        setInitLoading(false)
      }
    }
    load()
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

  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (isAcceptedFile(f)) { setFile(f); setError(null) } else { setFile(null); setError('Please upload PDF, Word, or TXT.') }
  }, [])
  const handleFileSelect = useCallback((e) => {
    const f = e.target.files[0]
    if (isAcceptedFile(f)) { setFile(f); setError(null) } else { setFile(null); setError('Please upload PDF, Word, or TXT.') }
  }, [])

  const handlePrepare = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter the job description.')
      return
    }
    if (resumeSource === 'saved' && !profile) {
      setError('No saved resume found. Please upload a resume or add one from Build Resume.')
      return
    }
    if (resumeSource === 'upload' && !file) {
      setError('Please upload your resume.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        setLoading(false)
        return
      }

      let res
      if (resumeSource === 'saved') {
        res = await fetch('/api/interview-prep', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            profile,
            jobDescription: jobDescription.trim(),
            interviewType,
            difficulty,
          }),
        })
      } else {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('jobDescription', jobDescription.trim())
        formData.append('interviewType', interviewType)
        formData.append('difficulty', difficulty)
        res = await fetch('/api/interview-prep', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to prepare interview')

      router.push(`/dashboard/interview/briefing?id=${data.sessionId}`)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  if (planLocked) {
    return <InterviewPremiumLockOverlay />
  }

  return (
    <div className="relative min-w-0">
      <h1 className="text-2xl font-extrabold text-[#1a1a2e] mb-6">
        <span className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">AI</span> Interview Coach
      </h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className="ds-card ds-card-interactive flex h-full min-h-0 flex-col p-6 transition-shadow hover:shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] to-[#06b6d4]" />
          <h2 className="text-sm font-semibold text-[#5c5c7a] mb-3 mt-1">Resume</h2>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="resume"
                checked={resumeSource === 'saved'}
                onChange={() => { setResumeSource('saved'); setFile(null); setError(null) }}
                className="text-[#6366f1]"
              />
              <span className="text-[#1a1a2e]">Use saved resume</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="resume"
                checked={resumeSource === 'upload'}
                onChange={() => setResumeSource('upload')}
                className="text-[#6366f1]"
              />
              <span className="text-[#1a1a2e]">Upload new resume</span>
            </label>
          </div>
          {resumeSource === 'saved' &&
            (profile ? (
              <div className="shrink-0">
                <SavedResumePreviewPanel profile={profile} authUser={authUser} />
              </div>
            ) : (
              <p className="text-sm text-[#5c5c7a]">No saved resume. Upload one or add from Build Resume.</p>
            ))}
          {resumeSource === 'upload' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging ? 'border-[#6366f1] bg-indigo-50/80' : 'border-[#eaeaf2] hover:border-[#6366f1]/50'
              }`}
            >
              <input type="file" id="resume" accept=".pdf,.doc,.docx,.txt" onChange={handleFileSelect} className="hidden" />
              <label htmlFor="resume" className="cursor-pointer block">
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
          )}
        </div>

        <div className="ds-card ds-card-interactive flex h-full min-h-0 flex-col p-6 transition-shadow hover:shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a855f7] to-[#06b6d4]" />
          <h2 className="text-sm font-semibold text-[#5c5c7a] mb-3 mt-1">Job description</h2>
          <textarea
            value={jobDescription}
            onChange={(e) => { setJobDescription(e.target.value); setFetchError(null) }}
            placeholder="Paste the job description here..."
            rows={8}
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
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#eaeaf2] pt-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[#5c5c7a] mb-2">Interview type</label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="w-full px-4 py-3 border border-[#eaeaf2] rounded-xl focus:ring-2 focus:ring-[#6366f1]/25 text-[#1a1a2e] bg-white"
              >
                <option value="Behavioral">Behavioral</option>
                <option value="Technical">Technical</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#5c5c7a] mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-3 border border-[#eaeaf2] rounded-xl focus:ring-2 focus:ring-[#6366f1]/25 text-[#1a1a2e] bg-white"
              >
                <option value="Entry Level">Entry Level</option>
                <option value="Mid Level">Mid Level</option>
                <option value="Senior Level">Senior Level</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6">
        <button
          type="button"
          onClick={handlePrepare}
          disabled={loading || !jobDescription.trim() || (resumeSource === 'saved' && !profile) || (resumeSource === 'upload' && !file)}
          className="min-h-11 w-full rounded-xl px-8 py-3 font-semibold text-white shadow-md transition-all btn-gradient ds-btn-glow hover:shadow-lg disabled:opacity-40 sm:w-auto"
        >
          {loading ? 'Preparing...' : 'Prepare My Interview'}
        </button>
      </div>
    </div>
  )
}
