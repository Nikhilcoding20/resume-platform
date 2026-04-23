'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-white p-4 overflow-hidden">
      <div className="absolute inset-0 landing-hero-dots opacity-50 pointer-events-none" aria-hidden />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(90vw,420px)] h-[280px] landing-hero-blob opacity-40 pointer-events-none"
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[#eaeaf2] bg-white shadow-[0_12px_48px_-12px_rgba(99,102,241,0.15)] overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]" />
        <div className="px-8 pt-8 pb-2 flex flex-col items-center text-center">
          <Link href="/" className="mb-5 inline-block" aria-label="Unemployed Club home">
            <img src="/logo.png" alt="" width={160} height={36} className="h-9 w-auto" />
          </Link>
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
            Reset password
          </h1>
          <p className="text-[#5c5c7a] text-sm mt-1">We&apos;ll email you a link to get back into Unemployed Club</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1a1a2e] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {success && <p className="text-emerald-600 text-sm">Check your email for a reset link from Unemployed Club.</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 btn-gradient ds-btn-glow rounded-xl font-semibold text-white disabled:opacity-50 transition-all"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <p className="text-center text-sm text-[#5c5c7a]">
            Remember your password?{' '}
            <Link href="/login" className="font-semibold text-[#6366f1] hover:text-[#a855f7] transition-colors">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
