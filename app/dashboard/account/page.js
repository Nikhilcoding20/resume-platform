'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getActiveStripeSubscriptionPlan } from '@/lib/subscription'

function planBadgeLabel(plan) {
  if (!plan || plan === 'free') return 'Free Plan'
  return 'Pro Plan'
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
      className="shrink-0 [perspective:1200px]"
      style={{ width: 420, height: 265 }}
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
              alt="Unemployed Club"
              height={28}
              className="h-7 w-auto shrink-0"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <span
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white"
              style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
            >
              {planBadgeLabel(plan)}
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUser(user)
      try {
        const active = await getActiveStripeSubscriptionPlan(supabase, user.id)
        setPlan(active || 'free')
      } catch {
        setPlan('free')
      }
    }
    load()
  }, [router])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-2 bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] bg-clip-text text-transparent">
        My Account
      </h1>
      <p className="text-[#5c5c7a] mb-8">Your Unemployed Club membership card</p>

      <div className="flex flex-col items-start gap-8">
        <MembershipCard user={user} plan={plan} />

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/settings"
            className="px-4 py-2 rounded-xl font-medium text-sm border border-[#eaeaf2] bg-white text-[#1a1a2e] hover:bg-[#f8f8ff] ds-card-interactive transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/dashboard/pricing"
            className="px-4 py-2 btn-gradient ds-btn-glow rounded-xl font-semibold text-sm text-white transition-all"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  )
}
