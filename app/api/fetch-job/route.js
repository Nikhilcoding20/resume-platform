import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

const JOB_SELECTORS = [
  '[data-job-details]',
  '.jobs-description__content',
  '.job-view-layout',
  '.jobsearch-JobComponent-description',
  '#jobDescriptionText',
  '.jobsearch-jobDescriptionText',
  '.jobDescriptionContent',
  '.css-1vg6q84',
  '.job-description',
  '.job-details',
  '.job-description-container',
  '[class*="job-description"]',
  '[class*="JobDescription"]',
  'main',
  'article',
  '[role="main"]',
]

const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'nav',
  'header',
  'footer',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '.ad',
  '.ads',
  '[class*="ad-"]',
  '[id*="ad-"]',
  '.sidebar',
  '.cookie-banner',
  '[class*="cookie"]',
  '.modal',
  '[aria-hidden="true"]',
]

function extractText($, el) {
  if (!el || el.length === 0) return ''
  const text = $(el)
    .clone()
    .find(REMOVE_SELECTORS.join(', '))
    .remove()
    .end()
    .text()
  return text.replace(/\s+/g, ' ').trim()
}

function extractJobDescription($) {
  for (const sel of JOB_SELECTORS) {
    try {
      const el = $(sel).first()
      if (el.length) {
        const text = extractText($, el)
        if (text && text.length > 100) {
          return text
        }
      }
    } catch {
      continue
    }
  }

  const body = $('body')
  body.find(REMOVE_SELECTORS.join(', ')).remove()
  const text = body.text().replace(/\s+/g, ' ').trim()
  if (text.length > 100) return text

  return ''
}

export async function POST(request) {
  try {
    const body = await request.json()
    const url = body.url?.toString()?.trim()

    if (!url) {
      return jsonError('URL is required', 400)
    }

    let parsedUrl
    try {
      parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return jsonError('Invalid URL protocol. Use http or https.', 400)
      }
    } catch {
      return jsonError('Invalid URL format', 400)
    }

    let response
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      })
    } catch (err) {
      if (err.name === 'TimeoutError') {
        return jsonError('Request timed out. The page took too long to load.', 408)
      }
      return jsonError(
        err.message || 'Could not fetch the URL. The site may block automated requests.',
        422
      )
    }

    if (!response.ok) {
      return jsonError(
        `Could not fetch page (HTTP ${response.status}). The URL may be invalid or the page may require login.`,
        422
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const jobText = extractJobDescription($)

    if (!jobText || jobText.length < 50) {
      return jsonError(
        'Could not extract job description from this page. The page may use JavaScript to load content, or the format is not supported.',
        422
      )
    }

    return NextResponse.json({ text: jobText })
  } catch (err) {
    console.error('[fetch-job] Error:', err)
    return jsonError(err.message || 'Failed to fetch job description', 500)
  }
}
