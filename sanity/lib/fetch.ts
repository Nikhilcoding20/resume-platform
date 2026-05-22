import { client, serverClient } from './client'
import {
  getAllPostsQuery,
  getAllPostSlugsQuery,
  getFeaturedPostQuery,
  getPostBySlugQuery,
  getPostsByCategoryQuery,
  getRelatedPostsQuery,
} from './queries'

const fetchClient = process.env.SANITY_API_TOKEN ? serverClient : client

export async function getAllPosts() {
  return fetchClient.fetch(getAllPostsQuery)
}

export async function getFeaturedPost() {
  return fetchClient.fetch(getFeaturedPostQuery)
}

export async function getPostBySlug(slug: string) {
  return fetchClient.fetch(getPostBySlugQuery, { slug })
}

export async function getPostsByCategory(categorySlug: string) {
  return fetchClient.fetch(getPostsByCategoryQuery, { categorySlug })
}

export async function getRelatedPosts(slug: string, categorySlug: string) {
  return fetchClient.fetch(getRelatedPostsQuery, { slug, categorySlug })
}

export async function getAllPostSlugs() {
  return fetchClient.fetch<{ slug: string }[]>(getAllPostSlugsQuery)
}
