export const postListFields = `
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  readTime,
  mainImage,
  author->{ name, image },
  category->{ title, slug }
`

export const getAllPostsQuery = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
    ${postListFields}
  }
`

export const getFeaturedPostQuery = `
  *[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0] {
    ${postListFields}
  }
`

export const getPostBySlugQuery = `
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    excerpt,
    publishedAt,
    readTime,
    mainImage,
    body,
    seoTitle,
    seoDescription,
    author->{ name, image, bio },
    category->{ title, slug }
  }
`

export const getPostsByCategoryQuery = `
  *[_type == "post" && defined(slug.current) && category->slug.current == $categorySlug] | order(publishedAt desc) {
    ${postListFields}
  }
`

export const getRelatedPostsQuery = `
  *[_type == "post" && defined(slug.current) && slug.current != $slug && category->slug.current == $categorySlug] | order(publishedAt desc)[0...3] {
    ${postListFields}
  }
`

export const getAllPostSlugsQuery = `
  *[_type == "post" && defined(slug.current)]{ "slug": slug.current }
`

export {
  getAllPosts,
  getFeaturedPost,
  getPostBySlug,
  getPostsByCategory,
  getRelatedPosts,
  getAllPostSlugs,
} from './fetch'
