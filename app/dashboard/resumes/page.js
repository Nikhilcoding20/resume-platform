'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function formatCardDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatTemplateLabel(template) {
  if (!template || typeof template !== 'string') return 'Default'
  const t = template.trim()
  if (!t) return 'Default'
  return t
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ResumesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const fetchResumes = useCallback(async (userId) => {
    setLoadError(null)
    const { data, error } = await supabase
      .from('generated_resumes')
      .select('id, user_id, template, job_title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      setLoadError(error.message || 'Could not load resumes.')
      setResumes([])
    } else {
      setResumes(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (cancelled) return
      if (!u) {
        router.replace('/login')
        return
      }
      setUser(u)
      fetchResumes(u.id)
    })
    return () => {
      cancelled = true
    }
  }, [router, fetchResumes])

  async function handleDelete(row) {
    const ok = window.confirm(
      `Delete this resume for "${row.job_title || 'this role'}"? This cannot be undone.`
    )
    if (!ok) return

    setDeletingId(row.id)
    try {
      const { error: delErr } = await supabase.from('generated_resumes').delete().eq('id', row.id)
      if (delErr) throw delErr

      setResumes((prev) => prev.filter((r) => r.id !== row.id))
    } catch (e) {
      window.alert(e.message || 'Could not delete resume.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[#5c5c7a]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="relative mx-auto max-w-5xl min-w-0">
      <div className="mb-2 h-1 w-24 rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4]" />
      <h1 className="mb-2 text-2xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-3xl">
        <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">My Resumes</span>
      </h1>
      <p className="mb-8 text-sm text-[#5c5c7a]">
        Every AI resume you generate is listed here. Open the generator anytime to create a fresh PDF.
      </p>

      {loadError && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-[#5c5c7a]">Loading your resumes...</p>
        </div>
      ) : resumes.length === 0 ? (
        <div className="rounded-2xl border border-[#eaeaf2] bg-white px-6 py-16 text-center shadow-[0_8px_40px_-12px_rgba(99,102,241,0.12)] sm:px-10">
          <span className="text-5xl" role="img" aria-hidden>
            📄
          </span>
          <h2 className="mt-6 text-xl font-bold text-[#1a1a2e] sm:text-2xl">No resumes yet</h2>
          <p className="mx-auto mt-3 max-w-md text-[#5c5c7a]">
            Generate your first AI resume and it will appear here
          </p>
          <Link
            href="/dashboard/start"
            className="mt-8 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_28px_-6px_rgba(99,102,241,0.45)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-6px_rgba(99,102,241,0.55)]"
          >
            Build My First Resume <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
          {resumes.map((row) => (
            <div
              key={row.id}
              className="relative overflow-hidden rounded-2xl border border-[#eaeaf2] bg-white p-6 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.1)] transition-shadow hover:shadow-[0_12px_48px_-12px_rgba(99,102,241,0.15)]"
            >
              <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4]" />
              <h3 className="mt-2 line-clamp-2 text-lg font-bold text-[#1a1a2e]">
                {row.job_title || 'Tailored resume'}
              </h3>
              <p className="mt-2 text-sm text-[#5c5c7a]">
                <span className="font-semibold text-[#6366f1]">Template:</span>{' '}
                {formatTemplateLabel(row.template)}
              </p>
              <p className="mt-1 text-sm text-[#5c5c7a]">
                <span className="font-semibold text-[#06b6d4]">Generated:</span> {formatCardDate(row.created_at)}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/generating"
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#06b6d4] px-4 py-2.5 text-center text-sm font-bold text-white shadow-md transition-[transform,opacity] hover:opacity-95 hover:shadow-lg"
                >
                  Download <span aria-hidden>→</span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  disabled={deletingId === row.id}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-[#eaeaf2] bg-white px-4 py-2.5 text-sm font-bold text-[#5c5c7a] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                >
                  {deletingId === row.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
