const siteUrl =
  (process.env.NEXT_PUBLIC_SITE_URL || 'https://unemployedclub.com').replace(
    /\/$/,
    ''
  )

/** @type {import('next').MetadataRoute.Sitemap} */
export default function sitemap() {
  const now = new Date()
  const weekly = 'weekly'

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: weekly, priority: 1 },
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
  ]
}
