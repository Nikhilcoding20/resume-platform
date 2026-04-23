'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/resumes', label: 'My Resumes' },
  { href: '/dashboard/start', label: 'Build Resume' },
  { href: '/dashboard/jobs', label: 'Jobs' },
  { href: '/dashboard/cover-letter', label: 'Cover Letter' },
  { href: '/dashboard/ats-checker', label: 'ATS Checker' },
  { href: '/dashboard/interview', label: 'Interview Prep' },
  { href: '/dashboard/pricing', label: 'Pricing' },
]

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUser(session.user)
        } else {
          router.replace('/login')
        }
        setLoading(false)
        return
      }
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setLoading(false)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        router.replace('/login')
      }
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const initial = user?.email?.[0]?.toUpperCase() || 'U'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ds-page">
        <p className="text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen ds-page overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#eaeaf2] shadow-[0_1px_0_rgba(99,102,241,0.06)]">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-16 h-16 gap-2">
            <Link href="/" className="shrink-0 flex items-center min-w-0" aria-label="Unemployed Club home">
              <img src="/logo.png" alt="" width={140} height={36} className="h-9 w-auto max-w-[min(140px,42vw)]" />
            </Link>

            <div className="flex items-center gap-1 sm:gap-2">
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 min-h-11 inline-flex items-center ${
                      pathname === href
                        ? 'text-[#6366f1] bg-[#f5f3ff] shadow-sm ring-1 ring-[#6366f1]/20'
                        : 'text-[#5c5c7a] hover:text-[#1a1a2e] hover:bg-white/80'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <button
                type="button"
                className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#eaeaf2] bg-white text-[#1a1a2e] hover:bg-[#f8f8ff]"
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
                  className="flex items-center justify-center h-11 w-11 rounded-full bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#06b6d4] text-white text-sm font-bold ds-btn-glow shrink-0"
                >
                  {initial}
                </button>
                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden />
                    <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-xl py-1 z-20 border border-[#eaeaf2] shadow-[0_12px_40px_-12px_rgba(99,102,241,0.2)]">
                      <Link href="/dashboard/account" onClick={() => setDropdownOpen(false)} className="flex min-h-11 items-center px-4 text-sm text-[#5c5c7a] hover:bg-[#f8f8ff] hover:text-[#1a1a2e] transition-colors">
                        My Account
                      </Link>
                      <Link href="/dashboard/settings" onClick={() => setDropdownOpen(false)} className="flex min-h-11 items-center px-4 text-sm text-[#5c5c7a] hover:bg-[#f8f8ff] hover:text-[#1a1a2e] transition-colors">
                        Settings
                      </Link>
                      <div className="border-t border-[#eaeaf2] my-1" />
                      <button
                        type="button"
                        onClick={() => { setDropdownOpen(false); handleLogout() }}
                        className="flex min-h-11 w-full items-center px-4 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
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
            className={`lg:hidden border-t border-[#eaeaf2] bg-white shadow-[0_12px_24px_-12px_rgba(15,23,42,0.08)] transition-[max-height,opacity] duration-200 ease-out ${
              mobileNavOpen ? 'max-h-[min(70vh,520px)] opacity-100' : 'max-h-0 overflow-hidden border-t-0 opacity-0 pointer-events-none'
            }`}
          >
            <nav className="flex flex-col px-2 py-2" aria-label="Dashboard">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`min-h-11 flex items-center rounded-xl px-4 text-sm font-medium transition-colors ${
                    pathname === href
                      ? 'text-[#6366f1] bg-[#f5f3ff] ring-1 ring-[#6366f1]/15'
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

      <main className="flex-1 w-full min-w-0 max-w-[90rem] mx-auto p-4 sm:p-6 lg:p-8 text-[#1a1a2e]">
        {children}
      </main>
    </div>
  )
}
