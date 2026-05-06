import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/createRouteHandlerClient'

export const dynamic = 'force-dynamic'

const LOG = '[CALLBACK]'

function safeNextPath(next) {
  if (next == null || typeof next !== 'string') return '/dashboard'
  const t = next.trim()
  if (!t.startsWith('/') || t.startsWith('//')) return '/dashboard'
  return t
}

/** Redact token-like strings for logs; keeps shape of data/session visible. */
function redactForLog(value, depth = 0) {
  if (depth > 10) return '[MaxDepth]'
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

function serializeExchangeResult(result) {
  if (!result) return null
  const err = result.error
  return {
    data: result.data != null ? redactForLog(result.data) : null,
    error:
      err == null
        ? null
        : {
            message: err.message,
            name: err.name,
            status: err.status,
            stack: err.stack,
            ...('code' in err ? { code: err.code } : {}),
          },
  }
}

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const redirectPath = safeNextPath(nextParam)

  console.log(`${LOG} full request URL:`, request.url)
  console.log(`${LOG} ?code exists:`, Boolean(code), code ? `(length=${code.length})` : '')

  let exchangeResult = null
  if (code) {
    const supabase = await createRouteHandlerClient({ cookies })
    exchangeResult = await supabase.auth.exchangeCodeForSession(code)
  } else {
    console.log(`${LOG} exchangeCodeForSession skipped (no code)`)
  }

  if (exchangeResult !== null) {
    console.log(
      `${LOG} exchangeCodeForSession result (data redacted where tokens):`,
      JSON.stringify(serializeExchangeResult(exchangeResult), null, 2),
    )
  }

  const session = exchangeResult?.data?.session ?? null
  const user = session?.user ?? exchangeResult?.data?.user ?? null
  console.log(`${LOG} after exchange — session exists:`, Boolean(session), '| user exists:', Boolean(user))

  const redirectHref = new URL(redirectPath, request.url).href
  console.log(`${LOG} redirecting to:`, redirectHref)

  return NextResponse.redirect(redirectHref)
}
