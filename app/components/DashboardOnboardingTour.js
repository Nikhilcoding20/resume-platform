'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { startDashboardOnboardingTour } from '@/lib/dashboardOnboardingTour'
import './dashboard-onboarding-tour.css'

/**
 * First-time shepherd.js tour on /dashboard; completion stored in user_usage.onboarding_tour_completed.
 */
export default function DashboardOnboardingTour({ userId }) {
  const pathname = usePathname()
  const startedRef = useRef(false)

  useEffect(() => {
    if (!userId || pathname !== '/dashboard' || startedRef.current) return

    let cancelled = false
    let tourInstance = null

    async function maybeStartTour() {
      const uid = String(userId)

      const { data: row, error } = await supabase
        .from('user_usage')
        .select('onboarding_tour_completed')
        .eq('user_id', uid)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.warn('[DashboardOnboardingTour] user_usage read:', error.message)
        return
      }

      if (row?.onboarding_tour_completed === true) return

      if (!row) {
        await supabase.from('user_usage').upsert(
          {
            user_id: uid,
            resumes_generated: 0,
            cover_letters_generated: 0,
            onboarding_tour_completed: false,
          },
          { onConflict: 'user_id', ignoreDuplicates: true }
        )
      }

      if (cancelled) return

      startedRef.current = true

      const markComplete = async () => {
        const { error: upErr } = await supabase
          .from('user_usage')
          .update({ onboarding_tour_completed: true })
          .eq('user_id', uid)
        if (upErr) console.warn('[DashboardOnboardingTour] mark complete:', upErr.message)
      }

      tourInstance = startDashboardOnboardingTour({ onComplete: markComplete })
    }

    const timer = window.setTimeout(() => {
      void maybeStartTour()
    }, 600)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (tourInstance?.isActive?.()) {
        tourInstance.cancel()
      }
    }
  }, [userId, pathname])

  return null
}
