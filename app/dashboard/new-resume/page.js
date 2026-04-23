'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUsage, canCreateResumeForUser } from '@/lib/checkUsage'
import UpgradeLimitModal from '@/app/components/UpgradeLimitModal'

const STORAGE_KEY = 'job-description'

/**
 * Strip characters that can cause JSON parsing errors or are invalid in stored text.
 * Keeps newlines, tabs, and carriage returns.
 */
function sanitizeJobDescription(str) {
  if (str == null || typeof str !== 'string') return ''
  return str
    .replace(/\0/g, '') // null byte
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars except \t \n \r
    .replace(/\u2028/g, '') // line separator (can break JSON in some parsers)
    .replace(/\u2029/g, '') // paragraph separator
    .trim()
}

export default function NewResumePage() {
  const router = useRouter()
  const [jobDescription, setJobDescription] = useState('')
  const [initLoading, setInitLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [jobUrl, setJobUrl] = useState('')
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    let c = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const usage = await getUsage(supabase, user.id)
      if (!c && !(await canCreateResumeForUser(supabase, user.id, usage))) setShowUpgradeModal(true)
      if (!c) setInitLoading(false)
    })()
    return () => { c = true }
  }, [router])

  const handleFetchJob = async () => {
    if (!jobUrl.trim()) return
    setFetchLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/fetch-job', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: jobUrl.trim() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      try {
        setJobDescription(sanitizeJobDescription(data.text || ''))
      } catch (e) {
        console.error('Error processing fetched job description:', e)
        setFetchError('Could not process job description')
      }
    } catch (e) {
      setFetchError(e.message || 'Could not fetch')
    } finally {
      setFetchLoading(false)
    }
  }

  if (initLoading) return <div className="flex flex-col items-center justify-center min-h-[50vh]"><div className="w-10 h-10 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin" /><p className="mt-4 text-[#5c5c7a]">Loading…</p></div>
  if (showUpgradeModal) {
    return (
      <>
        <div className="opacity-50 pointer-events-none min-h-[40vh]" />
        <UpgradeLimitModal
          open={showUpgradeModal}
          variant="resume"
          onClose={() => setShowUpgradeModal(false)}
        />
      </>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent mb-6 text-center">What job are you applying for?</h1>
      <textarea
        value={jobDescription}
        onChange={(e) => { setJobDescription(e.target.value); setFetchError(null) }}
        placeholder="Paste the job description here"
        rows={12}
        className="w-full px-4 py-3 rounded-xl border border-[#eaeaf2] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] resize-y text-[#1a1a2e] bg-white shadow-sm"
      />
      <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-[#eaeaf2]" /><span className="text-sm text-[#5c5c7a]">OR</span><div className="flex-1 h-px bg-[#eaeaf2]" /></div>
      <div className="flex gap-2">
        <input type="url" value={jobUrl} onChange={(e) => { setJobUrl(e.target.value); setFetchError(null) }} placeholder="Job posting URL" disabled={fetchLoading}
          className="flex-1 px-4 py-3 rounded-xl border border-[#eaeaf2] focus:ring-2 focus:ring-[#6366f1]/25 bg-white" />
        <button type="button" onClick={handleFetchJob} disabled={fetchLoading || !jobUrl.trim()} className="px-6 py-3 btn-gradient-teal ds-btn-glow rounded-xl text-white font-semibold text-sm disabled:opacity-40 shadow-md hover:shadow-lg transition-all shrink-0">
          {fetchLoading ? '…' : 'Fetch'}
        </button>
      </div>
      {fetchError && <p className="text-red-600 text-sm mt-2">{fetchError}</p>}
      <button
        type="button"
        onClick={() => {
          const sanitized = sanitizeJobDescription(jobDescription)
          if (!sanitized) return
          try {
            const encoded = encodeURIComponent(sanitized)
            localStorage.setItem(STORAGE_KEY, encoded)
            router.push('/dashboard/choose-template')
          } catch (e) {
            console.error('Error saving job description to localStorage:', e)
          }
        }}
        disabled={!sanitizeJobDescription(jobDescription)}
        className="mt-6 w-full py-3 btn-gradient ds-btn-glow rounded-xl font-semibold text-white disabled:opacity-40 shadow-md hover:shadow-lg transition-all"
      >
        Continue
      </button>
    </div>
  )
}
