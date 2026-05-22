import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicOrDashboardHeader from '@/app/components/PublicOrDashboardHeader'
import BlogPortableText from '@/app/components/blog/BlogPortableText'
import BlogPostCard from '@/app/components/blog/BlogPostCard'
import BlogShareButtons from '@/app/components/blog/BlogShareButtons'
import ReadingProgressBar from '@/app/components/blog/ReadingProgressBar'
import { getH2Headings, formatPostDate } from '@/sanity/lib/format'
import { getPostBySlug, getRelatedPosts } from '@/sanity/lib/fetch'
import { urlFor } from '@/sanity/lib/image'

const siteUrl = 'https://www.unemployedclub.com'

export const revalidate = 60

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Post not found' }

  const title = post.seoTitle || post.title
  const description = post.seoDescription || post.excerpt || ''

  return {
    title: `${title} | Unemployed Club Blog`,
    description,
    alternates: {
      canonical: `${siteUrl}/blog/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt,
      images: post.mainImage
        ? [{ url: urlFor(post.mainImage).width(1200).height(630).url() }]
        : undefined,
    },
  }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  const categorySlug = post.category?.slug?.current
  const related = categorySlug
    ? await getRelatedPosts(slug, categorySlug)
    : []

  const headings = getH2Headings(post.body)
  const postUrl = `${siteUrl}/blog/${slug}`
  const heroUrl = post.mainImage
    ? urlFor(post.mainImage).width(1400).height(720).url()
    : null

  return (
    <div className="min-h-screen bg-white text-[#1a1a2e]">
      <ReadingProgressBar />
      <PublicOrDashboardHeader />

      <article className="pb-16 pt-8 lg:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto max-w-3xl text-center lg:max-w-4xl">
          {post.category?.title && (
            <Link
              href={
                post.category.slug?.current
                  ? `/blog?category=${post.category.slug.current}`
                  : '/blog'
              }
              className="text-xs font-bold uppercase tracking-wide text-[#6366f1] hover:underline"
            >
              {post.category.title}
            </Link>
          )}
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[#1a1a2e] sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[#5c5c7a]">
            {post.author?.name && (
              <span className="font-semibold text-[#1a1a2e]">{post.author.name}</span>
            )}
            {post.publishedAt && <time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time>}
            {post.readTime && <span>{post.readTime}</span>}
          </div>
          <div className="mt-6 flex justify-center">
            <BlogShareButtons title={post.title} url={postUrl} />
          </div>
        </header>
        </div>

        {heroUrl && (
          <div className="relative mt-10 h-[400px] w-full overflow-hidden">
            <Image
              src={heroUrl}
              alt={post.mainImage?.alt || post.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          </div>
        )}

        <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12 xl:gap-16">
          <div className="min-w-0">
            {post.excerpt && (
              <p className="mb-8 text-lg font-medium leading-relaxed text-[#1a1a2e]">{post.excerpt}</p>
            )}
            <BlogPortableText value={post.body} showInlineCta />
          </div>

          {headings.length > 0 && (
            <aside className="hidden lg:block">
              <nav
                className="sticky top-24 rounded-xl border border-[#eaeaf2] bg-[#f8f7ff] p-5"
                aria-label="Table of contents"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-[#6366f1]">On this page</p>
                <ul className="mt-3 space-y-2">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className="text-sm text-[#5c5c7a] hover:text-[#6366f1] transition-colors line-clamp-2"
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}
          </div>

          {related.length > 0 && (
            <section className="mt-20 border-t border-[#eaeaf2] pt-14">
              <h2 className="mb-8 text-2xl font-extrabold text-[#1a1a2e]">Related articles</h2>
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                {related.map((p) => (
                  <BlogPostCard key={p._id} post={p} />
                ))}
              </div>
            </section>
          )}

          <section
            className="mx-auto mt-16 flex max-w-3xl flex-col items-center overflow-hidden rounded-3xl px-6 py-10 text-center sm:px-10"
            style={{
              background:
                'linear-gradient(128deg, #6366f1 0%, #4f46e5 32%, #6d28d9 52%, #0e7490 78%, #06b6d4 100%)',
              boxShadow: '0 28px 60px rgba(99, 102, 241, 0.35)',
            }}
          >
            <h2 className="text-xl font-extrabold text-white sm:text-2xl">Build Your Resume Free</h2>
            <p className="mt-2 max-w-md text-sm text-white/90">
              Turn what you learned into an ATS-ready resume in minutes.
            </p>
            <Link
              href="/dashboard/start"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-[#6366f1] shadow-lg hover:-translate-y-0.5 transition-transform"
            >
              Get started →
            </Link>
          </section>
        </div>
      </article>
    </div>
  )
}
