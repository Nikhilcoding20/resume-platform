export default function sitemap() {
  return [
    { url: 'https://unemployedclub.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://unemployedclub.com/pricing', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://unemployedclub.com/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://unemployedclub.com/contact', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://unemployedclub.com/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://unemployedclub.com/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
