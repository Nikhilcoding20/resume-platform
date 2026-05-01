import { getActiveStripeSubscriptionPlan, getUserSubscription } from '@/lib/subscription'

/**
 * Check user usage from user_usage table.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Supabase client (anon or service role)
 * @param {string} userId - User ID (auth.users.id)
 * @returns {{ resumes: number, coverLetters: number } | null} - Usage counts or null if not found
 */
export async function getUsage(supabase, userId) {
  if (!userId) return null
  const uid = String(userId)
  const queryDescription =
    `from('user_usage').select('resumes_generated, cover_letters_generated').eq('user_id', ${JSON.stringify(uid)}).single()`
  try {
    const res = await supabase
      .from('user_usage')
      .select('resumes_generated, cover_letters_generated')
      .eq('user_id', uid)
      .single()
    console.log('[checkUsage:getUsage] user_usage query + raw Supabase response', {
      query: queryDescription,
      rawData: res.data,
      rawError: res.error,
      fullResponse: {
        data: res.data,
        error: res.error,
        count: res.count,
        status: res.status,
        statusText: res.statusText,
      },
    })
    if (res.error || !res.data) return { resumes: 0, coverLetters: 0 }
    return {
      resumes: res.data.resumes_generated ?? 0,
      coverLetters: res.data.cover_letters_generated ?? 0,
    }
  } catch (err) {
    console.log('[checkUsage:getUsage] exception', { query: queryDescription, err })
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
 * @returns {Promise<string>} Active pro plan from subscriptions (getActiveStripeSubscriptionPlan), else other active subscription plan from getUserSubscription, else 'free'
 */
export async function getUserPlan(supabase, userId) {
  if (!userId) return 'free'
  const normalizedUserId = String(userId)
  try {
    const activePro = await getActiveStripeSubscriptionPlan(supabase, normalizedUserId)
    if (activePro) {
      console.log('[checkUsage:getUserPlan] active pro (subscriptions / Stripe rules)', {
        userId: normalizedUserId,
        source: 'getActiveStripeSubscriptionPlan',
        exactPlanValueChecked: activePro,
        treatsAsFree: false,
      })
      return activePro
    }

    const sub = await getUserSubscription(supabase, normalizedUserId)
    if (!sub) {
      console.log('[checkUsage:getUserPlan] no subscriptions row', {
        userId: normalizedUserId,
        exactPlanValueChecked: 'free',
        source: 'getUserSubscription',
      })
      return 'free'
    }

    console.log('[checkUsage:getUserPlan] subscriptions row raw (getUserSubscription)', {
      userId: normalizedUserId,
      rawRow: sub,
    })

    const planRaw = sub.plan
    const plan = typeof planRaw === 'string' && planRaw.trim() ? planRaw.trim() : 'free'
    if (plan === 'free') {
      console.log('[checkUsage:getUserPlan] exact plan value checked', {
        exactPlanValueChecked: 'free',
        treatsAsFree: true,
        reason: 'plan column empty_or_free',
      })
      return 'free'
    }
    if (sub.status !== 'active') {
      console.log('[checkUsage:getUserPlan] subscription not active; treating as free', {
        userId: normalizedUserId,
        status: sub.status,
        plan,
      })
      return 'free'
    }

    console.log('[checkUsage:getUserPlan] exact plan value checked (subscriptions)', {
      exactPlanValueChecked: plan,
      treatsAsFree: false,
      status: sub.status,
    })
    return plan
  } catch (err) {
    console.error('[checkUsage:getUserPlan] failed', {
      userId: normalizedUserId,
      error: err?.message || String(err),
    })
    return 'free'
  }
}

/** Pro / legacy paid users bypass free resume limit. */
export async function canCreateResumeForUser(supabase, userId, usage) {
  const normalizedUserId = String(userId || '')
  const plan = await getUserPlan(supabase, normalizedUserId)
  const resumeCount = usage?.resumes ?? 0
  const exactPlanComparedToFree = plan
  const allowed = plan !== 'free' ? true : canCreateResume(usage)
  console.log('[checkUsage:canCreateResumeForUser]', {
    userId: normalizedUserId,
    plan,
    exactPlanComparedToFree,
    comparisonIsStrictInequalityToFree: plan !== 'free',
    resumeCount,
    freeLimit: FREE_RESUME_LIMIT,
    allowed,
  })
  return allowed
}

/** Pro / legacy paid users bypass free cover letter limit. */
export async function canCreateCoverLetterForUser(supabase, userId, usage) {
  const normalizedUserId = String(userId || '')
  const plan = await getUserPlan(supabase, normalizedUserId)
  const coverCount = usage?.coverLetters ?? 0
  const allowed = plan !== 'free' ? true : canCreateCoverLetter(usage)
  console.log('[checkUsage:canCreateCoverLetterForUser]', {
    userId: normalizedUserId,
    plan,
    coverLetterCount: coverCount,
    freeLimit: FREE_COVER_LETTER_LIMIT,
    allowed,
  })
  return allowed
}

/** True if user has any paid plan (not free). */
export function isPaidPlan(plan) {
  if (!plan || plan === 'free') return false
  return true
}
