import Link from 'next/link'
import PublicOrDashboardHeader from '@/app/components/PublicOrDashboardHeader'

export const metadata = {
  title: 'Free ATS Resume Checker — See Your ATS Score Instantly | Unemployed Club',
  description:
    "Check your resume's ATS score for free. Get instant feedback on keywords, formatting and improvements. Fix your resume and get more interviews.",
  alternates: {
    canonical: 'https://www.unemployedclub.com/ats-checker',
  },
}

const FAQ_ITEMS = [
  {
    q: 'What is an ATS resume checker?',
    a: 'An ATS checker analyzes your resume against Applicant Tracking System criteria and gives you a score out of 100.',
  },
  {
    q: 'Is the ATS checker really free?',
    a: 'Yes, completely free. No account or credit card required.',
  },
  {
    q: 'What does the ATS score mean?',
    a: 'A score above 80 means your resume is well-optimized. Below 60 means significant improvements are needed.',
  },
  {
    q: 'What file formats are supported?',
    a: 'We support PDF and Word (.docx) resume uploads.',
  },
  {
    q: 'How do I improve my ATS score?',
    a: 'Our checker gives specific recommendations. You can also use our AI resume builder to automatically fix all issues.',
  },
  {
    q: 'How is this different from other ATS checkers?',
    a: 'Unlike other tools, we let you instantly rebuild your resume with all fixes applied in one click.',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Upload Your Resume',
    description: 'Upload your existing resume in PDF or Word format.',
  },
  {
    num: '02',
    title: 'Get Your ATS Score',
    description: 'Instantly see your score out of 100 with detailed feedback.',
  },
  {
    num: '03',
    title: 'Fix & Apply',
    description: 'Follow our recommendations and build an improved resume.',
  },
]

const FEATURES = [
  {
    title: 'Instant ATS Score',
    description: 'Get your score out of 100 in seconds.',
  },
  {
    title: 'Keyword Analysis',
    description: 'See which keywords are missing from your resume.',
  },
  {
    title: 'Formatting Check',
    description: 'Identify formatting issues that block ATS parsing.',
  },
  {
    title: 'Improvement Tips',
    description: 'Get specific actionable recommendations.',
  },
  {
    title: 'One-Click Resume Fix',
    description: 'Build a new resume with all fixes applied automatically.',
  },
  {
    title: '100% Free',
    description: 'No credit card, no account required to check your score.',
  },
]

const STATS = [
  { value: '50,000+', label: 'Resumes Checked' },
  { value: 'Instant', label: 'ATS Score' },
  { value: 'Free', label: 'Forever' },
]

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}

const cardBase =
  'rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.14)]'

export default function AtsCheckerLandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a2e]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <PublicOrDashboardHeader />

      {/* Hero */}
      <section className="relative overflow-hidden pt-14 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 landing-hero-dots"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/4 left-1/2 h-[min(90vw,420px)] w-[min(90vw,420px)] -translate-x-1/2 landing-hero-blob opacity-40"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e8e8f4] bg-white px-4 py-2 text-xs font-semibold text-[#5c5c7a] shadow-sm">
            <span className="text-[#6366f1]" aria-hidden>
              ✦
            </span>
            ATS Resume Checker
          </span>
          <h1 className="mb-6 text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-[#1a1a2e] sm:text-4xl lg:text-5xl">
            Free ATS Resume Checker — See Your Score Instantly
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-[#5c5c7a] sm:text-lg">
            Upload your resume and get an instant ATS score. See exactly what recruiters and hiring software see.
          </p>
          <div className="mb-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard/ats-checker"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-6 py-3 text-center text-sm font-extrabold text-white shadow-[0_8px_28px_-6px_rgba(99,102,241,0.55)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-6px_rgba(99,102,241,0.6)] sm:text-base"
            >
              Check My ATS Score Free <span aria-hidden>→</span>
            </Link>
            <Link
              href="/resume-builder"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#eaeaf2] bg-white px-6 py-3 text-center text-sm font-semibold text-[#1a1a2e] transition-colors hover:border-[#6366f1]/40 hover:bg-[#f8f8ff] sm:text-base"
            >
              Build an ATS Resume
            </Link>
          </div>
          <p className="text-xs font-medium text-[#5c5c7a] sm:text-sm">
            <span className="text-[#6366f1]">✓</span> Free forever{' '}
            <span className="mx-2 text-[#eaeaf2]">·</span>
            <span className="text-[#6366f1]">✓</span> Instant results{' '}
            <span className="mx-2 text-[#eaeaf2]">·</span>
            <span className="text-[#6366f1]">✓</span> No account needed
          </p>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-[#eaeaf2] bg-[#f8f7ff] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl text-center">
          <p className="mb-8 text-sm font-semibold text-[#5c5c7a] sm:text-base">
            Join thousands of job seekers already using Unemployed Club
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-[#eaeaf2] bg-white px-6 py-5 shadow-sm">
                <p className="text-2xl font-extrabold bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-[#5c5c7a]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-sm text-[#5c5c7a] sm:text-base">
            Three simple steps from upload to an ATS-optimized resume.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <div key={step.num} className={cardBase}>
                <span className="text-xs font-extrabold tracking-[0.2em] text-[#6366f1]">
                  STEP {step.num}
                </span>
                <h3 className="mt-4 text-lg font-bold text-[#1a1a2e]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#f8f7ff] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl">
            Everything You Need to Pass ATS Screening
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className={cardBase}>
                <div className="mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4]" />
                <h3 className="text-lg font-bold text-[#1a1a2e]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5c5c7a]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="border-t border-[#eaeaf2] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
        aria-labelledby="ats-checker-faq-heading"
      >
        <div className="mx-auto max-w-3xl">
          <h2
            id="ats-checker-faq-heading"
            className="mb-12 text-center text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl lg:text-4xl"
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group overflow-hidden rounded-2xl border border-[#eaeaf2] bg-white shadow-[0_4px_20px_-8px_rgba(15,23,42,0.06)]"
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-[#1a1a2e] transition-colors marker:content-none hover:bg-[#f8f8ff] sm:px-5 sm:py-4 sm:text-base [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8f8ff] text-[#7c7c9a] transition-transform group-open:rotate-180"
                    aria-hidden
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="border-t border-[#f0f0f8] px-5 pb-4">
                  <p className="pt-3 text-sm leading-relaxed text-[#5c5c7a]">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div
          className="mx-auto flex max-w-4xl flex-col items-center overflow-hidden rounded-3xl px-5 py-12 text-center sm:px-10 sm:py-14"
          style={{
            background:
              'linear-gradient(128deg, #6366f1 0%, #4f46e5 32%, #6d28d9 52%, #0e7490 78%, #06b6d4 100%)',
            boxShadow:
              '0 28px 60px rgba(99, 102, 241, 0.42), 0 14px 36px rgba(6, 182, 212, 0.22)',
          }}
        >
          <h2 className="mb-4 text-xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_14px_rgba(15,23,42,0.35)] sm:text-3xl">
            Find Out Your ATS Score — Free
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-sm font-medium leading-relaxed text-white/95 drop-shadow-[0_1px_8px_rgba(15,23,42,0.25)] sm:text-base">
            Upload your resume and get instant feedback on keywords, formatting, and improvements.
          </p>
          <Link
            href="/dashboard/ats-checker"
            className="inline-flex min-h-11 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-extrabold text-[#6366f1] shadow-[0_12px_40px_-8px_rgba(15,23,42,0.35)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_48px_-8px_rgba(15,23,42,0.4)] sm:w-auto"
          >
            Check My Resume Now <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
