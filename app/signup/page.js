'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AuthGoogleButton, { AuthDividerOr } from '@/app/components/AuthGoogleButton'

export default function SignUpPage() {
  const router = useRouter()
  const [redirectAts, setRedirectAts] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [subscribeMailingList, setSubscribeMailingList] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isAtsRedirect = new URLSearchParams(window.location.search).get('redirect') === 'ats'
    setRedirectAts(isAtsRedirect)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data?.user?.id) {
      try {
        await supabase.from('user_usage').upsert(
          { user_id: data.user.id, resumes_generated: 0, cover_letters_generated: 0 },
          { onConflict: 'user_id' }
        )
      } catch { /* ignore */ }
    }
    if (subscribeMailingList) {
      await supabase.from('mailing_list').insert({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
      })
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
            Join the club
          </h1>
          <p className="text-[#5c5c7a] text-sm mt-1">Create your free Unemployed Club account</p>
        </div>

        <div className="px-8 pt-2 space-y-4">
          <AuthGoogleButton disabled={loading} onError={setError} />
        </div>
        <div className="px-8 py-4">
          <AuthDividerOr />
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-[#1a1a2e] mb-1">Full name</label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1a1a2e] mb-1">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1a1a2e] mb-1">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-[#eaeaf2] text-[#1a1a2e] focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1] outline-none transition-all" />
          </div>
          <label className="flex items-start gap-3 cursor-pointer text-sm text-[#5c5c7a] leading-snug">
            <input
              type="checkbox"
              checked={subscribeMailingList}
              onChange={(e) => setSubscribeMailingList(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#eaeaf2] text-[#6366f1] focus:ring-[#6366f1]/30"
            />
            <span>
              Subscribe to our mailing list for resume tips, job search advice, and Unemployed Club updates
            </span>
          </label>
          <button type="submit" disabled={loading} className="w-full py-3 btn-gradient ds-btn-glow rounded-xl font-semibold disabled:opacity-50 transition-all">
            {loading ? 'Creating…' : 'Sign up'}
          </button>
          <p className="text-center text-xs text-[#5c5c7a] leading-relaxed px-1">
            By signing up, you agree to our{' '}
            <Link href="/privacy" className="text-[#6366f1] hover:text-[#a855f7] underline underline-offset-2">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-[#6366f1] hover:text-[#a855f7] underline underline-offset-2">
              Terms and Conditions
            </Link>
            .
          </p>
          <p className="text-center text-sm text-[#5c5c7a]">
            Have an account?{' '}
            <Link
              href={redirectAts ? '/login?redirect=ats' : '/login'}
              className="font-semibold text-[#6366f1] hover:text-[#a855f7]"
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
