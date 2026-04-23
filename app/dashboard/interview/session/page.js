'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isPro } from '@/lib/subscription'
import InterviewPremiumLockOverlay from '@/app/components/InterviewPremiumLockOverlay'

export default function InterviewSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('id')
  const isRetry = searchParams.get('retry') === '1'

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [planLocked, setPlanLocked] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [hasSpoken, setHasSpoken] = useState(false)
  const [scoring, setScoring] = useState(false)

  const recognitionRef = useRef(null)
  const answersRef = useRef([])

  const questions = session?.questions || []
  const totalQuestions = questions.length
  const isLastQuestion = currentIndex >= totalQuestions - 1
  const currentQuestion = questions[currentIndex]

  const speakQuestion = useCallback(() => {
    if (!currentQuestion || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(currentQuestion)
    utterance.rate = 0.9
    utterance.pitch = 1
    const voices = window.speechSynthesis.getVoices()
    const en = voices.find((v) => v.lang.startsWith('en'))
    if (en) utterance.voice = en
    window.speechSynthesis.speak(utterance)
    setHasSpoken(true)
  }, [currentQuestion])

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
      const initialAnswers = isRetry ? [] : (data.answers || [])
      setAnswers(initialAnswers)
      answersRef.current = Array.isArray(initialAnswers) ? [...initialAnswers] : []
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [sessionId, isRetry, router])

  useEffect(() => {
    if (!currentQuestion) return
    setHasSpoken(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length) speakQuestion()
      else {
        window.speechSynthesis.onvoiceschanged = () => speakQuestion()
      }
    }
    return () => { if (typeof window !== 'undefined') window.speechSynthesis?.cancel() }
  }, [currentIndex, currentQuestion, speakQuestion])


  const startListening = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (e) => {
      let transcript = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) transcript += e.results[i][0].transcript + ' '
      }
      if (transcript) setCurrentAnswer((prev) => prev + transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  const handleNext = async () => {
    const answerText = currentAnswer.trim() || '(No answer provided)'
    const newAnswers = [...answersRef.current]
    while (newAnswers.length <= currentIndex) newAnswers.push('')
    newAnswers[currentIndex] = answerText
    answersRef.current = newAnswers
    setAnswers(newAnswers)
    setCurrentAnswer('')

    if (!isLastQuestion) {
      setCurrentIndex((i) => i + 1)
      setHasSpoken(false)
      return
    }

    setScoring(true)
    const finalQuestions = questions
    const finalAnswers = answersRef.current

    console.log('[interview-session] Last question — complete data before calling scoring API:', {
      questionsCount: finalQuestions.length,
      answersCount: finalAnswers.length,
      questions: finalQuestions,
      answers: finalAnswers,
      isEmpty: finalQuestions.length === 0 || finalAnswers.length === 0 || finalAnswers.every((a) => !a || a.trim() === ''),
    })
    if (finalQuestions.length === 0 || finalAnswers.length === 0) {
      console.error('[interview-session] ERROR: Questions or answers array is empty')
      setError('Cannot score: missing questions or answers.')
      setScoring(false)
      return
    }

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) {
        console.error('[interview-session] No session token')
        throw new Error('Session expired. Please log in again.')
      }

      const payload = {
        questions: finalQuestions,
        answers: finalAnswers,
        questionsAndAnswers: finalQuestions.map((q, i) => ({ question: q, answer: finalAnswers[i] || '(No answer)' })),
      }
      const res = await fetch('/api/interview-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify(payload),
      })
      const scores = await res.json()
      if (!res.ok) throw new Error(scores.error || 'Scoring failed')

      const savePayload = {
        sessionId,
        answers: Array.isArray(finalAnswers) ? finalAnswers : [],
        scores: scores && typeof scores === 'object' ? scores : {},
      }
      console.log('[interview-session] Saving to Supabase via API:', { sessionId, answersCount: savePayload.answers.length })

      const saveRes = await fetch('/api/interview-save-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify(savePayload),
      })

      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        console.error('[interview-session] Save API error:', saveData)
        throw new Error(saveData.error || 'Failed to save results')
      }

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`interview_answers_${sessionId}`, JSON.stringify(finalAnswers))
        } catch (e) {
          console.warn('[interview-session] Could not save answers to localStorage:', e)
        }
      }
      router.push(`/dashboard/interview/results?id=${sessionId}`)
    } catch (err) {
      setError(err.message || 'Failed to score interview')
      setScoring(false)
    }
  }

  if (loading) {
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

  if (error && !currentQuestion) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => router.push('/dashboard/interview')} className="text-[#6366f1] font-medium hover:underline">Start over</button>
      </div>
    )
  }

  if (!questions.length) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-[#5c5c7a] mb-4">No questions in this session.</p>
        <button onClick={() => router.push('/dashboard/interview')} className="text-[#6366f1] font-medium hover:underline">Start over</button>
      </div>
    )
  }

  const progress = ((currentIndex + 1) / totalQuestions) * 100

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-[#5c5c7a] mb-2">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
        </div>
        <div className="h-2 bg-[#eaeaf2] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="ds-card ds-card-interactive p-8 mb-6">
        <h2 className="text-xl font-semibold text-[#1a1a2e] mb-6 leading-relaxed">{currentQuestion}</h2>
        <button
          type="button"
          onClick={speakQuestion}
          className="text-sm text-[#6366f1] hover:underline mb-4"
        >
          🔊 Replay question
        </button>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[#5c5c7a] mb-2">Your answer</label>
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type or use the microphone to record your answer..."
            rows={6}
            className="w-full px-4 py-3 border border-[#eaeaf2] rounded-xl focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] resize-y text-[#1a1a2e]"
          />
          <div className="flex gap-3 mt-3">
            {(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) ? (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${isListening ? 'bg-red-500 text-white' : 'btn-gradient ds-btn-glow text-white'}`}
              >
                {isListening ? '⏹ Stop' : '🎤 Start Answering'}
              </button>
            ) : (
              <span className="text-sm text-[#5c5c7a]">Microphone not available — type your answer above.</span>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <button
        type="button"
        onClick={handleNext}
        disabled={scoring}
        className="w-full py-4 px-6 btn-gradient ds-btn-glow text-white text-lg font-semibold rounded-xl disabled:opacity-50 transition-all"
      >
        {scoring ? 'Scoring...' : isLastQuestion ? 'Finish Interview' : 'Next Question'}
      </button>
    </div>
  )
}
