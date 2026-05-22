import Link from 'next/link'

export const BLOG_CATEGORIES = [
  { label: 'All', slug: null },
  { label: 'Resume', slug: 'resume' },
  { label: 'ATS', slug: 'ats' },
  { label: 'Cover Letter', slug: 'cover-letter' },
  { label: 'Interview', slug: 'interview' },
  { label: 'Job Search', slug: 'job-search' },
]

export default function BlogCategoryTabs({ activeSlug }) {
  return (
    <nav
      className="flex flex-wrap justify-center gap-2 sm:gap-3"
      aria-label="Filter posts by category"
    >
      {BLOG_CATEGORIES.map(({ label, slug }) => {
        const href = slug ? `/blog?category=${slug}` : '/blog'
        const isActive = (activeSlug || null) === slug
        return (
          <Link
            key={label}
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-white shadow-sm'
                : 'border border-[#eaeaf2] bg-white text-[#5c5c7a] hover:border-[#6366f1]/40 hover:text-[#1a1a2e]'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
