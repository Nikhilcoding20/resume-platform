'use client'

/**
 * Google OAuth via Supabase Auth.
 *
 * In the Supabase dashboard: Authentication → Providers → Google — turn the provider ON.
 * Google requires an OAuth 2.0 Client ID and Client Secret from Google Cloud Console
 * (APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application).
 * Paste those values into the Google provider fields in Supabase (not in this repo).
 *
 * Authorized redirect URIs in Google Cloud must include your Supabase callback URL, e.g.:
 *   https://<your-project-ref>.supabase.co/auth/v1/callback
 *
 * After a successful OAuth round-trip, Supabase redirects the user to the URL passed in
 * signInWithOAuth options.redirectTo (e.g. /dashboard).
 *
 * Add that full URL to Supabase → Authentication → URL Configuration → Redirect URLs
 * (e.g. http://localhost:3000/dashboard and https://your-production-domain/dashboard).
 */

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

/** Standard multicolor Google “G” for sign-in buttons */
export function GoogleLogo({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export function AuthDividerOr() {
  return (
    <div className="relative flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-[#eaeaf2]" />
      <span className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider shrink-0">or</span>
      <div className="flex-1 h-px bg-[#eaeaf2]" />
    </div>
  )
}

export default function AuthGoogleButton({ disabled, onError }) {
  const [oauthLoading, setOauthLoading] = useState(false)

  async function handleGoogleSignIn() {
    if (oauthLoading) return
    setOauthLoading(true)
    onError?.(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard' },
      })
      if (error) {
        onError?.(error.message)
        setOauthLoading(false)
        return
      }
      // Browser follows redirect to Google then back to /dashboard
    } catch (e) {
      onError?.(e?.message || 'Something went wrong')
      setOauthLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || oauthLoading}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[#eaeaf2] bg-white text-[#1a1a2e] font-semibold text-sm shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:bg-[#f8f8ff] hover:border-[#d4d4e8] hover:shadow-[0_4px_14px_-4px_rgba(99,102,241,0.18)] transition-all disabled:opacity-60 disabled:pointer-events-none"
    >
      <GoogleLogo />
      {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
    </button>
  )
}
