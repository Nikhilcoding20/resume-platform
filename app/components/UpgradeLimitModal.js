'use client'

import Link from 'next/link'

const COPY = {
  resume: {
    subtext: 'Upgrade to generate unlimited resumes tailored to every job you apply for',
  },
  'cover-letter': {
    subtext: 'Upgrade to generate unlimited cover letters tailored to every job you apply for',
  },
}

function LockIconWhite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-9 w-9 text-white"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

/**
 * Premium limit modal: dark blur overlay, white card, gradient top banner with lock.
 *
 * @param {{ open: boolean, variant?: 'resume' | 'cover-letter', onClose: () => void }} props
 */
export default function UpgradeLimitModal({ open, variant = 'resume', onClose }) {
  if (!open) return null
  const c = COPY[variant] ?? COPY.resume

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[8px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-limit-modal-title"
    >
      <div className="w-full max-w-[420px] rounded-[16px] bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] py-5 flex items-center justify-center">
          <LockIconWhite />
        </div>
        <div className="px-6 py-8 text-center">
          <h2 id="upgrade-limit-modal-title" className="text-xl font-bold text-slate-900 mb-3">
            You&apos;ve reached your free limit
          </h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">{c.subtext}</p>
          <Link
            href="/dashboard/pricing"
            className="inline-flex items-center justify-center w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-white text-base font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 transition-shadow"
          >
            Upgrade Now →
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  )
}
