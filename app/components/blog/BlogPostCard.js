import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '@/sanity/lib/image'
import { formatPostDate } from '@/sanity/lib/format'

export default function BlogPostCard({ post, featured = false }) {
  const imageUrl = post.mainImage
    ? urlFor(post.mainImage).width(featured ? 1200 : 600).height(featured ? 630 : 360).url()
    : null
  const alt = post.mainImage?.alt || post.title

  return (
    <article
      className={
        featured
          ? 'overflow-hidden rounded-2xl border border-[#eaeaf2] bg-white shadow-[0_12px_40px_-16px_rgba(99,102,241,0.2)]'
          : 'flex h-full flex-col overflow-hidden rounded-2xl border border-[#eaeaf2] bg-white shadow-[0_8px_34px_-12px_rgba(99,102,241,0.14)] transition-shadow hover:shadow-[0_12px_40px_-12px_rgba(99,102,241,0.18)]'
      }
    >
      <Link href={`/blog/${post.slug.current}`} className="block">
        {imageUrl ? (
          <div className={featured ? 'relative aspect-[21/9] w-full' : 'relative aspect-[16/10] w-full'}>
            <Image
              src={imageUrl}
              alt={alt}
              fill
              className="object-cover"
              sizes={featured ? '(max-width: 1024px) 100vw, 1200px' : '(max-width: 768px) 100vw, 400px'}
              priority={featured}
            />
          </div>
        ) : (
          <div
            className={`bg-gradient-to-br from-[#6366f1]/20 to-[#06b6d4]/20 ${featured ? 'aspect-[21/9]' : 'aspect-[16/10]'}`}
          />
        )}
      </Link>
      <div className={featured ? 'p-6 sm:p-8' : 'flex flex-1 flex-col p-5'}>
        {post.category?.title && (
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-wide text-[#6366f1]">
            {post.category.title}
          </span>
        )}
        <h2 className={featured ? 'text-2xl font-extrabold text-[#1a1a2e] sm:text-3xl' : 'text-lg font-bold text-[#1a1a2e]'}>
          <Link href={`/blog/${post.slug.current}`} className="hover:text-[#6366f1] transition-colors">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className={`mt-2 text-[#5c5c7a] ${featured ? 'text-base sm:text-lg' : 'text-sm line-clamp-3'}`}>
            {post.excerpt}
          </p>
        )}
        <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5c5c7a]">
          {post.author?.name && <span className="font-medium text-[#1a1a2e]">{post.author.name}</span>}
          {post.publishedAt && <span>{formatPostDate(post.publishedAt)}</span>}
          {post.readTime && <span>{post.readTime}</span>}
        </div>
      </div>
    </article>
  )
}
