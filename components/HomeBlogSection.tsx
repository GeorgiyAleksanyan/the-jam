import { memo } from 'react';
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

// Memoized to prevent re-renders when parent state changes
const FeaturedPostCard = memo(function FeaturedPostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg overflow-hidden hover:border-purple-500/50 transition-all">
        <div className="md:flex">
          {post.image && (
            <div className="md:w-1/2 relative aspect-video md:aspect-auto md:min-h-[200px]">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-bold rounded">
                Featured
              </div>
            </div>
          )}
          <div className="md:w-1/2 p-4 md:p-6 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-2">
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">
                {post.category}
              </span>
              <span>{formatDate(post.date)}</span>
              <span>·</span>
              <span>{post.readingTime} min</span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-2">
              {post.title}
            </h3>
            <p className="text-zinc-400 text-sm mb-3 line-clamp-2 hidden sm:block">
              {post.description}
            </p>
            <span className="text-xs text-purple-400 group-hover:text-purple-300">
              Read more →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
});

// Memoized to prevent re-renders when iterating over list
const PostCard = memo(function PostCard({ post }: { post: BlogPostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block flex-shrink-0 w-[280px] sm:w-auto">
      <article className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-all h-full">
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
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mb-1.5">
            <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
              {post.category}
            </span>
            <span>{formatDate(post.date)}</span>
          </div>
          <h3 className="font-semibold text-sm text-white group-hover:text-purple-400 transition-colors mb-1.5 line-clamp-2">
            {post.title}
          </h3>
          <p className="text-xs text-zinc-400 line-clamp-2">
            {post.description}
          </p>
        </div>
      </article>
    </Link>
  );
});

export default function HomeBlogSection() {
  const featuredPosts = getFeaturedPosts(1);
  const allPosts = getAllPosts();
  const recentPosts = allPosts
    .filter(p => !featuredPosts.find(f => f.slug === p.slug))
    .slice(0, 6); // Get more for horizontal scroll

  // Don't render if no posts
  if (allPosts.length === 0) return null;

  return (
    <section className="py-10 sm:py-16 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              Latest from the Blog
            </h2>
            <p className="text-zinc-400 text-sm hidden sm:block">
              Insights, tutorials, and updates
            </p>
          </div>
          <Link
            href="/blog"
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-400 hover:text-white border border-purple-500/30 hover:border-purple-500 rounded-md transition-colors"
          >
            View All
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Featured Post */}
        {featuredPosts.length > 0 && (
          <div className="mb-6">
            <FeaturedPostCard post={featuredPosts[0]} />
          </div>
        )}

        {/* Recent Posts - Horizontal Scroll on Mobile */}
        {recentPosts.length > 0 && (
          <div className="relative">
            {/* Gradient fade on right edge for mobile */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none sm:hidden" />
            
            {/* Scrollable container on mobile, grid on desktop */}
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-2 lg:grid-cols-3 scrollbar-hide">
              {recentPosts.map(post => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
