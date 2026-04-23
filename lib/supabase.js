import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      // PKCE matches Supabase OAuth; implicit flow omits code_challenge and can break provider redirects.
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
    },
  }
)
