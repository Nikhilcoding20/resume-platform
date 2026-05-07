'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useStripeBilling } from '@/lib/useStripeBilling'

function renderCell(v) {
  if (v === 'check') {
    return (
      <span className="text-base font-medium leading-none text-[#1a1a2e]" aria-label="Included">
        ✓
      </span>
    )
  }
  if (v === 'cross') {
    return (
      <span className="text-base font-normal leading-none text-slate-400" aria-label="Not included">
        —
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
    <th scope="col" className={`border-b border-slate-200 bg-white px-4 py-4 text-center align-bottom ${className}`}>
      {children}
    </th>
  )
}

function FeatureCell({ children }) {
  return (
    <td className="border-b border-slate-100 bg-white px-4 py-3 text-center text-sm">
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
    <section className="mt-16 border-t border-slate-200 pt-14" aria-labelledby="pricing-faq-heading">
      <h2 id="pricing-faq-heading" className="text-center text-2xl font-semibold tracking-tight text-[#1a1a2e] sm:text-3xl">
        Frequently asked questions
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-500">
        Straight answers — no corporate jargon.
      </p>
      <div className="mx-auto mt-10 w-full max-w-3xl space-y-3 px-0">
        {PRICING_FAQS.map((item, idx) => {
          const id = `faq-${idx}`
          const isOpen = openId === id
          return (
            <div
              key={id}
              className={`overflow-hidden rounded-xl border transition-colors ${
                isOpen ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                id={`${id}-btn`}
                aria-expanded={isOpen}
                aria-controls={`${id}-panel`}
                onClick={() => setOpenId(isOpen ? null : id)}
                className="flex min-h-11 w-full items-center justify-between gap-4 px-5 py-3 text-left sm:py-4"
              >
                <span className="text-sm font-medium sm:text-base text-[#1a1a2e]">{item.q}</span>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-transform ${
                    isOpen ? 'rotate-180 bg-slate-100' : 'bg-slate-50'
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
                  className="border-t border-slate-200 px-5 pb-5 pt-3"
                >
                  <p className="text-sm leading-relaxed text-slate-600 sm:text-[15px]">{item.a}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FeatureComparisonTable() {
  return (
    <div className="mt-6 w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="sticky left-0 z-10 w-[34%] min-w-[140px] bg-white px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Feature
            </th>
            <PlanHeaderCell>
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold text-[#1a1a2e]">Free</span>
                <span className="text-xs text-slate-500">Starter</span>
              </div>
            </PlanHeaderCell>
            <PlanHeaderCell>
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-semibold text-[#1a1a2e]">Pro Monthly</span>
                <span className="text-xs text-slate-500">$14.99/mo</span>
              </div>
            </PlanHeaderCell>
            <PlanHeaderCell>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Best value</span>
                <span className="text-sm font-semibold text-[#1a1a2e]">Pro Annual</span>
                <span className="text-xs text-slate-500">$99/yr</span>
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
                  <FeatureCell>{renderCell(row.values[0])}</FeatureCell>
                  <FeatureCell>{renderCell(row.values[1])}</FeatureCell>
                  <FeatureCell>{renderCell(row.values[2])}</FeatureCell>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PricingPage() {
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || ''
  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || ''

  const [showManage, setShowManage] = useState(false)
  const { openPortal, startCheckout, manageLoading, checkoutLoading } = useStripeBilling()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id, status, plan')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      const active =
        sub?.stripe_subscription_id &&
        sub.status === 'active' &&
        (sub.plan === 'pro_monthly' || sub.plan === 'pro_annual')
      setShowManage(!!active)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50/80 pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-[#1a1a2e] sm:text-4xl">
          Simple pricing for your job search
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-slate-600">
          Choose the plan that fits you. Upgrade or cancel anytime.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <PlanCard
            planId="free"
            kicker={null}
            title="Free"
            subtitle="Starter"
            price="$0"
            period="/ month"
            billed={null}
            bestValue={false}
            showManage={false}
            monthlyPriceId={monthlyPriceId}
            annualPriceId={annualPriceId}
            manageLoading={manageLoading}
            checkoutLoading={checkoutLoading}
            openPortal={openPortal}
            startCheckout={startCheckout}
          />
          <PlanCard
            planId="monthly"
            kicker="Pro"
            title="Pro Monthly"
            subtitle={null}
            price="$14.99"
            period="/ month"
            billed={null}
            bestValue={false}
            showManage={showManage}
            monthlyPriceId={monthlyPriceId}
            annualPriceId={annualPriceId}
            manageLoading={manageLoading}
            checkoutLoading={checkoutLoading}
            openPortal={openPortal}
            startCheckout={startCheckout}
          />
          <PlanCard
            planId="annual"
            kicker="Best value"
            title="Pro Annual"
            subtitle={null}
            price="$8.25"
            period="/ month"
            billed="Billed $99 per year"
            bestValue
            showManage={showManage}
            monthlyPriceId={monthlyPriceId}
            annualPriceId={annualPriceId}
            manageLoading={manageLoading}
            checkoutLoading={checkoutLoading}
            openPortal={openPortal}
            startCheckout={startCheckout}
          />
        </div>

        <div className="mt-16">
          <h2 className="text-center text-lg font-semibold text-[#1a1a2e]">Compare features</h2>
          <p className="mx-auto mt-1 max-w-md text-center text-sm text-slate-500">
            Same tools across plans; limits shown per column.
          </p>
          <FeatureComparisonTable />
        </div>

        <PricingFaqAccordion />
      </div>
    </div>
  )
}

function PlanCard({
  planId,
  kicker,
  title,
  subtitle,
  price,
  period,
  billed,
  bestValue,
  showManage,
  monthlyPriceId,
  annualPriceId,
  manageLoading,
  checkoutLoading,
  openPortal,
  startCheckout,
}) {
  const colIdx = planId === 'free' ? 0 : planId === 'monthly' ? 1 : 2
  const isFree = planId === 'free'
  const priceId = planId === 'monthly' ? monthlyPriceId : planId === 'annual' ? annualPriceId : null

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
        bestValue ? 'border-slate-300 ring-1 ring-slate-200' : 'border-slate-200'
      }`}
    >
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kicker}</p>
      ) : (
        <p className="text-xs font-semibold uppercase tracking-wide text-transparent select-none" aria-hidden>
          &nbsp;
        </p>
      )}
      <h2 className="mt-1 text-xl font-semibold text-[#1a1a2e]">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p> : null}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-[#1a1a2e]">{price}</span>
        <span className="text-sm text-slate-500">{period}</span>
      </div>
      {billed ? <p className="mt-1 text-xs text-slate-500">{billed}</p> : null}

      {isFree ? (
        <Link
          href="/dashboard"
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-slate-50"
        >
          Continue with Free
        </Link>
      ) : showManage ? (
        <button
          type="button"
          disabled={manageLoading}
          onClick={openPortal}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a2e] transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {manageLoading ? 'Opening…' : 'Manage subscription'}
        </button>
      ) : (
        <button
          type="button"
          disabled={!!checkoutLoading}
          onClick={() => startCheckout(priceId)}
          className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#6366f1] to-[#06b6d4] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-60"
        >
          {checkoutLoading === priceId ? 'Redirecting…' : 'Upgrade now'}
        </button>
      )}

      <div className="mt-8 border-t border-slate-100 pt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What&apos;s included</p>
        <ul className="mt-4 space-y-0 divide-y divide-slate-100">
          {SECTIONS.flatMap((section) =>
            section.rows.map((row) => {
              const v = row.values[colIdx]
              return (
                <li key={row.label} className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0">
                  <span className="min-w-0 flex-1 text-slate-600">{row.label}</span>
                  <span className="shrink-0 tabular-nums">{renderCell(v)}</span>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
