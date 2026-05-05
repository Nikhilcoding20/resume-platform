'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import PublicSiteHeader from '@/app/components/PublicSiteHeader'
import DashboardHeader from '@/app/components/DashboardHeader'

/**
 * On marketing/legal pages: show dashboard nav when signed in, otherwise public header.
 */
export default function PublicOrDashboardHeader() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setUser(session?.user ?? null)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (user === undefined) {
    return (
      <div
        className="sticky top-0 z-50 min-h-16 border-b border-[#eaeaf2] bg-white/90 backdrop-blur-md"
        aria-hidden
      />
    )
  }

  if (user) {
    return <DashboardHeader user={user} />
  }

  return <PublicSiteHeader />
}
