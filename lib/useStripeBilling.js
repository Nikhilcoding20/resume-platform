'use client'

import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useStripeBilling() {
  const [manageLoading, setManageLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(null)

  const openPortal = useCallback(async () => {
    setManageLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Please log in again.')
      const res = await fetch('/api/stripe-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal.')
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error(e)
      alert(e.message || 'Something went wrong.')
    } finally {
      setManageLoading(false)
    }
  }, [])

  const startCheckout = useCallback(async (priceId) => {
    if (!priceId) {
      alert('Stripe price is not configured.')
      return
    }
    setCheckoutLoading(priceId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Please log in again.')
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId, userId: session.user.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not start checkout.')
      if (data.url) window.location.href = data.url
    } catch (e) {
      console.error(e)
      alert(e.message || 'Something went wrong.')
    } finally {
      setCheckoutLoading(null)
    }
  }, [])

  return { openPortal, startCheckout, manageLoading, checkoutLoading }
}
