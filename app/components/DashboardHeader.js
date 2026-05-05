'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/start', label: 'Build Resume' },
  { href: '/dashboard/jobs', label: 'Jobs' },
  { href: '/dashboard/cover-letter', label: 'Cover Letter' },
  { href: '/dashboard/ats-checker', label: 'ATS Checker' },
  { href: '/dashboard/interview', label: 'Interview Prep' },
  { href: '/dashboard/pricing', label: 'Pricing' },
]

/** Dashboard navigation header (logo, nav pills, avatar menu). Expects an authenticated Supabase user. */
export default function DashboardHeader({ user, postLogoutHref = '/' }) {
  const router = useRouter()
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace(postLogoutHref)
    router.refresh()
  }

  const initial = user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <header className="sticky top-0 z-50 border-b border-[#eaeaf2] bg-white/90 shadow-[0_1px_0_rgba(99,102,241,0.06)] backdrop-blur-md">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-h-16 items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="Unemployed Club home">
            <img src="/logo.png" alt="" width={140} height={36} className="h-9 w-auto max-w-[min(140px,42vw)]" />
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    pathname === href
                      ? 'bg-[#f5f3ff] text-[#6366f1] shadow-sm ring-1 ring-[#6366f1]/20'
                      : 'text-[#5c5c7a] hover:bg-white/80 hover:text-[#1a1a2e]'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#eaeaf2] bg-white text-[#1a1a2e] hover:bg-[#f8f8ff] lg:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls="dashboard-mobile-nav"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="ds-btn-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#06b6d4] text-sm font-bold text-white"
              >
                {initial}
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-12 z-20 mt-2 w-48 rounded-xl border border-[#eaeaf2] bg-white py-1 shadow-[0_12px_40px_-12px_rgba(99,102,241,0.2)]">
                    <Link
                      href="/dashboard/account"
                      onClick={() => setDropdownOpen(false)}
                      className="flex min-h-11 items-center px-4 text-sm text-[#5c5c7a] transition-colors hover:bg-[#f8f8ff] hover:text-[#1a1a2e]"
                    >
                      My Account
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex min-h-11 items-center px-4 text-sm text-[#5c5c7a] transition-colors hover:bg-[#f8f8ff] hover:text-[#1a1a2e]"
                    >
                      Settings
                    </Link>
                    <div className="my-1 border-t border-[#eaeaf2]" />
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false)
                        void handleLogout()
                      }}
                      className="flex min-h-11 w-full items-center px-4 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div
          id="dashboard-mobile-nav"
          className={`border-t border-[#eaeaf2] bg-white shadow-[0_12px_24px_-12px_rgba(15,23,42,0.08)] transition-[max-height,opacity] duration-200 ease-out lg:hidden ${
            mobileNavOpen
              ? 'max-h-[min(70vh,520px)] opacity-100'
              : 'pointer-events-none max-h-0 overflow-hidden border-t-0 opacity-0'
          }`}
        >
          <nav className="flex flex-col px-2 py-2" aria-label="Dashboard">
            {navItems.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex min-h-11 items-center rounded-xl px-4 text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-[#f5f3ff] text-[#6366f1] ring-1 ring-[#6366f1]/15'
                    : 'text-[#5c5c7a] hover:bg-[#f8f8ff] hover:text-[#1a1a2e]'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
