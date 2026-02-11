import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts, getFeaturedPosts, BlogPostMeta } from '@/lib/blog';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function FeaturedPostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all">
        <div className="md:flex">
          {post.image && (
            <div className="md:w-1/2 relative aspect-video md:aspect-auto">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded">
                Featured
              </div>
            </div>
          )}
          <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                {post.category}
              </span>
              <span>{formatDate(post.date)}</span>
              <span>·</span>
              <span>{post.readingTime} min read</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-purple-400 transition-colors mb-3">
              {post.title}
            </h3>
            <p className="text-zinc-400 mb-4 line-clamp-2">
              {post.description}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-purple-400 group-hover:text-purple-300">
                Read more →
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function PostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all h-full">
        {post.image && (
          <div className="relative aspect-video">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded">
              {post.category}
            </span>
            <span>{formatDate(post.date)}</span>
          </div>
          <h3 className="font-bold text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-zinc-400 line-clamp-2">
            {post.description}
          </p>
        </div>
      </article>
    </Link>
  );
}

export default function HomeBlogSection() {
  const featuredPosts = getFeaturedPosts(1);
  const allPosts = getAllPosts();
  const recentPosts = allPosts
    .filter(p => !featuredPosts.find(f => f.slug === p.slug))
    .slice(0, 3);

  // Don't render if no posts
  if (allPosts.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Latest from the Blog
            </h2>
            <p className="text-zinc-400">
              Insights, tutorials, and updates from The Jam
            </p>
          </div>
          <Link
            href="/blog"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-purple-400 hover:text-white border border-purple-500/30 hover:border-purple-500 rounded-lg transition-colors"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Featured Post */}
        {featuredPosts.length > 0 && (
          <div className="mb-8">
            <FeaturedPostCard post={featuredPosts[0]} />
          </div>
        )}

        {/* Recent Posts Grid */}
        {recentPosts.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map(post => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}

        {/* Mobile View All Link */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 text-purple-400 border border-purple-500/30 rounded-lg"
          >
            View All Posts
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
