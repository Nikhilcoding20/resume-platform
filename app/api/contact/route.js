import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { brandedEmailHtml, escapeHtml } from '@/lib/emails/branded'

const TO_EMAIL = 'hello@unemployedclub.com'

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function formatMessageBody(text) {
  return escapeHtml(text).replace(/\r\n/g, '\n').split('\n').join('<br />')
}

export async function POST(request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey?.trim()) {
    return jsonError('Email is not configured.', 503)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body.', 400)
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!name || name.length > 200) return jsonError('Please enter your name (max 200 characters).', 400)
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('Please enter a valid email address.', 400)
  if (!subject || subject.length > 300) return jsonError('Please enter a subject (max 300 characters).', 400)
  if (!message || message.length > 10000) return jsonError('Please enter a message (max 10,000 characters).', 400)

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev'

  const resend = new Resend(apiKey)

  const internalHtml = brandedEmailHtml({
    title: 'New contact message',
    intro: 'Someone submitted the contact form on unemployedclub.com.',
    rows: [
      { label: 'Name', value: escapeHtml(name) },
      { label: 'Email', value: `<a href="mailto:${escapeHtml(email)}" style="color:#6366f1;">${escapeHtml(email)}</a>` },
      { label: 'Subject', value: escapeHtml(subject) },
      { label: 'Message', value: formatMessageBody(message) },
    ],
  })

  const confirmationHtml = brandedEmailHtml({
    title: 'We got your message',
    intro: 'Thanks for reaching out to Unemployed Club.',
    rows: [
      {
        label: 'What’s next',
        value:
          'We received your message and will get back to you within 24 hours. If your question is urgent, you can also reply to this email.',
      },
      { label: 'Your subject', value: escapeHtml(subject) },
    ],
  })

  try {
    const [toTeam, toUser] = await Promise.all([
      resend.emails.send({
        from,
        to: [TO_EMAIL],
        replyTo: email,
        subject: `New Contact Form Submission: ${subject}`,
        html: internalHtml,
      }),
      resend.emails.send({
        from,
        to: [email],
        subject: 'We received your message — Unemployed Club',
        html: confirmationHtml,
      }),
    ])

    if (toTeam.error) {
      console.error('[contact] Resend team email error:', toTeam.error)
      return jsonError(toTeam.error.message || 'Failed to send message.', 502)
    }
    if (toUser.error) {
      console.error('[contact] Resend confirmation error:', toUser.error)
      return jsonError(toUser.error.message || 'Failed to send confirmation email.', 502)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact]', err)
    return jsonError(err?.message || 'Something went wrong sending your message.', 500)
  }
}
