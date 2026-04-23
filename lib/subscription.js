/**
 * Subscription helpers (Stripe-backed `subscriptions` table).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */

export async function getUserSubscription(supabase, userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', String(userId))
      .maybeSingle()
    if (error || !data) return null
    return data
  } catch {
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
  if (!sub || sub.status !== 'active') return null
  if (sub.plan !== 'pro_monthly' && sub.plan !== 'pro_annual') return null
  if (!isCurrentPeriodValid(sub.current_period_end)) return null
  return sub.plan
}

/** Active paid Stripe plan (monthly or annual), with valid period and active status. */
export async function isPro(supabase, userId) {
  const plan = await getActiveStripeSubscriptionPlan(supabase, userId)
  return plan !== null
}

export async function getPlanName(supabase, userId) {
  const plan = await getActiveStripeSubscriptionPlan(supabase, userId)
  if (plan === 'pro_monthly') return 'Pro Monthly'
  if (plan === 'pro_annual') return 'Pro Annual'
  return 'Free'
}
