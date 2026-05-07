'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardHeader from '@/app/components/DashboardHeader'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let cancelled = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUser(session.user)
        } else {
          router.replace('/login')
        }
        setLoading(false)
        return
      }
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setLoading(false)
      }
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setLoading(false)
        router.replace('/')
      }
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center ds-page">
        <p className="text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center ds-page">
        <p className="text-[#5c5c7a]">Redirecting to sign in…</p>
      </div>
    )
  }

  return (
    <div className="ds-page flex min-h-screen flex-col overflow-x-hidden">
      <DashboardHeader user={user} />

      <main className="mx-auto w-full min-w-0 max-w-[90rem] flex-1 overflow-x-hidden p-4 text-[#1a1a2e] sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
