'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { isPro } from '@/lib/subscription'
import InterviewPremiumLockOverlay from '@/app/components/InterviewPremiumLockOverlay'

export default function InterviewResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('id')

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [planLocked, setPlanLocked] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const pro = await isPro(supabase, user.id)
      if (cancelled) return
      if (!pro) {
        setPlanLocked(true)
        setLoading(false)
        return
      }
      if (!sessionId) {
        router.replace('/dashboard/interview')
        return
      }
      const { data, error: err } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (cancelled) return
      if (err || !data) {
        console.error('[interview-results] Supabase fetch error:', {
          message: err?.message,
          code: err?.code,
          details: err?.details,
        })
        setError('Results not found.')
        setLoading(false)
        return
      }
      const answersFromStorage = typeof window !== 'undefined'
        ? (() => {
            try {
              const raw = localStorage.getItem(`interview_answers_${sessionId}`)
              return raw ? JSON.parse(raw) : null
            } catch {
              return null
            }
          })()
        : null
      const answersToUse = data.answers?.length ? data.answers : (answersFromStorage || data.answers || [])
      if (!data.answers?.length && answersFromStorage?.length) {
        console.log('[interview-results] Using answers from localStorage (Supabase answers were empty):', answersFromStorage)
      }
      console.log('[interview-results] Answers received — these were sent to scoring API by session page:', {
        fromSupabase: data.answers,
        fromLocalStorage: answersFromStorage,
        answersToUse,
        count: answersToUse?.length,
      })
      setSession({ ...data, answers: answersToUse })
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [sessionId, router])

  const handleShare = async () => {
    if (!session?.scores) return
    const text = `My AI Interview Coach score: ${session.scores.overallScore}/100`
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Interview Results',
          text,
          url: window.location.href,
        })
      } catch (e) {
        if (e.name !== 'AbortError') {
          await navigator.clipboard.writeText(text + '\n' + window.location.href)
        }
      }
    } else {
      await navigator.clipboard.writeText(text + '\n' + window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-[#5c5c7a]">Loading results...</p>
      </div>
    )
  }

  if (planLocked) {
    return <InterviewPremiumLockOverlay />
  }

  if (error || !session) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Results not found.'}</p>
        <Link href="/dashboard/interview" className="text-[#6366f1] font-medium hover:underline">Start over</Link>
      </div>
    )
  }

  const scores = session.scores || {}
  const breakdown = scores.breakdown || {}
  let overall = Math.round(Number(scores.overallScore) || 0)
  if (overall === 0 && breakdown) {
    const c = Math.round(Number(breakdown.communication) || 0)
    const r = Math.round(Number(breakdown.relevance) || 0)
    const cf = Math.round(Number(breakdown.confidence) || 0)
    const t = Math.round(Number(breakdown.technicalKnowledge) || 0)
    if (c + r + cf + t > 0) overall = Math.round((c + r + cf + t) / 4)
  }
  const strengths = scores.strengths || []
  const weaknesses = scores.weaknesses || []
  const nextSteps = scores.nextSteps || []

  const scoreColor = (s) => {
    if (s >= 70) return 'text-green-600'
    if (s >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const strokeColor = (s) => {
    if (s >= 70) return '#22c55e'
    if (s >= 50) return '#eab308'
    return '#ef4444'
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-[#1a1a2e] mb-8">
        Interview <span className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">Results</span>
      </h1>

      <div className="flex flex-col items-center mb-10">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#eaeaf2" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={strokeColor(overall)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(overall / 100) * 283} 283`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-3xl font-bold ${scoreColor(overall)}`}>{overall}</span>
            <span className="text-lg text-[#5c5c7a] ml-0.5">/100</span>
          </div>
        </div>
        <p className="text-[#5c5c7a] mt-2">Overall Score</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {['communication', 'relevance', 'confidence', 'technicalKnowledge'].map((key) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
          const raw = Math.round(Number(breakdown[key]) || 0)
          const val = raw > 0 ? raw : overall
          return (
            <div key={key} className="ds-card ds-card-interactive p-4">
              <p className="text-sm text-[#5c5c7a] mb-1">{label}</p>
              <p className={`text-xl font-bold ${scoreColor(val)}`}>{val}/100</p>
            </div>
          )
        })}
      </div>

      {strengths.length > 0 && (
        <div className="ds-card ds-card-interactive p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-700 mb-4">Strengths</h2>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-green-800">
                <span className="text-green-500">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div className="ds-card ds-card-interactive p-6 mb-6">
          <h2 className="text-lg font-semibold text-orange-600 mb-4">Areas to Improve</h2>
          <ul className="space-y-2">
            {weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-orange-800">
                <span className="text-orange-500">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextSteps.length > 0 && (
        <div className="ds-card ds-card-interactive p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Next Steps</h2>
          <ol className="space-y-2 list-decimal list-inside text-[#1a1a2e]">
            {nextSteps.map((step, i) => (
              <li key={i}>{step.replace(/^\d+\.\s*/, '')}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          href={`/dashboard/interview/session?id=${sessionId}&retry=1`}
          className="flex-1 py-3 px-6 btn-gradient ds-btn-glow text-white font-semibold rounded-xl text-center transition-all"
        >
          Retry Interview
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 py-3 px-6 border-2 border-[#6366f1] text-[#6366f1] font-semibold rounded-xl bg-white hover:bg-[#f8f8ff] ds-card-interactive transition-all"
        >
          Share Results
        </button>
      </div>
    </div>
  )
}
