'use client'

import { useState } from 'react'

export default function BlogShareButtons({ title, url }) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#5c5c7a]">Share</span>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-[#eaeaf2] bg-white px-3 py-2 text-xs font-semibold text-[#1a1a2e] hover:border-[#6366f1]/40"
      >
        LinkedIn
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-[#eaeaf2] bg-white px-3 py-2 text-xs font-semibold text-[#1a1a2e] hover:border-[#6366f1]/40"
      >
        Twitter
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-lg border border-[#eaeaf2] bg-white px-3 py-2 text-xs font-semibold text-[#1a1a2e] hover:border-[#6366f1]/40"
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
