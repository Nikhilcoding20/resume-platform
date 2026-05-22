import Link from 'next/link'
import PublicOrDashboardHeader from '@/app/components/PublicOrDashboardHeader'
import BlogCategoryTabs from '@/app/components/blog/BlogCategoryTabs'
import BlogEmailSignup from '@/app/components/blog/BlogEmailSignup'
import BlogPostCard from '@/app/components/blog/BlogPostCard'
import { getAllPosts, getFeaturedPost, getPostsByCategory } from '@/sanity/lib/fetch'

export const metadata = {
  title: 'Career Advice & Job Search Tips | Unemployed Club Blog',
  description:
    'Expert career advice, resume tips, interview prep and job search strategies to help you land your dream job faster.',
  alternates: {
    canonical: 'https://www.unemployedclub.com/blog',
  },
}

export const revalidate = 60

export default async function BlogPage({ searchParams }) {
  const category = (await searchParams)?.category || null
  const featured = await getFeaturedPost()
  let posts = category ? await getPostsByCategory(category) : await getAllPosts()

  if (featured?._id) {
    posts = posts.filter((p) => p._id !== featured._id)
  }

  return (
    <div className="min-h-screen bg-white text-[#1a1a2e]">
      <PublicOrDashboardHeader />

      <section className="relative overflow-hidden border-b border-[#eaeaf2] bg-[#f8f7ff] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="pointer-events-none absolute inset-0 landing-hero-dots opacity-50" aria-hidden />
        <div className="relative z-[1] mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#6366f1] shadow-sm ring-1 ring-[#6366f1]/10">
            Blog
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1a1a2e] sm:text-4xl lg:text-5xl">
            Career Advice That Actually Works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#5c5c7a] sm:text-lg">
            Resume tips, ATS strategies, interview prep, and job search guidance from the Unemployed Club team.
          </p>
        </div>
      </section>

      <section className="sticky top-14 z-40 border-b border-[#eaeaf2] bg-white/95 px-4 py-4 backdrop-blur-md sm:top-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <BlogCategoryTabs activeSlug={category} />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {!category && featured && (
          <div className="mb-12">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#6366f1]">Featured</p>
            <BlogPostCard post={featured} featured />
          </div>
        )}

        {posts.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogPostCard key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#eaeaf2] bg-[#f8f7ff] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-[#1a1a2e]">No posts yet</p>
            <p className="mt-2 text-sm text-[#5c5c7a]">
              {category
                ? 'No articles in this category. Try another filter or check back soon.'
                : 'Publish your first post in Sanity Studio.'}
            </p>
            <Link
              href="/studio"
              className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl btn-gradient px-5 py-2.5 text-sm font-semibold text-white"
            >
              Open Studio →
            </Link>
          </div>
        )}

        <div className="mt-16">
          <BlogEmailSignup />
        </div>
      </div>
    </div>
  )
}
