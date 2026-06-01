'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { pushGtmEvent } from '@/lib/gtmDataLayer'
import { supabase } from '@/lib/supabase'
import { getActiveStripeSubscriptionPlan, getUserSubscription, isCurrentPeriodValid } from '@/lib/subscription'
import { useStripeBilling } from '@/lib/useStripeBilling'

function planDisplayLabel(plan) {
  if (plan === 'pro_monthly' || plan === 'pro_annual') return 'Pro'
  return 'Free'
}

function formatPeriodEnd(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getBillingView(subscription) {
  if (!subscription) return null
  const { plan, status, current_period_end: periodEnd } = subscription
  const isProPlan = plan === 'pro_monthly' || plan === 'pro_annual'
  if (!isProPlan) return null

  if (status === 'active') {
    return { type: 'active', periodEnd }
  }
  if (status === 'cancelled' && isCurrentPeriodValid(periodEnd)) {
    return { type: 'cancelled', periodEnd }
  }
  return null
}

function BillingSection({ subscription }) {
  const { openPortal, manageLoading } = useStripeBilling()
  const billing = getBillingView(subscription)
  if (!billing) return null

  if (billing.type === 'active') {
    return (
      <SectionCard title="Billing" description="Manage your subscription and payment method">
        <p className="text-sm font-medium text-[#1a1a2e]">
          Next payment due:{' '}
          <span className="font-semibold">{formatPeriodEnd(billing.periodEnd)}</span>
        </p>
        <button
          type="button"
          onClick={openPortal}
          disabled={manageLoading}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#eaeaf2] bg-[#f8f7ff] px-5 py-2.5 text-sm font-semibold text-[#1a1a2e] transition-colors hover:border-[#6366f1]/40 hover:bg-white disabled:opacity-60"
        >
          {manageLoading ? 'Opening…' : 'Manage Billing'}
        </button>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Billing" description="Your subscription is ending soon">
      <p className="text-sm font-semibold text-amber-600">
        Your Pro access ends on: {formatPeriodEnd(billing.periodEnd)}
      </p>
      <Link
        href="/dashboard/pricing"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl btn-gradient ds-btn-glow px-5 py-2.5 text-sm font-semibold text-white transition-all"
        onClick={() => pushGtmEvent('upgrade_clicked')}
      >
        Resubscribe
      </Link>
    </SectionCard>
  )
}

function DetailRow({ label, value, valueClassName = '' }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#eaeaf2] py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm font-medium text-[#5c5c7a]">{label}</span>
      <span className={`text-sm font-semibold text-[#1a1a2e] sm:text-right ${valueClassName}`}>{value}</span>
    </div>
  )
}

function SectionCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_8px_34px_-12px_rgba(99,102,241,0.14)] sm:p-8">
      {title && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#1a1a2e]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[#5c5c7a]">{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

function MembershipCard({ user, plan }) {
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member'
  const createdAt = user?.created_at ? new Date(user.created_at) : null
  const memberSince = createdAt
    ? createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—'
  const lastSix = user?.id
    ? String((parseInt(user.id.replace(/-/g, '').slice(-8), 16) || 0) % 1000000).padStart(6, '0')
    : '324598'
  const cardNumberDisplay = `**** **** **** ${lastSix}`

  return (
    <div
      className="mx-auto w-full max-w-[min(100%,420px)] shrink-0 [perspective:1200px] lg:max-w-[420px]"
      style={{ aspectRatio: '420 / 265' }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-2xl transition-transform duration-300 ease-out [transform-style:preserve-3d] hover:[transform:rotateX(4deg)_rotateY(-7deg)_translateZ(0)]"
        style={{
          boxShadow: '0 25px 50px rgba(99, 102, 241, 0.4)',
        }}
      >
        {/* Base diagonal gradient */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'linear-gradient(127deg, #6366f1 0%, #5b5cf0 35%, #0891b2 72%, #06b6d4 100%)',
          }}
        />

        {/* Texture: thin diagonal lines */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.45]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -32deg,
              transparent,
              transparent 5px,
              rgba(255,255,255,0.07) 5px,
              rgba(255,255,255,0.07) 6px
            )`,
          }}
        />

        {/* Subtle dot grain */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.14) 1px, transparent 0)',
            backgroundSize: '5px 5px',
          }}
        />

        {/* Holographic shimmer */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none mix-blend-overlay"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
          }}
        />

        {/* Inner bevel / edge */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-white/25 ring-inset"
          aria-hidden
        />

        {/* Diagonal shine streak */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none"
          aria-hidden
        >
          <div
            className="absolute h-[220%] w-[45%] -rotate-[35deg] opacity-[0.22] blur-[1px]"
            style={{
              left: '18%',
              top: '-60%',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 48%, rgba(255,255,255,0.65) 52%, transparent 100%)',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-[1] grid h-full w-full grid-rows-[auto_1fr_auto_auto] p-6 box-border gap-0">
          <div className="flex items-start justify-between gap-3">
            <img
              src="/logo.png"
              alt="Unemployed Club - AI Resume Builder"
              width={150}
              height={40}
              className="h-7 w-auto shrink-0"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            >
              {planDisplayLabel(plan) === 'Pro' ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>

          <div className="flex min-h-[52px] items-center">
            {/* EMV-style chip */}
            <div
              className="relative h-[35px] w-[45px] shrink-0 overflow-hidden rounded-[5px]"
              style={{
                background: 'linear-gradient(145deg, #f0e6a8 0%, #e6cf6a 18%, #c9a227 45%, #a67c1a 78%, #8b6914 100%)',
                boxShadow:
                  '0 3px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.25)',
              }}
              aria-hidden
            >
              <div
                className="absolute inset-[3px] rounded-[3px]"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(80,50,0,0.35) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(80,50,0,0.35) 1px, transparent 1px)
                  `,
                  backgroundSize: '9px 7px',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
                }}
              />
              <div
                className="absolute inset-0 rounded-[5px] pointer-events-none opacity-50"
                style={{
                  background: 'linear-gradient(125deg, rgba(255,255,255,0.5) 0%, transparent 42%, transparent 58%, rgba(0,0,0,0.12) 100%)',
                }}
              />
            </div>
          </div>

          <p
            className="font-mono font-medium tracking-[0.22em] text-white pl-0.5 pt-1 pb-3"
            style={{ fontSize: 15 }}
          >
            {cardNumberDisplay}
          </p>

          <div className="flex items-end justify-between gap-4">
            <p
              className="min-w-0 truncate font-bold text-white"
              style={{ fontSize: 18 }}
            >
              {fullName.toUpperCase()}
            </p>
            <div className="text-right shrink-0">
              <p
                className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'rgba(255,255,255,0.65)' }}
              >
                Member Since
              </p>
              <p className="text-sm font-bold text-white whitespace-nowrap">{memberSince}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState('free')
  const [subscription, setSubscription] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUser(user)
      try {
        const [active, subRow] = await Promise.all([
          getActiveStripeSubscriptionPlan(supabase, user.id),
          getUserSubscription(supabase, user.id),
        ])
        setPlan(active || 'free')
        setSubscription(subRow)
      } catch {
        setPlan('free')
        setSubscription(null)
      }
    }
    load()
  }, [router])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member'
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'
  const isPro = plan === 'pro_monthly' || plan === 'pro_annual'

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
          My Account
        </h1>
        <p className="mt-1 text-[#5c5c7a]">Manage your membership and account settings</p>
      </div>

      <div className="flex flex-col gap-8">
        <MembershipCard user={user} plan={plan} />

        <SectionCard title="Account Details" description="Your profile and membership information">
          <DetailRow label="Name" value={fullName} />
          <DetailRow label="Email" value={user.email || '—'} />
          <DetailRow
            label="Plan"
            value={planDisplayLabel(plan)}
            valueClassName={isPro ? 'text-[#6366f1]' : ''}
          />
          <DetailRow label="Member since" value={memberSince} />
        </SectionCard>

        <BillingSection subscription={subscription} />

        <SectionCard title="Quick Actions" description="Jump to the tools you use most">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/dashboard/start"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#eaeaf2] bg-[#f8f7ff] px-4 py-3 text-sm font-semibold text-[#1a1a2e] transition-colors hover:border-[#6366f1]/40 hover:bg-white"
            >
              Build Resume
            </Link>
            <Link
              href="/dashboard/ats-checker"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#eaeaf2] bg-[#f8f7ff] px-4 py-3 text-sm font-semibold text-[#1a1a2e] transition-colors hover:border-[#06b6d4]/40 hover:bg-white"
            >
              Check ATS Score
            </Link>
            {!isPro && (
              <Link
                href="/dashboard/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-xl btn-gradient ds-btn-glow px-4 py-3 text-sm font-semibold text-white transition-all"
                onClick={() => pushGtmEvent('upgrade_clicked')}
              >
                Upgrade to Pro
              </Link>
            )}
          </div>
        </SectionCard>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/settings"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#eaeaf2] bg-white px-5 py-2.5 text-sm font-medium text-[#1a1a2e] shadow-sm transition-colors hover:bg-[#f8f8ff]"
          >
            Settings
          </Link>
        </div>

        <SectionCard title="Danger Zone" description="Sign out of your account on this device">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
          >
            {signingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </SectionCard>
      </div>
    </div>
  )
}
