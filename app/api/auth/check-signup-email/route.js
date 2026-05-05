import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Server-only: returns whether an auth user with this email already exists.
 * Uses the Admin API (service role). If the service role or filter API is unavailable,
 * returns exists: false and skipped: true so signup can still proceed (Supabase will enforce).
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
    console.warn('[check-signup-email] missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ exists: false, skipped: true })
  }

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
      const exists = users.some((u) => (u?.email || '').toLowerCase() === raw)
      return NextResponse.json({ exists })
    }

    console.warn('[check-signup-email] admin filter request failed', res.status, await res.text().catch(() => ''))
  } catch (e) {
    console.warn('[check-signup-email] filter path error', e)
  }

  try {
    const admin = createSupabaseAdmin()
    let page = 1
    const perPage = 1000
    for (let i = 0; i < 20; i++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.warn('[check-signup-email] listUsers error', error.message)
        return NextResponse.json({ exists: false, skipped: true })
      }
      const users = data?.users ?? []
      if (users.some((u) => (u?.email || '').toLowerCase() === raw)) {
        return NextResponse.json({ exists: true })
      }
      if (users.length < perPage) break
      page += 1
    }
    return NextResponse.json({ exists: false })
  } catch (e) {
    console.warn('[check-signup-email] fallback listUsers', e)
    return NextResponse.json({ exists: false, skipped: true })
  }
}
