import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const LOG = '[CALLBACK]'

function safeNextPath(next) {
  if (next == null || typeof next !== 'string') return '/dashboard'
  const t = next.trim()
  if (!t.startsWith('/') || t.startsWith('//')) return '/dashboard'
  return t
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const redirectPath = safeNextPath(nextParam)

  if (!code) {
    console.warn(`${LOG} missing code — redirecting to login`)
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(loginUrl)
  }

  const successUrl = new URL(redirectPath, requestUrl.origin)
  let response = NextResponse.redirect(successUrl)

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch (e) {
              console.error(`${LOG} cookieStore.set failed`, e)
            }
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error(`${LOG} exchangeCodeForSession failed:`, error.message)
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'oauth')
    loginUrl.searchParams.set('error_description', error.message)
    return NextResponse.redirect(loginUrl)
  }

  const hasSession = Boolean(data?.session)
  console.log(`${LOG} exchange ok — session:`, hasSession, '| redirect:', successUrl.href)

  if (!hasSession) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', 'oauth')
    return NextResponse.redirect(loginUrl)
  }

  return response
}
