'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getResumeProfileCompletionPercent } from '@/lib/resumeProfileChecklist'
import AtsScoreLoadingOverlay from '@/app/components/AtsScoreLoadingOverlay'

const DAILY_TIP_STORAGE_KEY = 'unemployed-club-daily-career-tip'

function getLocalDateString() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatTipDateDisplay(yyyymmdd) {
  if (!yyyymmdd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return ''
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getSectionType(section) {
  const s = (section || '').toLowerCase()
  if (s.includes('linkedin')) return 'linkedin'
  if (s.includes('portfolio')) return 'portfolio'
  if (s.includes('certification')) return 'certification'
  if (s.includes('project')) return 'project'
  return null
}

export default function DashboardPage() {
  const router = useRouter()
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState(null)
  const [resumeAnalysis, setResumeAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState(null)
  const [modalSection, setModalSection] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resumesCount, setResumesCount] = useState(0)
  const [atsProgress, setAtsProgress] = useState(0)
  const atsProgressIntervalRef = useRef(null)

  const stopAtsProgress = () => {
    if (atsProgressIntervalRef.current) {
      clearInterval(atsProgressIntervalRef.current)
      atsProgressIntervalRef.current = null
    }
  }

  useEffect(() => {
    if (!analysisLoading) {
      stopAtsProgress()
      return
    }
    setAtsProgress(0)
    atsProgressIntervalRef.current = setInterval(() => {
      setAtsProgress((p) => (p >= 90 ? 90 : Math.min(90, p + 0.4)))
    }, 120)
    return stopAtsProgress
  }, [analysisLoading])

  const [linkedinForm, setLinkedinForm] = useState('')
  const [portfolioForm, setPortfolioForm] = useState('')
  const [certForm, setCertForm] = useState({ certificationName: '', issuer: '', year: '' })
  const [projectForm, setProjectForm] = useState({ projectName: '', description: '', url: '' })

  const [dailyTip, setDailyTip] = useState(null)
  const [dailyTipDate, setDailyTipDate] = useState(null)
  const [tipLoading, setTipLoading] = useState(false)
  const [tipError, setTipError] = useState(null)

  useEffect(() => {
    const today = getLocalDateString()
    try {
      const raw = localStorage.getItem(DAILY_TIP_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.tip && typeof parsed.tip === 'string' && parsed?.date === today) {
          setDailyTip(parsed.tip)
          setDailyTipDate(today)
          return
        }
      }
    } catch {
      /* ignore */
    }

    let cancelled = false
    async function loadTipForToday() {
      setTipLoading(true)
      setTipError(null)
      try {
        const res = await fetch('/api/daily-tip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || 'Failed to load tip')
        const tip = data.tip
        const tipDate = data.date || today
        setDailyTip(tip)
        setDailyTipDate(tipDate)
        try {
          localStorage.setItem(DAILY_TIP_STORAGE_KEY, JSON.stringify({ tip, date: tipDate }))
        } catch {
          /* ignore */
        }
      } catch (e) {
        if (!cancelled) setTipError(e.message || 'Could not load tip')
      } finally {
        if (!cancelled) setTipLoading(false)
      }
    }
    void loadTipForToday()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      setPaymentSuccessBanner(true)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function initAuth() {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        if (cancelled) return
        if (error) {
          setProfileError('Unable to verify your session. Please try again or log in.')
          setProfileLoading(false)
          return
        }
        if (!authUser) {
          router.replace('/login')
          setProfileLoading(false)
          return
        }
        setUser(authUser)
      } catch {
        if (!cancelled) {
          setProfileError('Unable to connect. Please check your connection and try again.')
          setProfileLoading(false)
        }
      }
    }
    initAuth()
    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!user) {
      setProfileLoading(false)
      return
    }

    let cancelled = false

    async function fetchResumesCount() {
      try {
        const { data, error } = await supabase
          .from('user_usage')
          .select('resumes_generated')
          .eq('user_id', user.id)
          .maybeSingle()
        if (cancelled) return
        if (error) {
          setResumesCount(0)
          return
        }
        setResumesCount(Number(data?.resumes_generated) || 0)
      } catch {
        if (!cancelled) setResumesCount(0)
      }
    }
    fetchResumesCount()

    async function fetchProfileAndAnalyze() {
      setProfileLoading(true)
      setProfileError(null)

      try {
        const { data, error } = await supabase
          .from('resume_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (cancelled) return
        if (error) {
          if (error.code === 'PGRST116') {
            setProfile(null)
          } else {
            setProfileError('Unable to load your profile. Please try again.')
          }
          setProfileLoading(false)
          return
        }
        setProfile(data)
        setProfileLoading(false)

        const existingScore = data.ats_score
        const hasSavedScore = existingScore != null && !isNaN(existingScore) && existingScore > 0
        const shouldCallApi = !hasSavedScore

        if (!shouldCallApi) {
          return
        }

        setAnalysisLoading(true)
        setAnalysisError(null)
        try {
          const res = await fetch('/api/check-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: data }),
          })
          const analysis = res.ok ? await res.json() : null
          const errData = !res.ok ? await res.json().catch(() => ({})) : null

          if (cancelled) return
          if (res.ok && analysis) {
            const atsScore = analysis.ats_score
            setResumeAnalysis(analysis)
            if (atsScore != null && !isNaN(atsScore)) {
              const scoreToSave = Math.round(atsScore)
              const { error: updateError } = await supabase
                .from('resume_profiles')
                .update({ ats_score: scoreToSave, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)
              if (updateError) {
                console.error('[ATS] Failed to save score:', updateError)
              } else if (!cancelled) {
                setProfile((p) => (p ? { ...p, ats_score: scoreToSave } : p))
              }
            }
            if (!cancelled) {
              stopAtsProgress()
              setAtsProgress(100)
              await new Promise((r) => setTimeout(r, 500))
            }
          } else {
            setAnalysisError(errData?.error || 'Failed to analyze resume')
          }
        } catch (err) {
          console.error('[ATS]', err)
          if (!cancelled) setAnalysisError('Failed to analyze resume')
        } finally {
          if (!cancelled) setAnalysisLoading(false)
        }
      } catch {
        if (!cancelled) {
          setProfileError('Unable to connect. Please check your connection and try again.')
          setProfileLoading(false)
        }
      }
    }

    fetchProfileAndAnalyze()
    return () => {
      cancelled = true
    }
  }, [user])

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  const calculateProfileCompletion = () => getResumeProfileCompletionPercent(profile)

  const openModal = (suggestion) => {
    const type = getSectionType(suggestion?.section)
    if (!type) return
    setModalSection(type)
    setSaveSuccess(false)
    if (type === 'linkedin') setLinkedinForm(profile?.linkedin_url || '')
    if (type === 'portfolio') setPortfolioForm(profile?.portfolio_url || '')
    if (type === 'certification') setCertForm({ certificationName: '', issuer: '', year: '' })
    if (type === 'project') setProjectForm({ projectName: '', description: '', url: '' })
  }

  const closeModal = () => {
    setModalSection(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!user || !profile) return
    setSaving(true)
    setSaveSuccess(false)

    try {
      let payload = { user_id: user.id, updated_at: new Date().toISOString() }

      if (modalSection === 'linkedin') {
        payload.linkedin_url = linkedinForm.trim() || null
      } else if (modalSection === 'portfolio') {
        payload.portfolio_url = portfolioForm.trim() || null
      } else if (modalSection === 'certification') {
        const existing = Array.isArray(profile.certifications) ? profile.certifications : []
        const newCert = {
          certificationName: certForm.certificationName.trim(),
          issuer: certForm.issuer.trim(),
          year: certForm.year.trim(),
        }
        if (newCert.certificationName || newCert.issuer || newCert.year) {
          payload.certifications = [...existing, newCert]
        }
      } else if (modalSection === 'project') {
        const existing = Array.isArray(profile.projects) ? profile.projects : []
        const newProject = {
          projectName: projectForm.projectName.trim(),
          description: projectForm.description.trim(),
          url: projectForm.url.trim(),
        }
        if (newProject.projectName || newProject.description || newProject.url) {
          payload.projects = [...existing, newProject]
        }
      }

      const { data, error } = await supabase
        .from('resume_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error
      setProfile(data)
      setProfileError(null)
      setSaveSuccess(true)
      setTimeout(() => closeModal(), 1500)
    } catch (err) {
      console.error(err)
      setProfileError('Unable to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const renderModalForm = () => {
    if (modalSection === 'linkedin') {
      return (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5c5c7a] mb-1">LinkedIn URL</label>
            <input
              type="url"
              value={linkedinForm}
              onChange={(e) => setLinkedinForm(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg bg-white text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-[#5c5c7a] rounded-xl border border-[#eaeaf2] bg-white hover:bg-[#f8f8ff] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 btn-gradient ds-btn-glow disabled:opacity-50 text-white rounded-xl transition-all">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )
    }
    if (modalSection === 'portfolio') {
      return (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Portfolio URL</label>
            <input
              type="url"
              value={portfolioForm}
              onChange={(e) => setPortfolioForm(e.target.value)}
              placeholder="https://yourportfolio.com"
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg bg-white text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-[#5c5c7a] rounded-xl border border-[#eaeaf2] bg-white hover:bg-[#f8f8ff] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 btn-gradient ds-btn-glow disabled:opacity-50 text-white rounded-xl transition-all">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )
    }
    if (modalSection === 'certification') {
      return (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Certification Name</label>
            <input
              type="text"
              value={certForm.certificationName}
              onChange={(e) => setCertForm((p) => ({ ...p, certificationName: e.target.value }))}
              placeholder="e.g. AWS Certified Solutions Architect"
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg bg-white text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Issuer</label>
            <input
              type="text"
              value={certForm.issuer}
              onChange={(e) => setCertForm((p) => ({ ...p, issuer: e.target.value }))}
              placeholder="e.g. Amazon Web Services"
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg bg-white text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Year</label>
            <input
              type="text"
              value={certForm.year}
              onChange={(e) => setCertForm((p) => ({ ...p, year: e.target.value }))}
              placeholder="e.g. 2024"
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg bg-white text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-[#5c5c7a] rounded-xl border border-[#eaeaf2] bg-white hover:bg-[#f8f8ff] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 btn-gradient ds-btn-glow disabled:opacity-50 text-white rounded-xl transition-all">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )
    }
    if (modalSection === 'project') {
      return (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Project Name</label>
            <input
              type="text"
              value={projectForm.projectName}
              onChange={(e) => setProjectForm((p) => ({ ...p, projectName: e.target.value }))}
              placeholder="e.g. E-commerce Dashboard"
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg bg-white text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5c5c7a] mb-1">Description</label>
            <textarea
              value={projectForm.description}
              onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description..."
              rows={3}
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg bg-white text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5c5c7a] mb-1">URL</label>
            <input
              type="url"
              value={projectForm.url}
              onChange={(e) => setProjectForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-[#eaeaf2] rounded-lg bg-white text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1] focus:border-[#6366f1]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 text-[#5c5c7a] rounded-xl border border-[#eaeaf2] bg-white hover:bg-[#f8f8ff] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 btn-gradient ds-btn-glow disabled:opacity-50 text-white rounded-xl transition-all">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )
    }
    return null
  }

  const atsScore = Math.max(0, Math.min(100, Number(profile?.ats_score ?? resumeAnalysis?.ats_score ?? 0) || 0))
  const completionScore = calculateProfileCompletion()

  return (
    <div className="relative mx-auto max-w-7xl min-w-0">
      {paymentSuccessBanner && (
        <div
          className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 shadow-sm"
          role="status"
        >
          <p className="text-sm font-medium">
            Welcome to Pro! Your account has been upgraded.
          </p>
          <button
            type="button"
            onClick={() => setPaymentSuccessBanner(false)}
            className="shrink-0 font-semibold text-emerald-800 hover:text-emerald-950"
          >
            Dismiss
          </button>
        </div>
      )}
      <AtsScoreLoadingOverlay
        active={analysisLoading}
        progress={atsProgress}
        headline="Your ATS score is being calculated..."
      />
      {(profileError || analysisError) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center justify-between gap-4">
          <p className="text-sm font-medium">{profileError || analysisError}</p>
          <button
            type="button"
            onClick={() => { setProfileError(null); setAnalysisError(null) }}
            className="text-red-600 hover:text-red-800 font-medium shrink-0 transition-colors"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
      {modalSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1a1a2e]/25 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
          <div className="relative bg-white rounded-2xl border border-[#eaeaf2] shadow-[0_20px_60px_-15px_rgba(99,102,241,0.2)] max-w-md w-full p-6 ds-card-interactive" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#1a1a2e] mb-4">
              Add {modalSection.charAt(0).toUpperCase() + modalSection.slice(1)}
            </h3>
            {saveSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-sm">
                Saved successfully!
              </div>
            )}
            {renderModalForm()}
          </div>
        </div>
      )}

      <div className="relative mb-10 flex flex-col items-center justify-between gap-6 overflow-hidden rounded-2xl border border-[#eaeaf2] bg-gradient-to-br from-[#6366f1] to-[#06b6d4] p-6 text-center shadow-[0_0_48px_rgba(99,102,241,0.25)] shadow-lg shadow-slate-200/50 sm:p-8 md:flex-row md:items-center md:gap-8 md:text-left">
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative z-10 min-w-0 w-full md:w-auto">
          <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Welcome back, {displayName}!
          </h1>
          <p className="text-base text-white sm:text-lg">Let&apos;s get your resume ready for your next big opportunity.</p>
        </div>
        <div className="relative z-10 flex w-full shrink-0 items-center justify-center gap-4 sm:gap-5 md:w-auto md:justify-end">
          <div className="relative h-20 w-20">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${atsScore * 2.83} 283`}
                style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.45))' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-white">{atsScore}</span>
            </div>
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-wider text-white">ATS Score</p>
            <p className="font-medium text-white/90">Current Resume Match</p>
          </div>
        </div>
      </div>

      <section
        className="mb-10 rounded-2xl border border-[#eaeaf2] bg-white p-6 sm:p-8 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.12)] relative overflow-hidden"
        aria-labelledby="daily-career-tip-heading"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
          <div className="flex items-start gap-3 shrink-0">
            <span className="text-3xl leading-none" aria-hidden>
              💡
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="daily-career-tip-heading"
              className="text-xl font-bold mb-1 bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent"
            >
              Daily Career Tip
            </h2>
            <p className="text-xs font-medium text-[#5c5c7a] mb-4">
              {formatTipDateDisplay(dailyTipDate || getLocalDateString())}
            </p>
            {tipError && (
              <p className="text-sm text-red-600 mb-3">{tipError}</p>
            )}
            {tipLoading && !dailyTip && (
              <div className="space-y-2 animate-pulse" aria-busy="true">
                <div className="h-4 bg-[#f0f0f7] rounded-lg w-full max-w-2xl" />
                <div className="h-4 bg-[#f0f0f7] rounded-lg w-full max-w-xl" />
                <div className="h-4 bg-[#f0f0f7] rounded-lg w-full max-w-lg" />
              </div>
            )}
            {dailyTip && (
              <p className="text-[#1a1a2e] text-sm sm:text-base leading-relaxed">{dailyTip}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link
          href="/dashboard/new-resume"
          className="group relative min-h-[11rem] overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#06b6d4] p-6 text-white shadow-[0_8px_32px_-8px_rgba(99,102,241,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-white/45 hover:shadow-[0_12px_48px_-8px_rgba(99,102,241,0.45)] sm:p-8"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:scale-110 transition-transform">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold sm:text-2xl">Generate AI Resume</h2>
            <p className="text-white/90 font-medium">Paste a job description and get a tailored resume</p>
          </div>
        </Link>

        <Link
          href="/dashboard/upload-resume"
          className="group relative min-h-[11rem] overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-br from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] p-6 text-white shadow-[0_8px_32px_-8px_rgba(99,102,241,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-white/45 hover:shadow-[0_12px_48px_-8px_rgba(6,182,212,0.35)] sm:p-8"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:scale-110 transition-transform">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold sm:text-2xl">Upload Resume</h2>
            <p className="text-white/90 font-medium">Import your existing resume and optimize it</p>
          </div>
        </Link>

        <Link
          href="/dashboard/ats-checker"
          className="group relative min-h-[11rem] overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-br from-[#06b6d4] via-[#6366f1] to-[#8b5cf6] p-6 text-white shadow-[0_8px_32px_-8px_rgba(6,182,212,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-white/45 hover:shadow-[0_12px_48px_-8px_rgba(99,102,241,0.4)] sm:p-8"
        >
          <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:scale-110 transition-transform">
            <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold sm:text-2xl">Check ATS Score</h2>
            <p className="text-white/90 font-medium">See how your resume matches any job</p>
          </div>
        </Link>
      </div>

      <div className="mb-10 grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="order-2 lg:col-span-8">
          <div className="ds-card ds-card-interactive h-full min-w-0 bg-white p-4 sm:p-8">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-6 bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">
              Improve Your Profile
            </h2>

            {profile && resumeAnalysis?.suggestions?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {resumeAnalysis.suggestions.map((s, i) => {
                  const sectionType = getSectionType(s.section)
                  return (
                    <div key={i} className="group p-5 bg-[#f8f8ff] hover:bg-white rounded-xl border border-[#eaeaf2] hover:border-[#6366f1]/40 transition-all flex flex-col h-full hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]" />
                        <p className="text-xs font-bold text-[#6366f1] uppercase tracking-wide">
                          Missing {s.section || 'Section'}
                        </p>
                      </div>
                      <p className="text-[#1a1a2e] font-medium mb-4 flex-grow">{s.question}</p>

                      {sectionType ? (
                        <button
                          type="button"
                          onClick={() => openModal(s)}
                          className="w-full py-2.5 bg-white border border-[#eaeaf2] text-[#5c5c7a] hover:text-white hover:border-[#6366f1] font-medium rounded-lg transition-all"
                        >
                          + Add {s.section}
                        </button>
                      ) : (
                        <Link
                          href="/dashboard/build-resume"
                          className="w-full text-center py-2.5 bg-white border border-[#eaeaf2] text-[#5c5c7a] hover:text-white hover:border-[#6366f1] font-medium rounded-lg transition-all inline-block"
                        >
                          + Add {s.section}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : profile ? (
              <div className="text-center py-10 rounded-xl border border-emerald-100 bg-emerald-50">
                <div className="w-16 h-16 bg-cyan-50 text-cyan-700 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-cyan-100">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">Profile Looking Good!</h3>
                <p className="text-[#5c5c7a]">Your base profile is highly optimized. Time to generate a resume.</p>
              </div>
            ) : profileError && !profile ? (
              <div className="text-center py-10 rounded-xl border border-violet-100 bg-violet-50/50">
                <p className="text-[#1a1a2e] font-medium">We couldn&apos;t load your profile.</p>
                <p className="text-[#5c5c7a] text-sm mt-1">Check the message above and try again.</p>
                <Link href="/dashboard/build-resume" className="inline-block mt-4 px-4 py-2 btn-gradient ds-btn-glow text-white font-semibold rounded-xl transition-all">
                  Build Your Resume
                </Link>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#5c5c7a]">{profileLoading || analysisLoading ? 'Loading...' : 'Set up your profile to get started.'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="order-1 lg:col-span-4">
          <div className="ds-card h-full min-w-0 bg-white p-4 sm:p-8">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-6">Quick Stats</h2>
            <div className="grid grid-cols-1 gap-3 min-w-0 sm:grid-cols-2 lg:grid-cols-1 lg:gap-4">
              <div className="p-4 bg-[#f8f8ff] rounded-xl border border-[#eaeaf2] flex items-center justify-between hover:border-[#6366f1]/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#6366f1]/20 text-[#a855f7] flex items-center justify-center ring-1 ring-[#6366f1]/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#5c5c7a]">Resumes Generated</p>
                    <p className="text-xl font-bold text-[#1a1a2e]">{resumesCount}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#f8f8ff] rounded-xl border border-[#eaeaf2] flex items-center justify-between hover:border-[#06b6d4]/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center ring-1 ring-[#06b6d4]/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#5c5c7a]">Avg ATS Score</p>
                    <p className="text-xl font-bold text-[#1a1a2e]">{atsScore}%</p>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard/profile"
                className="group p-4 bg-[#f8f8ff] rounded-xl border border-[#eaeaf2] flex items-center justify-between hover:border-[#a855f7]/40 transition-colors ds-card-interactive focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/35 focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-[#a855f7]/20 text-[#a855f7] flex items-center justify-center ring-1 ring-[#a855f7]/30 group-hover:ring-[#a855f7]/50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#5c5c7a]">Profile Completion</p>
                    <p className="text-xl font-bold text-[#1a1a2e]">{completionScore}%</p>
                    <p className="text-xs text-[#6366f1] font-medium mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">View checklist →</p>
                  </div>
                </div>
                <svg className="w-5 h-5 shrink-0 text-[#a855f7]/60 group-hover:text-[#7c3aed] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
