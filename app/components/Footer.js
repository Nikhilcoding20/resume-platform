import Link from 'next/link'

const productLinks = [
  { href: '/dashboard/start', label: 'Resume Builder' },
  { href: '/dashboard/cover-letter', label: 'Cover Letter' },
  { href: '/dashboard/ats-checker', label: 'ATS Checker' },
  { href: '/dashboard/interview', label: 'Interview Prep' },
  { href: '/dashboard/jobs', label: 'Job Board' },
  { href: '/pricing', label: 'Pricing' },
]

const companyLinks = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

function FooterLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center text-sm text-[#9ca3af] transition-colors duration-200 hover:text-white"
    >
      {children}
    </Link>
  )
}

function SocialIconButton({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#9ca3af] transition-all duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#6366f1] hover:to-[#06b6d4] hover:text-white"
    >
      {children}
    </a>
  )
}

export default function Footer() {
  return (
    <footer className="w-full overflow-x-hidden">
      <div className="bg-[#1a1a2e]">
        <div
          className="h-px w-full bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4]"
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-16">
            <div className="mx-auto max-w-sm shrink-0 text-center lg:mx-0 lg:text-left">
              <Link href="/" className="mb-4 inline-block" aria-label="Unemployed Club home">
                <img
                  src="/logo.png"
                  alt=""
                  className="mx-auto h-9 w-auto brightness-0 invert lg:mx-0"
                  height={36}
                />
              </Link>
              <p className="text-sm leading-relaxed text-[#9ca3af]">The club you join to leave.</p>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-10 min-[420px]:grid-cols-2 sm:gap-8 lg:max-w-3xl lg:grid-cols-3 lg:gap-14">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6366f1] mb-4">
                  Product
                </h3>
                <ul className="space-y-3">
                  {productLinks.map(({ href, label }) => (
                    <li key={href}>
                      <FooterLink href={href}>{label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#06b6d4] mb-4">
                  Company
                </h3>
                <ul className="space-y-3">
                  {companyLinks.map(({ href, label }) => (
                    <li key={href}>
                      <FooterLink href={href}>{label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-[420px]:col-span-2 lg:col-span-1">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6366f1] mb-4">
                  Connect
                </h3>
                <p className="mb-5">
                  <a
                    href="mailto:hello@unemployedclub.com"
                    className="text-sm text-[#9ca3af] hover:text-white transition-colors duration-200 break-all"
                  >
                    hello@unemployedclub.com
                  </a>
                </p>
                <div className="flex flex-wrap gap-2">
                  <SocialIconButton
                    href="https://www.linkedin.com/company/unemployed-club/about/"
                    label="Unemployed Club on LinkedIn"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </SocialIconButton>
                  <SocialIconButton
                    href="https://www.facebook.com/people/Unemployed-Club/61560755183488/"
                    label="Unemployed Club on Facebook"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.018 4.388 11.005 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.017 1.792-4.685 4.533-4.685 1.313 0 2.686.236 2.686.236v2.962H15.83c-1.49 0-1.955.93-1.955 1.887v2.26h3.328l-.532 3.49h-2.796V24C19.612 23.078 24 18.091 24 12.073z" />
                    </svg>
                  </SocialIconButton>
                  <SocialIconButton href="https://www.instagram.com/unemployedclub.co/" label="Unemployed Club on Instagram">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </SocialIconButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-[#9ca3af]">
          <p>© 2026 Unemployed Club. All rights reserved.</p>
          <p className="sm:text-right">
            Made with <span className="text-red-400">❤️</span> in Canada <span aria-hidden>🇨🇦</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
