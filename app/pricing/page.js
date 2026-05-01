'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import PublicOrDashboardHeader from '@/app/components/PublicOrDashboardHeader'

const COL_PRO = 'bg-[#f5f3ff]'

function renderCell(v) {
  if (v === 'check') {
    return (
      <span className="text-lg leading-none text-[#6366f1]" aria-label="Included">
        ✅
      </span>
    )
  }
  if (v === 'cross') {
    return (
      <span className="text-lg leading-none text-slate-500" aria-label="Not included">
        ❌
      </span>
    )
  }
  return <span className="text-sm text-[#1a1a2e]">{v}</span>
}

const SECTIONS = [
  {
    title: null,
    rows: [
      { label: 'AI Resume Builder', values: ['1', 'Unlimited', 'Unlimited'] },
      { label: 'ATS Optimization', values: ['check', 'check', 'check'] },
      { label: 'AI Cover Letter Builder', values: ['1', 'Unlimited', 'Unlimited'] },
      { label: 'ATS Score & Analysis', values: ['check', 'check', 'check'] },
      { label: 'Keyword Suggestions', values: ['check', 'check', 'check'] },
      { label: 'Job Board', values: ['cross', 'check', 'check'] },
      { label: 'Interview Scoring & Feedback', values: ['cross', 'check', 'check'] },
      { label: 'Daily Career Tips', values: ['check', 'check', 'check'] },
      { label: 'Resume Manager', values: ['cross', 'check', 'check'] },
    ],
  },
]

function PlanHeaderCell({ children, className = '' }) {
  return (
    <th
      scope="col"
      className={`border-b border-slate-200/80 px-4 py-3 text-center align-bottom ${className}`}
    >
      {children}
    </th>
  )
}

function FeatureCell({ children, pro }) {
  return (
    <td
      className={`border-b border-slate-100 px-4 py-3 text-center text-sm ${pro ? COL_PRO : 'bg-white'}`}
    >
      <div className="flex min-h-[1.5rem] items-center justify-center">{children}</div>
    </td>
  )
}

function FeatureLabelCell({ children }) {
  return (
    <td className="sticky left-0 z-20 border-b border-slate-100 bg-white px-4 py-3 text-left text-sm text-[#1a1a2e] shadow-[1px_0_0_0_rgb(241,245,249)]">
      {children}
    </td>
  )
}

const PRICING_FAQS = [
  {
    q: 'Can I cancel anytime?',
    a: "Yes — no stress. Cancel whenever you want straight from your account settings. If you cancel before your next renewal date you keep full Pro access until the end of your billing period. We don't believe in trapping people.",
  },
  {
    q: 'What happens when my subscription expires?',
    a: "You'll drop back to the free plan — your account and all your data stays safe, you just lose access to Pro features like unlimited resumes, cover letters and the AI Interview Coach. You can upgrade again anytime.",
  },
  {
    q: 'What payment methods do you accept?',
    a: "We accept all major credit cards — Visa, Mastercard, American Express. Apple Pay is also available at checkout. All payments go through Stripe so it's fast and secure.",
  },
  {
    q: 'Is my payment information secure?',
    a: "100%. We never store your card details — ever. All payments are handled by Stripe which uses 256-bit SSL encryption and is fully PCI-DSS compliant. Your money and data are safe with us.",
  },
  {
    q: 'Will I be charged taxes?',
    a: 'Depending on your location, applicable taxes may be added at checkout based on your billing address.',
  },
  {
    q: 'What is the difference between Monthly and Annual?',
    a: 'Same Pro features, different commitment. Monthly is $14.99/month — perfect if you just need it for your job search. Annual is $99/year ($8.25/month) — best if you want to save 45% and take your time finding the right role.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Absolutely. Upgrade, downgrade or switch between Monthly and Annual anytime from your account settings. We make it easy.',
  },
]

function PricingFaqAccordion() {
  const [openId, setOpenId] = useState(null)

  return (
    <section className="mt-16 border-t border-slate-200/80 pt-14" aria-labelledby="pricing-faq-heading">
      <h2 id="pricing-faq-heading" className="text-center text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl">
        Frequently asked{' '}
        <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">questions</span>
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-500">
        Straight answers — no corporate jargon.
      </p>
      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {PRICING_FAQS.map((item, idx) => {
          const id = `faq-${idx}`
          const isOpen = openId === id
          return (
            <div
              key={id}
              className={`overflow-hidden rounded-xl border transition-colors ${
                isOpen
                  ? 'border-[#6366f1]/40 bg-[#f8f8ff] shadow-[0_0_0_1px_rgba(99,102,241,0.12)]'
                  : 'border-slate-200/90 bg-white hover:border-[#6366f1]/25'
              }`}
            >
              <button
                type="button"
                id={`${id}-btn`}
                aria-expanded={isOpen}
                aria-controls={`${id}-panel`}
                onClick={() => setOpenId(isOpen ? null : id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className={`text-sm font-semibold sm:text-base ${isOpen ? 'text-[#6366f1]' : 'text-[#1a1a2e]'}`}>
                  {item.q}
                </span>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6366f1] transition-transform ${
                    isOpen ? 'rotate-180 bg-[#6366f1]/10' : 'bg-slate-50'
                  }`}
                  aria-hidden
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>
              {isOpen && (
                <div
                  id={`${id}-panel`}
                  role="region"
                  aria-labelledby={`${id}-btn`}
                  className="border-t border-[#6366f1]/15 px-5 pb-5 pt-1"
                >
                  <p className="text-sm leading-relaxed text-[#5c5c7a] sm:text-[15px]">{item.a}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function PublicPricingPage() {
  return (
    <div className="min-h-screen bg-white pb-20">
      <PublicOrDashboardHeader />
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-center text-3xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-4xl">
          Compare{' '}
          <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">
            plans
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-slate-500">
          Choose the plan that fits your job search. Upgrade anytime.
        </p>

        <div className="mt-10 hidden overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm md:block">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(226,232,240,0.95)]">
              <tr className="bg-white">
                <th className="sticky left-0 top-0 z-50 w-[26%] min-w-[168px] bg-white px-4 py-5 text-left align-bottom shadow-[1px_0_0_0_rgb(241,245,249)]" />
                <PlanHeaderCell className="bg-white">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold uppercase tracking-wide text-[#1a1a2e]">Free</span>
                    <span className="text-2xl font-bold text-[#1a1a2e]">$0</span>
                    <span className="text-xs text-slate-500">/month</span>
                    <span className="text-xs font-medium text-slate-600">Starter</span>
                    <Link
                      href="/signup"
                      className="mt-4 inline-flex w-full max-w-[168px] items-center justify-center rounded-xl border-2 border-[#6366f1] bg-white px-4 py-2.5 text-sm font-semibold text-[#6366f1] transition-colors hover:bg-[#6366f1]/5"
                    >
                      Get Started
                    </Link>
                  </div>
                </PlanHeaderCell>
                <PlanHeaderCell className={`${COL_PRO}`}>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="inline-flex rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Pro
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wide text-[#1a1a2e]">Pro Monthly</span>
                    <span className="text-2xl font-bold text-[#1a1a2e]">$14.99</span>
                    <span className="text-xs text-slate-500">/month</span>
                    <Link
                      href="/signup"
                      className="mt-4 inline-flex w-full max-w-[168px] items-center justify-center rounded-xl bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-opacity hover:opacity-95"
                    >
                      Upgrade Now →
                    </Link>
                  </div>
                </PlanHeaderCell>
                <PlanHeaderCell className={`${COL_PRO}`}>
                  <div className="flex flex-col items-center gap-2">
                    <span className="inline-flex shrink-0 rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                      Best Value
                    </span>
                    <span className="inline-flex shrink-0 rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                      Pro Annual
                    </span>
                    <span className="text-sm font-bold uppercase tracking-wide text-[#1a1a2e]">Pro Annual</span>
                    <span className="text-2xl font-bold text-[#1a1a2e]">$8.25</span>
                    <span className="text-xs text-slate-500">/month</span>
                    <span className="text-[11px] leading-tight text-slate-500">billed $99/year</span>
                    <Link
                      href="/signup"
                      className="mt-4 inline-flex w-full max-w-[168px] items-center justify-center rounded-xl bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-opacity hover:opacity-95"
                    >
                      Upgrade Now →
                    </Link>
                  </div>
                </PlanHeaderCell>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => (
                <Fragment key={section.title ?? 'compare'}>
                  {section.rows.map((row) => (
                    <tr key={row.label}>
                      <FeatureLabelCell>{row.label}</FeatureLabelCell>
                      <FeatureCell pro={false}>{renderCell(row.values[0])}</FeatureCell>
                      <FeatureCell pro>{renderCell(row.values[1])}</FeatureCell>
                      <FeatureCell pro>{renderCell(row.values[2])}</FeatureCell>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 space-y-5 md:hidden">
          <MobilePlanCard
            planId="free"
            headline="FREE"
            badge={null}
            tagline="Starter"
            price="$0"
            period="/month"
            billed={null}
            bestValue={false}
          />
          <MobilePlanCard
            planId="monthly"
            headline="Pro Monthly"
            badge="Pro"
            tagline={null}
            price="$14.99"
            period="/month"
            billed={null}
            bestValue={false}
          />
          <MobilePlanCard
            planId="annual"
            headline="Pro Annual"
            badge="Pro Annual"
            tagline={null}
            price="$8.25"
            period="/month"
            billed="billed $99/year"
            bestValue
          />
        </div>

        <PricingFaqAccordion />
      </div>
    </div>
  )
}

function MobilePlanCard({
  planId,
  headline,
  badge,
  tagline,
  price,
  period,
  billed,
  bestValue,
}) {
  const colIdx = planId === 'free' ? 0 : planId === 'monthly' ? 1 : 2
  const isFree = planId === 'free'

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm ${
        isFree ? 'bg-white' : 'bg-[#f5f3ff]'
      }`}
    >
      {bestValue && (
        <div className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-white">
          Best Value
        </div>
      )}
      <div className="border-b border-slate-200/80 px-4 py-5 text-center">
        <div className="flex flex-col items-center gap-1">
          {badge && (
            <span className="inline-flex rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {badge}
            </span>
          )}
          <span className="text-lg font-bold uppercase tracking-wide text-[#1a1a2e]">{headline}</span>
          {tagline && <span className="text-xs font-medium text-slate-600">{tagline}</span>}
          <div className="mt-1 flex items-baseline justify-center gap-0.5">
            <span className="text-3xl font-bold text-[#1a1a2e]">{price}</span>
            <span className="text-sm text-slate-500">{period}</span>
          </div>
          {billed && <span className="text-xs text-slate-500">{billed}</span>}
        </div>
        {isFree ? (
          <Link
            href="/signup"
            className="mt-4 flex w-full items-center justify-center rounded-xl border-2 border-[#6366f1] bg-white py-3 text-sm font-semibold text-[#6366f1] transition-colors hover:bg-[#6366f1]/5"
          >
            Get Started
          </Link>
        ) : (
          <Link
            href="/signup"
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#6366f1] to-[#06b6d4] py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20"
          >
            Upgrade Now →
          </Link>
        )}
      </div>
      <div className="divide-y divide-slate-100 px-4 py-2">
        {SECTIONS.map((section) => (
          <div key={section.title ?? 'compare'} className="py-3">
            {section.title ? (
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#1a1a2e]">{section.title}</p>
            ) : null}
            <ul className="space-y-2">
              {section.rows.map((row) => {
                const v = row.values[colIdx]
                return (
                  <li key={row.label} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 flex-1 text-[#5c5c7a]">{row.label}</span>
                    <span className="flex shrink-0 items-center justify-end text-right text-[#1a1a2e]">
                      {renderCell(v)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
