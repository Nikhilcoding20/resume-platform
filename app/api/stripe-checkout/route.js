import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request) {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) {
    return jsonError('Stripe is not configured.', 500)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!siteUrl) {
    return jsonError('NEXT_PUBLIC_SITE_URL is not set.', 500)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body.', 400)
  }

  const { priceId, userId: bodyUserId } = body || {}
  if (!priceId || typeof priceId !== 'string') {
    return jsonError('priceId is required.', 400)
  }

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return jsonError('Authorization Bearer token required.', 401)
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  )
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token)

  if (authError || !user) {
    return jsonError(authError?.message || 'Invalid session.', 401)
  }

  if (bodyUserId && String(bodyUserId) !== String(user.id)) {
    return jsonError('User mismatch.', 403)
  }

  const userId = user.id
  const email = user.email

  const monthlyId =
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  const annualId =
    process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || process.env.STRIPE_PRO_ANNUAL_PRICE_ID

  if (priceId !== monthlyId && priceId !== annualId) {
    return jsonError('Invalid price.', 400)
  }

  const stripe = new Stripe(secret)

  let admin
  try {
    admin = createSupabaseAdmin()
  } catch (e) {
    return jsonError(e.message || 'Server configuration error.', 500)
  }

  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', String(userId))
    .maybeSingle()

  let customerId = existing?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: { userId: String(userId) },
    })
    customerId = customer.id
    await admin.from('subscriptions').upsert(
      {
        user_id: String(userId),
        stripe_customer_id: customerId,
        plan: 'free',
        status: 'active',
      },
      { onConflict: 'user_id' }
    )
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${siteUrl}/dashboard?payment=success`,
    cancel_url: `${siteUrl}/dashboard/pricing?payment=cancelled`,
    metadata: { userId: String(userId) },
    subscription_data: {
      metadata: { userId: String(userId) },
    },
  })

  if (!session.url) {
    return jsonError('Could not create checkout session.', 500)
  }

  return NextResponse.json({ url: session.url })
}
