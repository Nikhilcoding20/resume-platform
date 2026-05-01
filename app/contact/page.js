'use client'

import { useState } from 'react'
import PublicOrDashboardHeader from '@/app/components/PublicOrDashboardHeader'

const initial = { name: '', email: '', subject: '', message: '' }

export default function ContactPage() {
  const [form, setForm] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (error) setError('')
    if (success) setSuccess(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.')
        return
      }
      setSuccess(true)
      setForm(initial)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicOrDashboardHeader />

      <section className="bg-[#f8f7ff] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <span className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6366f1] shadow-sm ring-1 ring-[#6366f1]/10">
            GET IN TOUCH
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-5xl">
            We&apos;d love to{' '}
            <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">hear from you</span>
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base text-[#5c5c7a] sm:text-lg">
            Have a question, a suggestion, or just want to say hi? We read every message and reply within 24 hours.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_10px_36px_-12px_rgba(99,102,241,0.18)] sm:p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-[#1a1a2e]">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-[#eaeaf2] bg-white px-4 py-3 text-[#1a1a2e] outline-none transition-all placeholder:text-[#9ca3af] focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 disabled:opacity-60"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#1a1a2e]">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-[#eaeaf2] bg-white px-4 py-3 text-[#1a1a2e] outline-none transition-all placeholder:text-[#9ca3af] focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 disabled:opacity-60"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="mb-2 block text-sm font-semibold text-[#1a1a2e]">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={form.subject}
                  onChange={(e) => update('subject', e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-[#eaeaf2] bg-white px-4 py-3 text-[#1a1a2e] outline-none transition-all placeholder:text-[#9ca3af] focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 disabled:opacity-60"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-semibold text-[#1a1a2e]">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  disabled={loading}
                  className="w-full resize-y rounded-xl border border-[#eaeaf2] bg-white px-4 py-3 text-[#1a1a2e] outline-none transition-all placeholder:text-[#9ca3af] focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1]/20 disabled:opacity-60"
                  placeholder="Write your message..."
                />
              </div>

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">✓</span>
                    Message sent! We&apos;ll get back to you within 24 hours.
                  </span>
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_-10px_rgba(99,102,241,0.5)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(99,102,241,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message <span aria-hidden>→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-6 py-12 text-center shadow-[0_20px_40px_-20px_rgba(99,102,241,0.5)] sm:px-10">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Prefer to email directly?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/90">
            Reach us anytime at hello@unemployedclub.com
          </p>
          <a
            href="mailto:hello@unemployedclub.com"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/70 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            hello@unemployedclub.com
          </a>
        </div>
      </section>
    </div>
  )
}
