import Link from 'next/link'
import PublicSiteHeader from '@/app/components/PublicSiteHeader'

export const metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicSiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="relative flex w-full max-w-2xl flex-col items-center text-center">
          <span
            className="not-found-emoji-float mb-2 select-none text-5xl sm:text-6xl"
            role="img"
            aria-hidden
          >
            💼
          </span>

          <div className="relative mb-6 sm:mb-8">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[min(280px,70vw)] w-[min(320px,85vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
              style={{
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(139, 92, 246, 0.12) 45%, transparent 70%)',
              }}
              aria-hidden
            />
            <p
              className="relative z-[1] bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-[4rem] font-extrabold leading-none tracking-tight text-transparent sm:text-[5.5rem] md:text-[120px]"
              aria-label="404"
            >
              404
            </p>
          </div>

          <h1 className="mb-3 text-2xl font-bold tracking-tight text-[#1a1a2e] sm:text-3xl">
            Looks like this page got laid off too.
          </h1>
          <p className="mb-10 max-w-md text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
          </p>

          <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-6 py-3 text-center text-sm font-bold text-white shadow-[0_8px_28px_-6px_rgba(99,102,241,0.45),0_4px_14px_-4px_rgba(6,182,212,0.35)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-6px_rgba(99,102,241,0.55)] sm:w-auto"
            >
              Go to Dashboard <span aria-hidden>→</span>
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-[#6366f1] bg-white px-6 py-3 text-center text-sm font-bold text-[#6366f1] transition-colors hover:bg-[#f5f3ff] sm:w-auto"
            >
              Go Home
            </Link>
          </div>

          <p className="mt-10 max-w-md text-sm text-[#9ca3af]">
            Or email us at{' '}
            <a
              href="mailto:hello@unemployedclub.com"
              className="font-medium text-[#6366f1] underline underline-offset-2 transition-colors hover:text-[#4f46e5]"
            >
              hello@unemployedclub.com
            </a>{' '}
            if something seems broken
          </p>
        </div>
      </main>
    </div>
  )
}
