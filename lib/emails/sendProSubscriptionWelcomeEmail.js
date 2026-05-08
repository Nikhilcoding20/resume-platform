import { Resend } from 'resend'
import { brandedEmailHtml, escapeHtml } from '@/lib/emails/branded'
import { WELCOME_EMAIL_FROM } from '@/lib/emails/sendWelcomeEmail'

export const PRO_SUBSCRIPTION_EMAIL_SUBJECT = 'Welcome to Unemployed Club Pro! 🎉'

function planDisplayName(plan) {
  if (plan === 'pro_annual') return 'Pro Annual'
  return 'Pro Monthly'
}

function dashboardUrl() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://unemployedclub.com').replace(/\/$/, '')
  return `${base}/dashboard`
}

/**
 * Sends Pro subscription confirmation after Stripe activates a paid plan.
 * @param {{ toEmail: string, plan: string, returnSoft?: boolean }} opts
 */
export async function sendProSubscriptionWelcomeEmail({ toEmail, plan, returnSoft = true }) {
  const email = typeof toEmail === 'string' ? toEmail.trim().toLowerCase() : ''
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.warn('[pro-subscription-email] invalid or missing toEmail')
    return { ok: false, error: 'invalid_email' }
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    console.warn('[pro-subscription-email] RESEND_API_KEY not set; email skipped')
    return { ok: false, skipped: true }
  }

  const planLabel = escapeHtml(planDisplayName(plan || 'pro_monthly'))

  const html = brandedEmailHtml({
    title: 'You’re on Pro',
    intro: `Thanks for upgrading — your <strong style="color:rgba(255,255,255,0.98);">${planLabel}</strong> subscription is <strong style="color:rgba(255,255,255,0.98);">active</strong>.`,
    rows: [
      {
        label: 'Plan',
        value: `${planLabel} — unlimited resumes, cover letters, and full access to Pro features.`,
      },
      {
        label: 'Status',
        value: 'Your subscription is active. You can manage billing anytime from your account.',
      },
    ],
    cta: {
      label: 'Go to your dashboard',
      href: dashboardUrl(),
    },
  })

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: WELCOME_EMAIL_FROM,
      to: [email],
      subject: PRO_SUBSCRIPTION_EMAIL_SUBJECT,
      html,
    })

    if (error) {
      console.error('[pro-subscription-email] Resend error:', error)
      if (returnSoft) return { ok: false, error: error.message }
      throw new Error(error.message)
    }

    return { ok: true, id: data?.id }
  } catch (err) {
    console.error('[pro-subscription-email]', err)
    if (returnSoft) return { ok: false, error: err?.message || 'send_failed' }
    throw err
  }
}
