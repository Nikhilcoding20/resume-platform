import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { sendProSubscriptionWelcomeEmail } from '@/lib/emails/sendProSubscriptionWelcomeEmail'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function planFromPriceId(priceId) {
  const monthly =
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ||
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  const annual =
    process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  if (priceId === monthly) return 'pro_monthly'
  if (priceId === annual) return 'pro_annual'
  return 'pro_monthly'
}

function mapStripeStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active'
  if (stripeStatus === 'past_due') return 'past_due'
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid' || stripeStatus === 'incomplete_expired') {
    return 'cancelled'
  }
  return 'active'
}

/** Ensure a user_usage row exists (counts live here; plan is on subscriptions only). */
async function ensureUserUsageRow(admin, userId) {
  if (!userId) return
  const uid = String(userId)
  const { error } = await admin.from('user_usage').upsert(
    { user_id: uid, resumes_generated: 0, cover_letters_generated: 0 },
    { onConflict: 'user_id', ignoreDuplicates: true }
  )
  if (error) console.error('[stripe-webhook] ensureUserUsageRow', error)
}

/**
 * One branded Pro welcome email per Stripe subscription id (checkout fires multiple events).
 */
async function maybeSendProSubscriptionWelcome(admin, { userId, plan, stripeSubscriptionId }) {
  if (!userId || !stripeSubscriptionId || !plan) return
  if (plan !== 'pro_monthly' && plan !== 'pro_annual') return

  const uid = String(userId)

  const { data: row, error: selErr } = await admin
    .from('subscriptions')
    .select('pro_welcome_email_subscription_id')
    .eq('user_id', uid)
    .maybeSingle()

  if (selErr) {
    console.error('[stripe-webhook] pro welcome select:', selErr.message)
    return
  }

  if (row?.pro_welcome_email_subscription_id === stripeSubscriptionId) {
    return
  }

  let toEmail = null
  try {
    const { data: authData, error: authErr } = await admin.auth.admin.getUserById(uid)
    if (authErr) {
      console.error('[stripe-webhook] pro welcome getUserById:', authErr.message)
      return
    }
    toEmail = authData?.user?.email?.trim() || null
  } catch (e) {
    console.error('[stripe-webhook] pro welcome getUserById failed:', e)
    return
  }

  if (!toEmail) {
    console.warn('[stripe-webhook] pro welcome: no email for user', uid)
    return
  }

  const sent = await sendProSubscriptionWelcomeEmail({ toEmail, plan, returnSoft: true })
  if (!sent.ok) {
    console.warn('[stripe-webhook] pro welcome email not sent:', sent.error || sent.skipped)
    return
  }

  const { error: upErr } = await admin
    .from('subscriptions')
    .update({ pro_welcome_email_subscription_id: stripeSubscriptionId })
    .eq('user_id', uid)

  if (upErr) {
    console.error('[stripe-webhook] pro welcome dedupe update:', upErr.message)
  }
}

export async function POST(request) {
  const secret = process.env.STRIPE_SECRET_KEY
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !whSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(secret)
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret)
  } catch (err) {
    console.error('[stripe-webhook] signature verify failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let admin
  try {
    admin = createSupabaseAdmin()
  } catch (e) {
    console.error('[stripe-webhook] admin client:', e)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        let userId = sub.metadata?.userId ? String(sub.metadata.userId) : null
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        const priceId = sub.items?.data?.[0]?.price?.id
        const plan = priceId ? planFromPriceId(priceId) : 'pro_monthly'
        const status = mapStripeStatus(sub.status)
        const current_period_end = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null

        if (!userId && customerId) {
          const { data: row } = await admin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()
          userId = row?.user_id ? String(row.user_id) : null
        }

        if (!userId) {
          console.warn('[stripe-webhook] subscription event: no userId', sub.id)
          break
        }

        const dbPlan = status === 'active' ? plan : 'free'
        const dbStatus = status === 'past_due' ? 'past_due' : status === 'cancelled' ? 'cancelled' : 'active'

        await admin.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            plan: dbPlan,
            status: dbStatus,
            current_period_end: status === 'active' ? current_period_end : current_period_end,
          },
          { onConflict: 'user_id' }
        )

        await ensureUserUsageRow(admin, userId)

        if (sub.status === 'active' || sub.status === 'trialing') {
          await maybeSendProSubscriptionWelcome(admin, {
            userId,
            plan,
            stripeSubscriptionId: sub.id,
          })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const subId = sub.id
        const { data: existing } = await admin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()

        if (existing?.user_id) {
          const uid = String(existing.user_id)
          await admin
            .from('subscriptions')
            .update({
              status: 'cancelled',
              plan: 'free',
              stripe_subscription_id: null,
              current_period_end: null,
            })
            .eq('user_id', uid)
          await ensureUserUsageRow(admin, uid)
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        const billingReason = invoice.billing_reason
        if (billingReason !== 'subscription_create') break

        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (!subId) break

        const sub = await stripe.subscriptions.retrieve(subId)
        let userId = sub.metadata?.userId ? String(sub.metadata.userId) : null
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        const priceId = sub.items?.data?.[0]?.price?.id
        const plan = priceId ? planFromPriceId(priceId) : 'pro_monthly'
        const current_period_end = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null

        if (!userId && customerId) {
          const { data: row } = await admin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()
          userId = row?.user_id ? String(row.user_id) : null
        }

        if (!userId) break

        await admin.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            plan,
            status: 'active',
            current_period_end,
          },
          { onConflict: 'user_id' }
        )
        await ensureUserUsageRow(admin, userId)

        await maybeSendProSubscriptionWelcome(admin, {
          userId,
          plan,
          stripeSubscriptionId: sub.id,
        })
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (!subId) break

        const { data: existing } = await admin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle()

        await admin.from('subscriptions').update({ status: 'past_due' }).eq('stripe_subscription_id', subId)

        if (existing?.user_id) {
          await ensureUserUsageRow(admin, String(existing.user_id))
        }
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error('[stripe-webhook] handler error:', e)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
