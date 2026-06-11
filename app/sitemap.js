import { getAllPostSlugs } from '@/sanity/lib/fetch'

const siteUrl =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://unemployedclub.com').replace(
    /\/$/,
    ''
  )

/** @type {import('next').MetadataRoute.Sitemap} */
export default async function sitemap() {
  const now = new Date()
  const weekly = 'weekly'

  let postEntries = []
  try {
    const slugs = await getAllPostSlugs()
    postEntries = (slugs || [])
      .filter((row) => row?.slug)
      .map((row) => ({
        url: `${siteUrl}/blog/${row.slug}`,
        lastModified: now,
        changeFrequency: weekly,
        priority: 0.7,
      }))
  } catch {
    postEntries = []
  }

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: weekly, priority: 1 },
    {
      url: `${siteUrl}/blog`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.85,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/resume-builder`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/ats-checker`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/cover-letter-generator`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/interview-prep`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.6,
    },
    {
      url: `${siteUrl}/signup`,
      lastModified: now,
      changeFrequency: weekly,
      priority: 0.6,
    },
    ...postEntries,
  ]
}
