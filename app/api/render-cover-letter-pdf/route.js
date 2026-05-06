import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { launchChromiumForPdf } from '@/lib/launchChromiumForPdf'
import { buildPrintableCoverLetterDocument, getCoverLetterPdfFilename } from '@/lib/coverLetterDocument'

function jsonError(message, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

function normalizeHeader(raw) {
  if (!raw || typeof raw !== 'object') {
    return { fullName: '', email: '', phone: '', linkedin: '' }
  }
  return {
    fullName: String(raw.fullName ?? '').trim(),
    email: String(raw.email ?? '').trim(),
    phone: String(raw.phone ?? '').trim(),
    linkedin: String(raw.linkedin ?? '').trim(),
  }
}

export async function POST(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonError('Server configuration error: Supabase client not initialized', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return jsonError('Unauthorized', 401)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid JSON body', 400)
    }

    const header = normalizeHeader(body.header)
    const bodyText = typeof body.bodyText === 'string' ? body.bodyText.trim() : ''

    if (!bodyText) {
      return jsonError('Cover letter body is required.', 400)
    }

    const html = buildPrintableCoverLetterDocument(header, bodyText)
    const filename = getCoverLetterPdfFilename(header.fullName)

    const browser = await launchChromiumForPdf()
    try {
      const page = await browser.newPage()
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 10000,
      })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
        scale: 0.92,
      })

      await browser.close()

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (pdfErr) {
      await browser.close()
      throw pdfErr
    }
  } catch (err) {
    console.error('[render-cover-letter-pdf] Error:', err)
    return jsonError(err.message || 'Failed to render cover letter PDF', 500)
  }
}
