import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/createRouteHandlerClient'

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
  const nextParam = requestUrl.searchParams.get('next')
  const redirectPath = safeNextPath(nextParam)

  if (code) {
    const supabase = await createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(redirectPath, request.url))
}
