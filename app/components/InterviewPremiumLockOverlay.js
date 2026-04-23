'use client'

import Link from 'next/link'

/**
 * Full-viewport lock for AI Interview Coach when the user is on the free plan.
 */
export default function InterviewPremiumLockOverlay() {
  return (
    <div className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-black/60 p-4 backdrop-blur-[8px]">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-100 bg-white px-8 py-10 text-center shadow-xl">
        <div className="mb-4 text-4xl leading-none select-none" aria-hidden>
          🔒
        </div>
        <h2 className="mb-3 text-xl font-bold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">
          Premium Feature
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-slate-500">
          AI Interview Coach is available on paid plans only. Upgrade to practice unlimited interviews and land your dream job.
        </p>
        <Link
          href="/dashboard/pricing"
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-shadow hover:shadow-xl hover:shadow-indigo-500/30"
        >
          Upgrade Now →
        </Link>
        <Link
          href="/dashboard"
          className="mt-5 block text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          Go Back
        </Link>
      </div>
    </div>
  )
}
