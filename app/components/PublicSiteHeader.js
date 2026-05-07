import Link from 'next/link'

/**
 * Sticky public header: logo left; Pricing, Log In, primary CTA grouped on the right.
 * Compact below sm so everything fits on narrow phones (e.g. &lt;390px).
 */
export default function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#eaeaf2]/90 bg-white/90 shadow-[0_1px_0_rgba(99,102,241,0.06)] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex h-14 min-h-14 items-center justify-between gap-1.5 sm:h-16 sm:min-h-16 sm:gap-3">
          <Link
            href="/"
            className="flex min-w-0 shrink-0 items-center overflow-hidden"
            aria-label="Unemployed Club home"
          >
            <img
              src="/logo.png"
              alt=""
              width={160}
              height={36}
              className="h-7 max-h-7 w-auto max-w-[min(104px,30vw)] object-contain object-left sm:h-9 sm:max-h-9 sm:max-w-[160px]"
            />
          </Link>
          <nav
            className="flex shrink-0 flex-nowrap items-center justify-end gap-1 sm:gap-3"
            aria-label="Account and pricing"
          >
            <Link
              href="/pricing"
              className="shrink-0 whitespace-nowrap text-xs font-medium text-[#5c5c7a] transition-colors hover:text-[#1a1a2e] sm:text-sm"
            >
              Pricing
            </Link>
            <span className="hidden h-5 w-px shrink-0 bg-[#e5e7eb] sm:block" aria-hidden />
            <Link
              href="/login"
              className="shrink-0 whitespace-nowrap rounded-lg border-[1.5px] border-solid border-[#d1d5db] bg-transparent px-2 py-1.5 text-xs font-semibold leading-none text-[#1a1a2e] transition-colors hover:border-[#6366f1] hover:text-[#6366f1] sm:px-4 sm:py-2 sm:text-sm"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="shrink-0 whitespace-nowrap rounded-lg bg-[linear-gradient(135deg,#6366f1,#06b6d4)] px-2 py-1.5 text-xs font-semibold leading-none text-white shadow-sm sm:px-5 sm:py-2 sm:text-sm"
              aria-label="Get started free — sign up"
            >
              <span className="sm:hidden">Start Free</span>
              <span className="hidden sm:inline">Get Started Free</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
