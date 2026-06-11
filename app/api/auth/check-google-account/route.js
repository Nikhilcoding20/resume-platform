import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function isGoogleOnlyAccount(user) {
  if (!user) return false

  const identities = Array.isArray(user.identities) ? user.identities : []
  const identityProviders = identities.map((i) => i?.provider).filter(Boolean)
  const hasGoogle = identityProviders.includes('google')
  const hasEmail = identityProviders.includes('email')
  if (hasGoogle && !hasEmail) return true

  const appProviders = user.app_metadata?.providers
  if (Array.isArray(appProviders)) {
    return appProviders.includes('google') && !appProviders.includes('email')
  }

  return false
}

async function findUserByEmail(raw) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceKey) return null

  try {
    const filterUrl = `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(raw)}&per_page=2`
    const res = await fetch(filterUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    })

    if (res.ok) {
      const data = await res.json()
      const users = Array.isArray(data?.users) ? data.users : []
      return users.find((u) => (u?.email || '').toLowerCase() === raw) ?? null
    }

    console.warn('[check-google-account] admin filter request failed', res.status, await res.text().catch(() => ''))
  } catch (e) {
    console.warn('[check-google-account] filter path error', e)
  }

  try {
    const admin = createSupabaseAdmin()
    let page = 1
    const perPage = 1000
    for (let i = 0; i < 20; i++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.warn('[check-google-account] listUsers error', error.message)
        return null
      }
      const users = data?.users ?? []
      const match = users.find((u) => (u?.email || '').toLowerCase() === raw)
      if (match) return match
      if (users.length < perPage) break
      page += 1
    }
  } catch (e) {
    console.warn('[check-google-account] fallback listUsers', e)
  }

  return null
}

/**
 * Server-only: returns whether an auth user with this email signed up via Google OAuth only
 * (no email/password identity). Uses the Admin API (service role).
 */
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceKey) {
    console.warn('[check-google-account] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ googleOnly: false, skipped: true })
  }

  const user = await findUserByEmail(raw)
  return NextResponse.json({ googleOnly: isGoogleOnlyAccount(user) })
}
