import Image from 'next/image'
import { PortableText } from '@portabletext/react'
import { urlFor } from '@/sanity/lib/image'
import { slugifyHeading } from '@/sanity/lib/format'

const components = {
  block: {
    h2: ({ children, value }) => {
      const id = slugifyHeading(
        value?.children?.map((c) => c.text).join('') || String(children)
      )
      return (
        <h2 id={id} className="mt-10 mb-4 scroll-mt-24 text-2xl font-extrabold text-[#1a1a2e] sm:text-3xl">
          {children}
        </h2>
      )
    },
    h3: ({ children }) => (
      <h3 className="mt-8 mb-3 text-xl font-bold text-[#1a1a2e]">{children}</h3>
    ),
    normal: ({ children }) => (
      <p className="mb-4 text-base leading-relaxed text-[#5c5c7a]">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-[#6366f1] pl-4 text-[#1a1a2e] italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-4 ml-6 list-disc space-y-2 text-[#5c5c7a]">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-2 text-[#5c5c7a]">{children}</ol>
    ),
  },
  marks: {
    link: ({ value, children }) => {
      const href = value?.href || '#'
      const external = href.startsWith('http')
      return (
        <a
          href={href}
          className="font-medium text-[#6366f1] underline underline-offset-2 hover:text-[#06b6d4]"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      )
    },
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null
      const src = urlFor(value).width(900).url()
      return (
        <figure className="my-8">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl">
            <Image src={src} alt={value.alt || ''} fill className="object-cover" sizes="(max-width: 768px) 100vw, 720px" />
          </div>
          {value.alt && (
            <figcaption className="mt-2 text-center text-xs text-[#5c5c7a]">{value.alt}</figcaption>
          )}
        </figure>
      )
    },
  },
}

export default function BlogPortableText({ value }) {
  if (!value?.length) return null
  return <PortableText value={value} components={components} />
}
