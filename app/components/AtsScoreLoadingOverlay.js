'use client'

import { useEffect, useState } from 'react'

const TIP_INTERVAL_MS = 5000
const EXIT_ANIM_MS = 500

const DEFAULT_ATS_TIPS = [
  { text: 'ATS systems parse plain text best—clear section headings help your resume get read correctly.', emoji: '📋', source: 'ATS parsing' },
  { text: 'Most large companies filter resumes by keyword before a recruiter sees them.', emoji: '🔍', source: 'Keyword screening' },
  { text: 'Simple layouts usually survive ATS better than complex tables.', emoji: '📄', source: 'Format tips' },
  { text: 'Mirror job-description skills when truthful.', emoji: '🎯', source: 'Keyword alignment' },
  { text: 'Analyzing your resume against this role…', emoji: '✨', source: 'Unemployed Club' },
]

export default function AtsScoreLoadingOverlay({ active, progress, headline = 'Your ATS score is being calculated...', tips = DEFAULT_ATS_TIPS }) {
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
        setTipIndex((i) => (i + 1) % tips.length)
        setExiting(false)
      }, EXIT_ANIM_MS)
    }, TIP_INTERVAL_MS)
    return () => {
      clearInterval(id)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [active, tips.length])

  if (!active) return null

  const tip = tips[tipIndex]
  const pct = Math.round(progress)

  return (
    <div className="fixed inset-0 z-[200] flex min-h-screen flex-col bg-white" aria-busy="true" aria-live="polite">
      <header className="bg-white/90 backdrop-blur-md border-b border-[#eaeaf2] py-4 flex items-center justify-center gap-2">
        <span className="text-sm font-semibold bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">Unemployed Club</span>
      </header>
      <div className="shrink-0 px-4 py-5 sm:px-8 bg-[#f8f8ff] border-b border-[#eaeaf2]">
        <p className="mb-3 text-base font-semibold text-[#1a1a2e]">{headline}</p>
        <div className="flex items-center gap-4">
          <div className="h-2 flex-1 rounded-full bg-[#eaeaf2] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] transition-[width] duration-300 shadow-sm"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums text-[#5c5c7a] min-w-[2.5rem] text-right">{pct}%</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 bg-dot-grid-light">
        <div
          key={tipIndex}
          className={`w-full max-w-lg ds-card ds-card-interactive p-8 relative overflow-hidden ${
            exiting ? 'animate-tip-card-out' : 'animate-tip-card-in'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
          <div className="text-4xl text-center mb-4">{tip.emoji}</div>
          <p className="text-center font-semibold text-[#1a1a2e] text-lg">{tip.text}</p>
          <p className="text-center text-sm text-[#5c5c7a] mt-3">{tip.source}</p>
        </div>
        <div className="flex gap-2 mt-8">
          {tips.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === tipIndex ? 'w-6 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]' : 'w-1.5 bg-[#eaeaf2]'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
