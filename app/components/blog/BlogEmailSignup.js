'use client'

import { useState } from 'react'

export default function BlogEmailSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/blog-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setStatus('success')
      setMessage('Thanks — you’re on the list!')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Could not subscribe. Try again.')
    }
  }

  return (
    <section className="rounded-2xl border border-[#eaeaf2] bg-[#f8f7ff] px-6 py-10 sm:px-10 sm:py-12">
      <h2 className="text-center text-xl font-extrabold text-[#1a1a2e] sm:text-2xl">
        Get career tips in your inbox
      </h2>
      <p className="mx-auto mt-2 max-w-md text-center text-sm text-[#5c5c7a] sm:text-base">
        Weekly resume, ATS, and interview advice — no spam.
      </p>
      <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="min-h-11 flex-1 rounded-xl border border-[#eaeaf2] bg-white px-4 text-sm text-[#1a1a2e] focus:outline-none focus:ring-2 focus:ring-[#6366f1]/25"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="min-h-11 shrink-0 rounded-xl px-6 py-2.5 text-sm font-semibold text-white btn-gradient ds-btn-glow disabled:opacity-60"
        >
          {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-center text-sm ${status === 'error' ? 'text-red-600' : 'text-[#6366f1]'}`}
          role="status"
        >
          {message}
        </p>
      )}
    </section>
  )
}
