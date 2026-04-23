'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUsage, canCreateResumeForUser } from '@/lib/checkUsage'
import UpgradeLimitModal from '@/app/components/UpgradeLimitModal'

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

export default function UploadResumePage() {
  const router = useRouter()
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [initLoading, setInitLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const usage = await getUsage(supabase, user.id)
      if (!cancelled && !(await canCreateResumeForUser(supabase, user.id, usage))) {
        setShowUpgradeModal(true)
      }
      if (!cancelled) setInitLoading(false)
    }
    check()
    return () => { cancelled = true }
  }, [router])

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

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      console.log('[UploadResume] Starting upload, file:', file?.name, 'size:', file?.size)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('[UploadResume] No session - user not logged in')
        setError('Please log in to upload a resume')
        setLoading(false)
        router.replace('/login')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('accessToken', session.access_token)

      console.log('[UploadResume] Sending request to /api/extract-resume')
      let res
      try {
        res = await fetch('/api/extract-resume', {
          method: 'POST',
          body: formData,
        })
      } catch (fetchErr) {
        console.error('[UploadResume] Fetch failed (network error):', fetchErr)
        throw new Error(
          fetchErr.message?.includes('Failed to fetch') || fetchErr.message?.includes('Load failed')
            ? 'Network error. Check your connection and ensure the server is running.'
            : fetchErr.message || 'Request failed'
        )
      }

      console.log('[UploadResume] Response status:', res.status, res.statusText)

      let data
      const responseText = await res.text()
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch (parseErr) {
        console.error('[UploadResume] Failed to parse response as JSON:', parseErr)
        console.error('[UploadResume] Response body:', responseText?.slice(0, 500) || '(empty)')
        throw new Error(
          res.ok
            ? 'Invalid response from server'
            : `Server error (${res.status}). The server may have crashed or returned an invalid response.`
        )
      }

      if (res.status === 403) {
        setShowUpgradeModal(true)
        throw new Error(data.error || 'Usage limit reached')
      }
      if (!res.ok) {
        console.error('[UploadResume] API error:', data)
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      console.log('[UploadResume] Success')
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      console.error('[UploadResume] Error:', err)
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setError(null)
    setSuccess(false)
    setLoading(false)
  }

  if (initLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto">
        <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  if (showUpgradeModal) {
    return (
      <>
        <div className="max-w-2xl mx-auto opacity-50 pointer-events-none">
          <h2 className="text-xl font-bold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent mb-6">Upload Resume</h2>
        </div>
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
      <h2 className="text-xl font-bold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent mb-6">Upload Resume</h2>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          Resume parsed and saved successfully! Redirecting to dashboard...
        </div>
      )}

      {!success && (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !loading && document.getElementById('file-input').click()}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all bg-white shadow-sm
              ${isDragging ? 'border-[#6366f1] bg-indigo-50/50 shadow-md' : 'border-[#eaeaf2] hover:border-[#6366f1]/40'}
              ${loading ? 'pointer-events-none opacity-70' : ''}
            `}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileSelect}
              className="hidden"
            />
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#1a1a2e] font-medium">Analyzing your resume...</p>
              </div>
            ) : file ? (
              <div className="space-y-2">
                <p className="text-[#1a1a2e] font-medium">{file.name}</p>
                <p className="text-sm text-[#5c5c7a]">
                  {(file.size / 1024).toFixed(1)} KB • Click or drop another file to replace
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[#5c5c7a] font-medium">Click or drag and drop your resume here</p>
                <p className="text-sm text-[#5c5c7a]">PDF, Word, or TXT files accepted</p>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 text-red-600 text-sm">{error}</p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || loading}
              className="px-6 py-3 btn-gradient ds-btn-glow disabled:opacity-40 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Extract & Save
            </button>
            {file && !loading && (
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 border border-[#eaeaf2] text-[#5c5c7a] hover:bg-[#f8f8ff] font-medium rounded-xl transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
