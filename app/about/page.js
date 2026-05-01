import Link from 'next/link'
import PublicOrDashboardHeader from '@/app/components/PublicOrDashboardHeader'

export const metadata = {
  title: 'About Us — Unemployed Club',
  description:
    'Learn why we built Unemployed Club and our mission to make world-class career tools accessible to everyone.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicOrDashboardHeader />

      <section className="bg-[#f8f7ff] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <span className="mb-6 inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6366f1] shadow-sm ring-1 ring-[#6366f1]/10">
            ABOUT US
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#1a1a2e] sm:text-5xl lg:text-6xl">
            <span className="block">Built for the ones</span>
            <span className="block">
              who{' '}
              <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">
                keep showing up
              </span>
              .
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-4xl text-base text-[#5c5c7a] sm:text-lg">
            Unemployed Club exists for every person trying to land their next role and we take that seriously.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-serif text-3xl font-bold leading-tight text-[#1a1a2e] sm:text-4xl">
              The job market changed. Most tools didn&apos;t.
            </p>
          </div>
          <div className="space-y-5 text-[15px] leading-relaxed text-[#5c5c7a] sm:text-base">
            <p>
              Talented people were being filtered out before a single human read their resume. Not because they weren&apos;t
              qualified. Because the system was never designed with them in mind.
            </p>
            <p>
              We saw career changers, new graduates, and experienced professionals all running into the same wall. Hundreds of
              applications. Little to no response. A process that felt broken and unfair.
            </p>
            <p>
              Unemployed Club was built to change that. To give everyone access to the kind of tools and guidance that actually
              move the needle without the complexity, the jargon, or the price tag.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#f8f7ff] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">The problem we couldn&apos;t ignore</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.14)]">
              <div className="mb-4 h-1 w-12 rounded-full bg-[#6366f1]" />
              <h3 className="mt-4 text-lg font-bold text-[#1a1a2e]">The ATS Wall</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">
                Most resumes are filtered by software before a recruiter ever sees them. We help you understand the system and
                work within it.
              </p>
            </div>
            <div className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.14)]">
              <div className="mb-4 h-1 w-12 rounded-full bg-[#6366f1]" />
              <h3 className="mt-4 text-lg font-bold text-[#1a1a2e]">The Confidence Gap</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">
                Job searching is exhausting and isolating. The right feedback at the right moment changes everything.
              </p>
            </div>
            <div className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.14)]">
              <div className="mb-4 h-1 w-12 rounded-full bg-[#6366f1]" />
              <h3 className="mt-4 text-lg font-bold text-[#1a1a2e]">Access for Everyone</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">
                Great career tools should not be reserved for people who can afford career coaches. We are changing that.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">What we believe</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#eaeaf2] border-l-4 border-l-[#6366f1] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.12)]">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Honesty over flattery</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">
                We tell you what needs to improve. Not what you want to hear. Because that is what actually gets you hired.
              </p>
            </div>
            <div className="rounded-2xl border border-[#eaeaf2] border-l-4 border-l-[#6366f1] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.12)]">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Speed matters</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">
                Every day between jobs counts. We built everything to move fast so you can too.
              </p>
            </div>
            <div className="rounded-2xl border border-[#eaeaf2] border-l-4 border-l-[#6366f1] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.12)]">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Real people, real stakes</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">
                Behind every resume is a person with bills, dreams, and something to prove. We never forget that.
              </p>
            </div>
            <div className="rounded-2xl border border-[#eaeaf2] border-l-4 border-l-[#6366f1] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.12)]">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Technology that serves you</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">
                AI handles the heavy lifting. Your story, your experience, and your voice remain entirely yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Our mission</h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-white/95 sm:text-xl">
            To make world-class career tools accessible to every job seeker — regardless of background, budget, or experience level.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">Ready to leave the club?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
            Join thousands of job seekers using Unemployed Club to build better resumes, ace interviews, and land their next role.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-7 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-10px_rgba(99,102,241,0.55)]"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  )
}
