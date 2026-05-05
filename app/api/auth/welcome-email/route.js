import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/createRouteHandlerClient'
import { sendWelcomeEmail } from '@/lib/emails/sendWelcomeEmail'

export const dynamic = 'force-dynamic'

/**
 * Sends welcome email to the authenticated user.
 * - Prefer `Authorization: Bearer <access_token>` (email/password signup stores the session in the browser; cookies may be empty until a full page load with SSR).
 * - Otherwise uses the Supabase cookie session (e.g. after OAuth callback).
 */
export async function POST(request) {
  try {
    let user = null

    const authHeader = request.headers.get('authorization')
    const bearer =
      typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : ''

    if (bearer) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
      if (!url.trim() || !anon.trim()) {
        return NextResponse.json({ ok: false, error: 'config' }, { status: 500 })
      }
      const supabaseAnon = createClient(url, anon)
      const { data, error } = await supabaseAnon.auth.getUser(bearer)
      if (!error && data?.user?.email) {
        user = data.user
      }
    }

    if (!user) {
      const supabase = await createRouteHandlerClient({ cookies })
      const { data, error } = await supabase.auth.getUser()
      if (!error && data?.user?.email) {
        user = data.user
      }
    }

    if (!user?.email) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    const result = await sendWelcomeEmail({
      toEmail: user.email,
      displayName: user.user_metadata?.full_name ?? null,
    })

    if (result.skipped) {
      return NextResponse.json({ ok: true, skipped: true })
    }
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || 'send_failed' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[welcome-email route]', err)
    return NextResponse.json({ ok: false, error: err?.message || 'server_error' }, { status: 500 })
  }
}
