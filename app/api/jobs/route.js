import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isPro } from '@/lib/subscription'

const JSEARCH_URL = 'https://jsearch.p.rapidapi.com/search'
const RAPID_HOST = 'jsearch.p.rapidapi.com'

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

function stripTags(html) {
  if (html == null || typeof html !== 'string') return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function simplifyJob(raw) {
  if (!raw || typeof raw !== 'object') return null
  const locParts = [raw.job_city, raw.job_state, raw.job_country].filter(Boolean)
  const location = locParts.length ? locParts.join(', ') : 'Location not listed'
  const type = raw.job_employment_type || '—'
  const desc = stripTags(raw.job_description || '')
  const snippet =
    desc.length > 220 ? `${desc.slice(0, 217).trim()}…` : desc
  return {
    id: raw.job_id,
    company: raw.employer_name || 'Company',
    title: raw.job_title || 'Role',
    location,
    jobCountry: raw.job_country || null,
    type,
    jobIsRemote: Boolean(raw.job_is_remote),
    postedAt: raw.job_posted_at_datetime_utc || null,
    postedTimestamp: raw.job_posted_at_timestamp ?? null,
    snippet: snippet || 'No description available.',
    applyUrl: raw.job_apply_link || raw.job_google_link || '',
    description: desc,
  }
}

/**
 * GET /api/jobs
 * Query: query, location, page, jobType, datePosted, country
 * Requires Authorization: Bearer (Supabase access token). Pro users get full results and pagination. Free users get page 1 only (no hasMore); the client shows the first two listings unlocked and blurs the rest.
 * Requires RAPIDAPI_KEY (RapidAPI app key with JSearch subscribed).
 */
export async function GET(request) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
  if (!token) {
    return jsonError('Authorization Bearer token required.', 401)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabaseAuth = createClient(supabaseUrl, anon)
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token)

  if (authError || !user) {
    return jsonError(authError?.message || 'Invalid session.', 401)
  }

  const supabaseRls = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const userIsPro = await isPro(supabaseRls, user.id)

  const key = process.env.RAPIDAPI_KEY
  if (!key?.trim()) {
    return jsonError('Jobs search is not configured. Add RAPIDAPI_KEY to your environment.', 503)
  }

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('query') || '').trim()
  if (!query) {
    return jsonError('Search query is required', 400)
  }

  const location = (searchParams.get('location') || '').trim()
  const page = Math.max(1, Math.min(100, parseInt(searchParams.get('page') || '1', 10) || 1))

  if (!userIsPro && page > 1) {
    return NextResponse.json({ jobs: [], page, hasMore: false })
  }
  const jobType = (searchParams.get('jobType') || 'any').toLowerCase()
  const datePosted = (searchParams.get('datePosted') || 'any').toLowerCase()
  const country = (searchParams.get('country') || 'any').toUpperCase()

  const params = new URLSearchParams()
  params.set('query', query)
  params.set('page', String(page))
  params.set('num_pages', '1')

  if (location) params.set('location', location)

  if (country && country !== 'ANY') {
    params.set('country', country)
  }

  const dateMap = {
    any: 'all',
    today: 'today',
    week: 'week',
    month: 'month',
  }
  const datePostedApi = dateMap[datePosted] || 'all'
  if (datePostedApi !== 'all') {
    params.set('date_posted', datePostedApi)
  }

  if (jobType === 'remote') {
    params.set('remote_jobs_only', 'true')
  } else {
    params.set('remote_jobs_only', 'false')
    const typeMap = {
      fulltime: 'FULLTIME',
      parttime: 'PARTTIME',
      contract: 'CONTRACTOR',
    }
    const et = typeMap[jobType]
    if (et) params.set('employment_types', et)
  }

  const url = `${JSEARCH_URL}?${params.toString()}`

  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': key.trim(),
        'X-RapidAPI-Host': RAPID_HOST,
      },
      cache: 'no-store',
    })
  } catch (e) {
    console.error('[api/jobs] fetch error', e)
    return jsonError('Could not reach jobs provider', 502)
  }

  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return jsonError('Invalid response from jobs provider', 502)
  }

  if (!response.ok) {
    const msg =
      body?.message ||
      body?.error?.message ||
      `Jobs provider error (${response.status})`
    return jsonError(msg, response.status >= 400 && response.status < 600 ? response.status : 502)
  }

  if (body.status === 'ERROR') {
    return jsonError(body.error?.message || 'Jobs search failed', 400)
  }

  const rawList = Array.isArray(body.data) ? body.data : []
  const jobs = rawList.map(simplifyJob).filter(Boolean)
  const pageSize = 10
  let hasMore = jobs.length >= pageSize
  if (!userIsPro) {
    hasMore = false
  }

  return NextResponse.json({ jobs, page, hasMore })
}
