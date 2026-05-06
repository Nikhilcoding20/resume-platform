'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    const hashLooksRecovery = /type=recovery|type%3Drecovery/i.test(hash)

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' && session) {
        setStatus('ready')
      }
    })

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session && hashLooksRecovery) {
        setStatus('ready')
      }
    })

    const timeout = window.setTimeout(() => {
      if (!active) return
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (!active) return
        setStatus((s) => {
          if (s !== 'checking') return s
          return session ? 'ready' : 'invalid'
        })
      })
    }, 2000)

    return () => {
      active = false
      subscription.unsubscribe()
      window.clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    router.push('/dashboard')
  }

  if (status === 'checking') {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-white p-4 overflow-hidden">
        <div className="absolute inset-0 landing-hero-dots opacity-50 pointer-events-none" aria-hidden />
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(90vw,420px)] h-[280px] landing-hero-blob opacity-40 pointer-events-none"
          aria-hidden
        />
        <p className="relative text-[#5c5c7a] text-sm">Verifying your reset link…</p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-white p-4 overflow-hidden">
        <div className="absolute inset-0 landing-hero-dots opacity-50 pointer-events-none" aria-hidden />
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(90vw,420px)] h-[280px] landing-hero-blob opacity-40 pointer-events-none"
          aria-hidden
        />
        <div className="relative w-full max-w-md rounded-2xl border border-[#eaeaf2] bg-white shadow-[0_12px_48px_-12px_rgba(99,102,241,0.15)] overflow-hidden ds-card-interactive">
          <div className="h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
          <div className="px-8 pt-8 pb-8 flex flex-col items-center text-center space-y-4">
            <Link href="/" className="inline-block" aria-label="Unemployed Club home">
              <img src="/logo.png" alt="" width={160} height={36} className="h-9 w-auto" />
            </Link>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
              Link invalid or expired
            </h1>
            <p className="text-[#5c5c7a] text-sm">
              Request a new reset link and try again.
            </p>
            <Link
              href="/forgot-password"
              className="w-full py-3 btn-gradient ds-btn-glow rounded-xl font-semibold text-center text-white transition-all"
            >
              Send new link
            </Link>
            <Link href="/login" className="text-sm font-semibold text-[#6366f1] hover:text-[#a855f7] transition-colors">
              Back to log in
            </Link>
          </div>
        </div>
      </div>
    )
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
            Choose a new password
          </h1>
          <p className="text-[#5c5c7a] text-sm mt-1">Enter and confirm your new password for Unemployed Club</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-[#1a1a2e] mb-1">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all"
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-[#1a1a2e] mb-1">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all"
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 btn-gradient ds-btn-glow rounded-xl font-semibold disabled:opacity-50 transition-all"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>

          <p className="text-center text-sm text-[#5c5c7a]">
            <Link href="/login" className="font-semibold text-[#6366f1] hover:text-[#a855f7] transition-colors">
              Back to log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
