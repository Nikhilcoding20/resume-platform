'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AuthGoogleButton, { AuthDividerOr } from '@/app/components/AuthGoogleButton'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectAts = searchParams.get('redirect') === 'ats'
  const oauthNextPath = redirectAts ? '/dashboard/ats-checker?from=homepage' : '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    const redirectTo = redirectAts ? '/dashboard/ats-checker?from=homepage' : '/dashboard'
    router.push(redirectTo)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white p-4 overflow-hidden">
      <div className="absolute inset-0 landing-hero-dots opacity-50 pointer-events-none" aria-hidden />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(90vw,420px)] h-[280px] landing-hero-blob opacity-40 pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-[#eaeaf2] bg-white shadow-[0_12px_48px_-12px_rgba(99,102,241,0.15)] overflow-hidden ds-card-interactive">
        <div className="h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
        <div className="px-8 pt-8 pb-2 flex flex-col items-center text-center">
          <Link href="/" className="mb-5 inline-block" aria-label="Unemployed Club home">
            <img src="/logo.png" alt="" width={160} height={36} className="h-9 w-auto" />
          </Link>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
            Welcome back to the club
          </h1>
          <p className="text-[#5c5c7a] text-sm mt-1">Sign in to your Unemployed Club account</p>
        </div>

        <div className="px-8 pt-2 space-y-4">
          <AuthGoogleButton disabled={loading} onError={setError} nextPath={oauthNextPath} />
        </div>
        <div className="px-8 py-4">
          <AuthDividerOr />
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1a1a2e] mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label htmlFor="password" className="text-sm font-medium text-[#1a1a2e]">Password</label>
              <Link href="/forgot-password" className="text-sm text-[#6366f1] hover:text-[#a855f7] font-medium transition-colors">Forgot?</Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 btn-gradient ds-btn-glow rounded-xl font-semibold disabled:opacity-50 transition-all">
            {loading ? 'Signing in…' : 'Log in'}
          </button>
          <p className="text-center text-sm text-[#5c5c7a]">
            No account?{' '}
            <Link
              href={redirectAts ? '/signup?redirect=ats' : '/signup'}
              className="font-semibold text-[#6366f1] hover:text-[#a855f7] transition-colors"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen flex items-center justify-center bg-white p-4">
          <p className="text-[#5c5c7a] text-sm">Loading…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
