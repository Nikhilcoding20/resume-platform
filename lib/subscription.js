/**
 * Subscription helpers (Stripe-backed `subscriptions` table).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */

export async function getUserSubscription(supabase, userId) {
  if (!userId) return null
  const normalizedUserId = String(userId)
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', normalizedUserId)
      .maybeSingle()
    console.log('[subscription:getUserSubscription] query result', {
      userId: normalizedUserId,
      error: error?.message || null,
      data,
    })
    if (error || !data) return null
    return data
  } catch (err) {
    console.error('[subscription:getUserSubscription] query failed', {
      userId: normalizedUserId,
      error: err?.message || String(err),
    })
    return null
  }
}

/** True when billing period is still valid (end in the future). */
export function isCurrentPeriodValid(currentPeriodEnd) {
  if (currentPeriodEnd == null || currentPeriodEnd === '') return false
  const end = new Date(currentPeriodEnd)
  if (Number.isNaN(end.getTime())) return false
  return end.getTime() > Date.now()
}

/**
 * Stripe-backed paid plan only when status is active, period end is in the future, and plan is pro.
 * @returns {'pro_monthly' | 'pro_annual' | null}
 */
export async function getActiveStripeSubscriptionPlan(supabase, userId) {
  const sub = await getUserSubscription(supabase, userId)
  if (!sub) {
    console.log('[subscription:getActiveStripeSubscriptionPlan] no subscription row found', {
      userId: String(userId),
    })
    return null
  }
  if (sub.status !== 'active') {
    console.log('[subscription:getActiveStripeSubscriptionPlan] inactive status', {
      userId: String(userId),
      status: sub.status,
    })
    return null
  }
  if (sub.plan !== 'pro_monthly' && sub.plan !== 'pro_annual') {
    console.log('[subscription:getActiveStripeSubscriptionPlan] non-pro plan', {
      userId: String(userId),
      plan: sub.plan,
    })
    return null
  }
  if (!isCurrentPeriodValid(sub.current_period_end)) {
    console.log('[subscription:getActiveStripeSubscriptionPlan] invalid current period end', {
      userId: String(userId),
      currentPeriodEnd: sub.current_period_end,
    })
    return null
  }
  console.log('[subscription:getActiveStripeSubscriptionPlan] active plan resolved', {
    userId: String(userId),
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.current_period_end,
  })
  return sub.plan
}

/** Active paid Stripe plan (monthly or annual), with valid period and active status. */
export async function isPro(supabase, userId) {
  const plan = await getActiveStripeSubscriptionPlan(supabase, userId)
  console.log('[subscription:isPro] result', {
    userId: String(userId),
    plan,
    isPro: plan !== null,
  })
  return plan !== null
}

export async function getPlanName(supabase, userId) {
  const plan = await getActiveStripeSubscriptionPlan(supabase, userId)
  if (plan === 'pro_monthly') return 'Pro Monthly'
  if (plan === 'pro_annual') return 'Pro Annual'
  return 'Free'
}
