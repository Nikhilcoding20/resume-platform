import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const TO_EMAIL = 'hello@unemployedclub.com'

function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatMessageBody(text) {
  return escapeHtml(text).replace(/\r\n/g, '\n').split('\n').join('<br />')
}

function brandedEmailHtml({ title, intro, rows }) {
  const rowHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eaeaf2;font-size:14px;color:#5c5c7a;width:120px;vertical-align:top;font-weight:600;">${r.label}</td>
        <td style="padding:12px 0;border-bottom:1px solid #eaeaf2;font-size:14px;color:#1a1a2e;vertical-align:top;">${r.value}</td>
      </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eaeaf2;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#7c3aed 45%,#06b6d4 100%);padding:24px 28px;">
              <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">${title}</h1>
              ${intro ? `<p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.92);">${intro}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowHtml}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-size:12px;color:#94a3b8;">Unemployed Club · unemployedclub.com</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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
