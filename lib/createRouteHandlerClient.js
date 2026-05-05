import { createServerClient } from '@supabase/auth-helpers-nextjs'

/**
 * App Router OAuth / PKCE helper: same role as the old `createRouteHandlerClient({ cookies })`.
 * `@supabase/auth-helpers-nextjs` v0.15+ only exports `createServerClient`; this wraps it with
 * the `cookies()` adapter from `next/headers` so `exchangeCodeForSession` persists the session.
 *
 * @param {{ cookies }} options — `cookies` from `next/headers` (call `createRouteHandlerClient({ cookies })`).
 */
export async function createRouteHandlerClient({ cookies: getCookies }) {
  const cookieStore = await getCookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          console.error('[createRouteHandlerClient] cookies.setAll failed', e)
        }
      },
    },
  })
}
