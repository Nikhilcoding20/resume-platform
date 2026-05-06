import { createServerClient } from '@supabase/ssr'

/**
 * App Router route handlers + OAuth PKCE: `createServerClient` from `@supabase/ssr` with `cookies()`
 * from `next/headers` (`getAll` / `setAll`). Use so `exchangeCodeForSession` can write the session cookies.
 *
 * @param {{ cookies }} options — `cookies` from `next/headers` (pass the function: `createRouteHandlerClient({ cookies })`).
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
