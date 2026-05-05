import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// createRouteHandlerClient is not exported by @supabase/auth-helpers-nextjs@0.15; createServerClient is the supported replacement.
export const dynamic = 'force-dynamic'

const LOG = '[auth/callback]'

/** Deep-clone for logs; redact obvious secrets (tokens). Still logs full shape. */
function redactForLog(value, depth = 0) {
  if (depth > 12) return '[MaxDepth]'
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redactForLog(v, depth + 1))
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    const lower = k.toLowerCase()
    if (
      (lower.includes('token') || lower.includes('secret') || lower === 'authorization') &&
      typeof v === 'string'
    ) {
      out[k] = `[REDACTED length=${v.length}]`
    } else if (typeof v === 'object' && v !== null) {
      out[k] = redactForLog(v, depth + 1)
    } else {
      out[k] = v
    }
  }
  return out
}

function summarizeCookieStore(cookieStore) {
  try {
    return cookieStore.getAll().map((c) => ({
      name: c.name,
      valueLength: c.value?.length ?? 0,
    }))
  } catch (e) {
    return { error: e?.message ?? String(e) }
  }
}

function safeNextPath(next) {
  if (next == null || typeof next !== 'string') return '/dashboard'
  const t = next.trim()
  if (!t.startsWith('/') || t.startsWith('//')) return '/dashboard'
  return t
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const fullUrl = request.url
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next') || '/dashboard'
  const next = safeNextPath(nextParam)

  console.log(`${LOG} step:1 request URL (full)`, fullUrl)

  const codeExists = Boolean(code)
  console.log(`${LOG} step:2 OAuth ?code`, {
    codeExists,
    codeLength: code ? code.length : 0,
  })

  if (!code) {
    const redirectTo = new URL('/login?error=missing_code', requestUrl.origin).href
    console.log(`${LOG} step:3a redirect (no code)`, { redirectTo })
    return NextResponse.redirect(redirectTo)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const serviceRolePresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())

  console.log(`${LOG} step:3b Supabase client config`, {
    supabaseUrlConfigured: Boolean(supabaseUrl.trim()),
    supabaseUrlHost: supabaseUrl ? new URL(supabaseUrl).host : null,
    /** OAuth / user session MUST use the anon (publishable) key here — never the service role. */
    keyUsed: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    anonKeyConfigured: Boolean(supabaseAnonKey.trim()),
    anonKeyLength: supabaseAnonKey.length,
    serviceRoleKeyPresentInEnv: serviceRolePresent,
    note: serviceRolePresent
      ? 'SERVICE_ROLE_KEY is set but this route intentionally uses anon only for exchangeCodeForSession + user cookies.'
      : 'SERVICE_ROLE_KEY not set (expected for this route).',
  })

  if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
    const redirectTo = new URL('/login?error=config', requestUrl.origin).href
    console.log(`${LOG} step:3c redirect (missing env)`, { redirectTo })
    return NextResponse.redirect(redirectTo)
  }

  const cookieStore = await cookies()
  console.log(`${LOG} step:4 cookies before exchange`, summarizeCookieStore(cookieStore))

  let setAllCalls = 0
  let setAllDetails = []

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        setAllCalls += 1
        const batch = []
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            batch.push({
              name,
              valueLength: value?.length ?? 0,
              optionKeys: options ? Object.keys(options) : [],
            })
            cookieStore.set(name, value, options)
          })
          setAllDetails.push({ batch, ok: true })
          console.log(`${LOG} step:5x cookies.setAll (Supabase storage flush)`, {
            callIndex: setAllCalls,
            cookiesInBatch: batch,
          })
        } catch (e) {
          setAllDetails.push({ batch, ok: false, error: e?.message ?? String(e) })
          console.error(`${LOG} step:5x cookies.setAll failed`, e)
        }
      },
    },
  })

  console.log(`${LOG} step:6 calling exchangeCodeForSession`)

  const exchangeResult = await supabase.auth.exchangeCodeForSession(code)
  const { data, error } = exchangeResult

  console.log(`${LOG} step:7 exchangeCodeForSession raw result`, {
    data: redactForLog(data),
    error:
      error == null
        ? null
        : {
            message: error.message,
            name: error.name,
            status: error.status,
            stack: error.stack,
            ...('code' in error ? { code: error.code } : {}),
          },
  })

  try {
    console.log(
      `${LOG} step:7b exchangeCodeForSession JSON (redacted tokens)`,
      JSON.stringify({ data: redactForLog(data), error: error ? { message: error.message, status: error.status } : null })
    )
  } catch (e) {
    console.log(`${LOG} step:7b JSON.stringify failed`, e?.message ?? e)
  }

  const session = data?.session
  const sessionExists = Boolean(session)
  console.log(`${LOG} step:8 session after exchange`, {
    sessionExists,
    userId: session?.user?.id ?? data?.user?.id ?? null,
    email: session?.user?.email ?? data?.user?.email ?? null,
    expiresAt: session?.expires_at ?? null,
  })

  console.log(`${LOG} step:9 cookies after exchange`, {
    cookieSummaries: summarizeCookieStore(cookieStore),
    setAllCallCount: setAllCalls,
    setAllDetails,
  })

  if (error) {
    const redirectTo = new URL('/login?error=oauth', requestUrl.origin).href
    console.log(`${LOG} step:10 redirect (exchange error)`, { redirectTo })
    return NextResponse.redirect(redirectTo)
  }

  if (!sessionExists) {
    const redirectTo = new URL('/login?error=oauth', requestUrl.origin).href
    console.log(`${LOG} step:10 redirect (no session)`, { redirectTo })
    return NextResponse.redirect(redirectTo)
  }

  const redirectTo = new URL(next, requestUrl.origin).href
  console.log(`${LOG} step:10 redirect (success)`, {
    redirectTo,
    nextPath: next,
    origin: requestUrl.origin,
  })

  return NextResponse.redirect(redirectTo)
}
