import { Resend } from 'resend'
import { brandedEmailHtml, escapeHtml } from '@/lib/emails/branded'

export const WELCOME_EMAIL_FROM = 'hello@unemployedclub.com'
export const WELCOME_EMAIL_SUBJECT = 'Welcome to Unemployed Club 🎉'

/**
 * Sends the post-signup welcome email. Safe to call from route handlers; failures are logged, not thrown, when returnSoft is true.
 * @param {{ toEmail: string, displayName?: string | null, returnSoft?: boolean }} opts
 * @returns {Promise<{ ok: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendWelcomeEmail({ toEmail, displayName, returnSoft = true }) {
  const email = typeof toEmail === 'string' ? toEmail.trim().toLowerCase() : ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn('[welcome-email] invalid or missing toEmail')
    return { ok: false, error: 'invalid_email' }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn('[welcome-email] RESEND_API_KEY not set; welcome email skipped')
    return { ok: false, skipped: true }
  }

  const rawName = typeof displayName === 'string' ? displayName.trim() : ''
  const firstName = rawName ? rawName.split(/\s+/)[0] : ''
  const greetingName = firstName ? escapeHtml(firstName) : 'there'

  const html = brandedEmailHtml({
    title: 'Welcome to Unemployed Club',
    intro: `Hi ${greetingName} — we're glad you're here.`,
    rows: [
      {
        label: 'Get started',
        value:
          'Open your dashboard to build or upload a resume, run the ATS checker, and explore job-specific tools.',
      },
      {
        label: 'Need help?',
        value:
          'Reply to this email or use the contact form on unemployedclub.com — we read every message.',
      },
    ],
  })

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: WELCOME_EMAIL_FROM,
      to: [email],
      subject: WELCOME_EMAIL_SUBJECT,
      html,
    })

    if (error) {
      console.error('[welcome-email] Resend error:', error)
      if (returnSoft) return { ok: false, error: error.message }
      throw new Error(error.message)
    }

    return { ok: true, id: data?.id }
  } catch (err) {
    console.error('[welcome-email]', err)
    if (returnSoft) return { ok: false, error: err?.message || 'send_failed' }
    throw err
  }
}
