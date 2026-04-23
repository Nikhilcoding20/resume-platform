import { getActiveStripeSubscriptionPlan } from '@/lib/subscription'

/**
 * Check user usage from user_usage table.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client (anon or service role)
 * @param {string} userId - User ID (auth.users.id)
 * @returns {{ resumes: number, coverLetters: number } | null} - Usage counts or null if not found
 */
export async function getUsage(supabase, userId) {
  if (!userId) return null
  try {
    const { data } = await supabase
      .from('user_usage')
      .select('resumes_generated, cover_letters_generated')
      .eq('user_id', String(userId))
      .single()
    if (!data) return { resumes: 0, coverLetters: 0 }
    return {
      resumes: data.resumes_generated ?? 0,
      coverLetters: data.cover_letters_generated ?? 0,
    }
  } catch {
    return { resumes: 0, coverLetters: 0 }
  }
}

export const FREE_RESUME_LIMIT = 1
export const FREE_COVER_LETTER_LIMIT = 1

export function canCreateResume(usage) {
  if (!usage) return true
  return usage.resumes < FREE_RESUME_LIMIT
}

export function canCreateCoverLetter(usage) {
  if (!usage) return true
  return usage.coverLetters < FREE_COVER_LETTER_LIMIT
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<string>} plan: pro_monthly | pro_annual when Stripe sub is active + period in future (same as isPro), else user_usage.plan, default 'free'
 */
export async function getUserPlan(supabase, userId) {
  if (!userId) return 'free'
  try {
    const stripePlan = await getActiveStripeSubscriptionPlan(supabase, userId)
    if (stripePlan) return stripePlan

    const { data, error } = await supabase
      .from('user_usage')
      .select('plan')
      .eq('user_id', String(userId))
      .maybeSingle()
    if (error || !data) return 'free'
    const p = data.plan
    return typeof p === 'string' && p.trim() ? p.trim() : 'free'
  } catch {
    return 'free'
  }
}

/** Pro / legacy paid users bypass free resume limit. */
export async function canCreateResumeForUser(supabase, userId, usage) {
  const plan = await getUserPlan(supabase, userId)
  if (plan !== 'free') return true
  return canCreateResume(usage)
}

/** Pro / legacy paid users bypass free cover letter limit. */
export async function canCreateCoverLetterForUser(supabase, userId, usage) {
  const plan = await getUserPlan(supabase, userId)
  if (plan !== 'free') return true
  return canCreateCoverLetter(usage)
}

/** True if user has any paid plan (not free). */
export function isPaidPlan(plan) {
  if (!plan || plan === 'free') return false
  return true
}
