import Link from 'next/link'

/**
 * Same sticky header as the public homepage: logo, section nav, Log In / Get Started Free.
 * Section links target the landing page anchors so they work from any route.
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
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex"
            aria-label="Page sections"
          >
            <Link
              href="/#features"
              className="text-sm font-medium text-[#5c5c7a] transition-colors hover:text-[#1a1a2e]"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-[#5c5c7a] transition-colors hover:text-[#1a1a2e]"
            >
              Pricing
            </Link>
            <Link
              href="/#reviews"
              className="text-sm font-medium text-[#5c5c7a] transition-colors hover:text-[#1a1a2e]"
            >
              Reviews
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#eaeaf2] bg-white px-3 py-2 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-[#f8f8ff] sm:px-4"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="btn-gradient landing-btn-glow rounded-xl px-3 py-2 text-sm font-semibold text-white sm:px-5"
            >
              Get Started Free
            </Link>
          </div>
        </div>
        <nav
          className="flex items-center justify-center gap-6 border-t border-[#eaeaf2] py-2.5 lg:hidden"
          aria-label="Page sections"
        >
          <Link href="/#features" className="text-xs font-semibold text-[#5c5c7a]">
            Features
          </Link>
          <Link href="/pricing" className="text-xs font-semibold text-[#5c5c7a]">
            Pricing
          </Link>
          <Link href="/#reviews" className="text-xs font-semibold text-[#5c5c7a]">
            Reviews
          </Link>
        </nav>
      </div>
    </header>
  )
}
