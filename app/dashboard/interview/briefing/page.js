'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { isPro } from '@/lib/subscription'
import InterviewPremiumLockOverlay from '@/app/components/InterviewPremiumLockOverlay'

export default function InterviewBriefingPage() {
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
        setError('Session not found.')
        setLoading(false)
        return
      }
      setSession(data)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [sessionId, router])

  const prepGuide = session?.prep_guide || {}
  const topTopics = prepGuide.topTopics || []
  const keySkills = prepGuide.keySkills || []
  const questionsToAsk = prepGuide.questionsToAsk || []

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-[#5c5c7a]">Loading your prep guide...</p>
      </div>
    )
  }

  if (planLocked) {
    return <InterviewPremiumLockOverlay />
  }

  if (error || !session) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Session not found.'}</p>
        <Link href="/dashboard/interview" className="text-[#6366f1] font-medium hover:underline">Start over</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-[#1a1a2e] mb-2">
        Your <span className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">Interview Prep</span> Guide
      </h1>
      <p className="text-[#5c5c7a] mb-8">Review these before starting. You&apos;ve got this.</p>

      <div className="space-y-6 mb-10">
        <div className="ds-card ds-card-interactive p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center text-sm font-bold">1</span>
            Top 5 topics to prepare
          </h2>
          <ul className="space-y-2">
            {topTopics.length ? topTopics.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-[#1a1a2e]">
                <span className="text-[#6366f1] font-medium">•</span>
                <span>{t}</span>
              </li>
            )) : <li className="text-[#5c5c7a]">Review the job description and your resume.</li>}
          </ul>
        </div>

        <div className="ds-card ds-card-interactive p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4]" />
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#a855f7]/10 text-[#a855f7] flex items-center justify-center text-sm font-bold">2</span>
            Key skills to highlight from your resume
          </h2>
          <ul className="space-y-2">
            {keySkills.length ? keySkills.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#6366f1]/10 text-[#6366f1] text-sm">{s}</span>
              </li>
            )) : <li className="text-[#5c5c7a]">Your most relevant skills from the job description.</li>}
          </ul>
        </div>

        <div className="ds-card ds-card-interactive p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#06b6d4]/10 text-[#06b6d4] flex items-center justify-center text-sm font-bold">3</span>
            3 questions to ask the interviewer
          </h2>
          <ul className="space-y-2">
            {questionsToAsk.length ? questionsToAsk.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-[#1a1a2e] pl-1">
                <span className="text-[#5c5c7a] font-medium">{i + 1}.</span>
                <span>{q}</span>
              </li>
            )) : <li className="text-[#5c5c7a]">Prepare thoughtful questions about the role and team.</li>}
          </ul>
        </div>
      </div>

      <Link
        href={`/dashboard/interview/session?id=${sessionId}`}
        className="block w-full py-4 px-6 btn-gradient ds-btn-glow text-white text-lg font-semibold rounded-xl text-center transition-all"
      >
        I am Ready — Start Interview
      </Link>
    </div>
  )
}
