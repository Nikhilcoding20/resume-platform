import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// createRouteHandlerClient is not exported by @supabase/auth-helpers-nextjs@0.15; createServerClient is the supported replacement.
export const dynamic = 'force-dynamic'

function safeNextPath(next) {
  if (next == null || typeof next !== 'string') return '/dashboard'
  const t = next.trim()
  if (!t.startsWith('/') || t.startsWith('//')) return '/dashboard'
  return t
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next') || '/dashboard'
  const next = safeNextPath(nextParam)

  if (!code) {
    console.log('[auth/callback] missing ?code', { next })
    return NextResponse.redirect(new URL('/login?error=missing_code', requestUrl.origin))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
    console.error('[auth/callback] missing Supabase env')
    return NextResponse.redirect(new URL('/login?error=config', requestUrl.origin))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch (e) {
          console.error('[auth/callback] cookies.setAll failed', e)
        }
      },
    },
  })

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  const session = data?.session
  const user = data?.user ?? session?.user
  console.log('[auth/callback] exchangeCodeForSession', {
    ok: !error,
    error: error ? { message: error.message, name: error.name, status: error.status } : null,
    session: session
      ? {
          userId: user?.id,
          email: user?.email,
          expiresAt: session.expires_at,
          accessTokenLength: session.access_token?.length ?? 0,
        }
      : null,
  })

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed', error)
    return NextResponse.redirect(new URL('/login?error=oauth', requestUrl.origin))
  }

  if (!session) {
    console.error('[auth/callback] no session after successful exchange (unexpected)')
    return NextResponse.redirect(new URL('/login?error=oauth', requestUrl.origin))
  }

  // Success: session is stored via createServerClient cookie adapter; land on /dashboard or safe ?next=
  const destination = next
  console.log('[auth/callback] redirect after successful exchange', { destination })
  return NextResponse.redirect(new URL(destination, requestUrl.origin))
}
