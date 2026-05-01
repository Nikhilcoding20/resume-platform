import Link from 'next/link'

/**
 * Sticky public header: logo left; Pricing, Log In, Get Started Free grouped on the right.
 */
export default function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#eaeaf2]/90 bg-white/90 shadow-[0_1px_0_rgba(99,102,241,0.06)] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Unemployed Club home">
            <img src="/logo.png" alt="" width={160} height={36} className="h-9 w-auto max-h-9" />
          </Link>
          <nav
            className="flex min-w-0 shrink items-center gap-3"
            aria-label="Account and pricing"
          >
            <Link
              href="/pricing"
              className="shrink-0 text-sm font-medium text-[#5c5c7a] transition-colors hover:text-[#1a1a2e]"
            >
              Pricing
            </Link>
            <span
              className="h-5 w-px shrink-0 bg-[#e5e7eb]"
              aria-hidden
            />
            <Link
              href="/login"
              className="shrink-0 rounded-lg border-[1.5px] border-solid border-[#d1d5db] bg-transparent px-3 py-2 text-sm font-semibold text-[#1a1a2e] transition-colors hover:border-[#6366f1] hover:text-[#6366f1] sm:px-4"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="shrink-0 rounded-lg bg-[linear-gradient(135deg,#6366f1,#06b6d4)] px-3 py-2 text-sm font-semibold text-white sm:px-5"
            >
              Get Started Free
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
