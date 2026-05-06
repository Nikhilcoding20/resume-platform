import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client. Uses `createBrowserClient` from `@supabase/ssr` so PKCE and session
 * align with the server `createServerClient` (cookies / storage behavior).
 */
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
    },
  },
)
