import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request) {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return jsonError('Stripe is not configured.', 500)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (!siteUrl) return jsonError('NEXT_PUBLIC_SITE_URL is not set.', 500)

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) return jsonError('Authorization Bearer token required.', 401)

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  )
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token)
  if (authError || !user) return jsonError(authError?.message || 'Invalid session.', 401)

  let admin
  try {
    admin = createSupabaseAdmin()
  } catch (e) {
    return jsonError(e.message || 'Server configuration error.', 500)
  }

  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', String(user.id))
    .maybeSingle()

  const customerId = sub?.stripe_customer_id
  if (!customerId) {
    return jsonError('No billing account found.', 400)
  }

  const stripe = new Stripe(secret)
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}/dashboard/pricing`,
  })

  if (!portal.url) return jsonError('Could not create portal session.', 500)
  return NextResponse.json({ url: portal.url })
}
