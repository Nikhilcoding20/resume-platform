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
  const savingRef = useRef(false)
  const persistAllowedRef = useRef(true)

  useEffect(() => {
    if (!userId || pathname !== '/dashboard' || startedRef.current) return

    let cancelled = false
    let tourInstance = null

    async function markOnboardingComplete() {
      if (!persistAllowedRef.current || savingRef.current) return
      savingRef.current = true

      const uid = String(userId)

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.access_token) {
          console.warn('[DashboardOnboardingTour] mark complete: no session', sessionError?.message)
          return
        }

        const res = await fetch('/api/user-usage/complete-onboarding', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        const body = await res.json().catch(() => ({}))

        if (!res.ok) {
          console.warn('[DashboardOnboardingTour] API mark complete failed:', {
            status: res.status,
            error: body.error,
            body,
          })
          await markCompleteViaClient(uid)
          return
        }

        console.log('[DashboardOnboardingTour] onboarding_tour_completed saved via API', {
          ok: body.ok,
          user_id: body.data?.user_id,
          onboarding_tour_completed: body.data?.onboarding_tour_completed,
        })
      } catch (e) {
        console.error('[DashboardOnboardingTour] mark complete threw:', e)
        await markCompleteViaClient(uid)
      } finally {
        savingRef.current = false
      }
    }

    async function markCompleteViaClient(uid) {
      const { data, error } = await supabase
        .from('user_usage')
        .upsert(
          {
            user_id: uid,
            onboarding_tour_completed: true,
          },
          { onConflict: 'user_id' }
        )
        .select('user_id, onboarding_tour_completed')
        .maybeSingle()

      if (error) {
        console.warn('[DashboardOnboardingTour] client upsert fallback failed:', error.message)
        return
      }

      console.log('[DashboardOnboardingTour] onboarding_tour_completed saved via client fallback', {
        user_id: data?.user_id,
        onboarding_tour_completed: data?.onboarding_tour_completed,
      })
    }

    async function maybeStartTour() {
      const uid = String(userId)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.warn('[DashboardOnboardingTour] skip tour: no auth session yet')
        return
      }

      const { data: row, error } = await supabase
        .from('user_usage')
        .select('onboarding_tour_completed')
        .eq('user_id', uid)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.warn('[DashboardOnboardingTour] user_usage read:', error.message, error.code)
        return
      }

      if (row?.onboarding_tour_completed === true) {
        console.log('[DashboardOnboardingTour] tour already completed for user', uid)
        return
      }

      if (!row) {
        const { error: bootstrapErr } = await supabase.from('user_usage').upsert(
          {
            user_id: uid,
            resumes_generated: 0,
            cover_letters_generated: 0,
            onboarding_tour_completed: false,
          },
          { onConflict: 'user_id' }
        )
        if (bootstrapErr) {
          console.warn('[DashboardOnboardingTour] bootstrap user_usage row:', bootstrapErr.message)
        }
      }

      if (cancelled) return

      startedRef.current = true
      tourInstance = startDashboardOnboardingTour({ onComplete: markOnboardingComplete })
    }

    const timer = window.setTimeout(() => {
      void maybeStartTour()
    }, 600)

    return () => {
      cancelled = true
      persistAllowedRef.current = false
      window.clearTimeout(timer)
      if (tourInstance?.isActive?.()) {
        tourInstance.cancel()
      }
    }
  }, [userId, pathname])

  return null
}
