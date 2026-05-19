import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

/**
 * Mark dashboard onboarding tour complete for the authenticated user.
 * Uses service role so the write succeeds regardless of RLS edge cases.
 */
export async function POST(request) {
  const authHeader = request.headers.get('Authorization')
  const token =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : ''

  if (!token) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!url.trim() || !anon.trim()) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabaseAuth = createClient(url, anon)
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token)

  if (authError || !user?.id) {
    console.warn('[complete-onboarding] auth failed:', authError?.message)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const uid = String(user.id)

  let admin
  try {
    admin = createSupabaseAdmin()
  } catch (e) {
    console.error('[complete-onboarding] admin client:', e)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { data: existing, error: readErr } = await admin
    .from('user_usage')
    .select('resumes_generated, cover_letters_generated')
    .eq('user_id', uid)
    .maybeSingle()

  if (readErr) {
    console.error('[complete-onboarding] read user_usage:', readErr)
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }

  const payload = {
    user_id: uid,
    onboarding_tour_completed: true,
    resumes_generated: existing?.resumes_generated ?? 0,
    cover_letters_generated: existing?.cover_letters_generated ?? 0,
  }

  const { data, error } = await admin
    .from('user_usage')
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id, onboarding_tour_completed, resumes_generated, cover_letters_generated')
    .single()

  if (error) {
    console.error('[complete-onboarding] upsert failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[complete-onboarding] success', {
    user_id: uid,
    onboarding_tour_completed: data?.onboarding_tour_completed,
    row: data,
  })

  return NextResponse.json({ ok: true, data })
}
