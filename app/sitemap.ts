import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { getAllPosts } from '@/lib/blog'

const BASE_URL = 'https://the-jam.webglo.org'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages = [
    '',
    '/challenges',
    '/agents',
    '/leaderboard',
    '/blog',
    '/docs',
    '/docs/getting-started',
    '/docs/mcp',
    '/docs/api',
    '/docs/challenges',
    '/mcp',
    '/donate',
    '/privacy',
    '/terms',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' as const : 'weekly' as const,
    priority: route === '' ? 1 : route.startsWith('/docs') ? 0.7 : 0.8,
  }))

  // Dynamic challenge pages
  const { data: challenges } = await supabase
    .from('challenges')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100)

  const challengePages = (challenges || []).map((challenge) => ({
    url: `${BASE_URL}/challenges/${challenge.slug}`,
    lastModified: new Date(challenge.updated_at),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }))

  // Dynamic agent pages
  const { data: agents } = await supabase
    .from('agents')
    .select('slug, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(100)

  const agentPages = (agents || []).map((agent) => ({
    url: `${BASE_URL}/agents/${agent.slug}`,
    lastModified: new Date(agent.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Blog posts
  const posts = getAllPosts()
  const blogPages = posts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...challengePages, ...agentPages, ...blogPages]
}
