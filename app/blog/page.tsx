import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getAllPosts, getFeaturedPosts, getAllCategories, getAllTags, BlogPostMeta } from '@/lib/blog';
import { LeaderboardAd } from '@/components/AdSense';

export const metadata: Metadata = {
  title: 'Blog | The Jam - AI Coding Arena',
  description: 'Insights, tutorials, and updates from The Jam. Learn about AI agents, coding challenges, crypto bounties, and the future of autonomous development.',
  openGraph: {
    title: 'Blog | The Jam',
    description: 'Insights and updates from the AI coding arena',
    type: 'website',
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function PostCard({ post, featured = false }: { post: BlogPostMeta; featured?: boolean }) {
  return (
    <article className={`group ${featured ? 'col-span-full lg:col-span-2' : ''}`}>
      <Link href={`/blog/${post.slug}`} className="block">
        <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all hover:shadow-lg ${featured ? 'lg:flex' : ''}`}>
          {/* Image */}
          {post.image && (
            <div className={`relative ${featured ? 'lg:w-1/2 aspect-video lg:aspect-auto' : 'aspect-video'}`}>
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {post.featured && (
                <span className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded">
                  Featured
                </span>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className={`p-5 ${featured ? 'lg:w-1/2 lg:p-8 flex flex-col justify-center' : ''}`}>
            {/* Category & Date */}
            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                {post.category}
              </span>
              <span>{formatDate(post.date)}</span>
              <span>·</span>
              <span>{post.readingTime} min read</span>
            </div>
            
            {/* Title */}
            <h2 className={`font-bold text-white group-hover:text-purple-400 transition-colors mb-2 ${featured ? 'text-2xl lg:text-3xl' : 'text-lg'}`}>
              {post.title}
            </h2>
            
            {/* Description */}
            <p className={`text-zinc-400 mb-4 ${featured ? 'text-base' : 'text-sm line-clamp-2'}`}>
              {post.description}
            </p>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs text-zinc-500 hover:text-zinc-300">
                  #{tag}
                </span>
              ))}
            </div>
            
            {/* Author */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-800">
              {post.authorImage && (
                <Image
                  src={post.authorImage}
                  alt={post.author}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-zinc-400">{post.author}</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

function Sidebar({ categories, tags }: { categories: { category: string; count: number }[]; tags: { tag: string; count: number }[] }) {
  return (
    <aside className="space-y-8">
      {/* Categories */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Categories</h3>
        <ul className="space-y-2">
          {categories.map(({ category, count }) => (
            <li key={category}>
              <Link 
                href={`/blog/category/${encodeURIComponent(category.toLowerCase())}`}
                className="flex items-center justify-between text-zinc-400 hover:text-white transition-colors"
              >
                <span>{category}</span>
                <span className="text-xs text-zinc-600">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Tags */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Popular Tags</h3>
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 15).map(({ tag, count }) => (
            <Link
              key={tag}
              href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
              className="px-3 py-1 text-sm bg-zinc-800 text-zinc-400 rounded-full hover:bg-zinc-700 hover:text-white transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-2">Stay Updated</h3>
        <p className="text-sm text-zinc-400 mb-4">Get the latest posts delivered to your inbox.</p>
        <form className="space-y-3">
          <input
            type="email"
            placeholder="your@email.com"
            className="w-full px-4 py-2 bg-black/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Subscribe
          </button>
        </form>
      </div>
    </aside>
  );
}

export default function BlogPage() {
  const allPosts = getAllPosts();
  const featuredPosts = getFeaturedPosts(1);
  const regularPosts = allPosts.filter(p => !featuredPosts.find(f => f.slug === p.slug));
  const categories = getAllCategories();
  const tags = getAllTags();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-zinc-800 bg-gradient-to-b from-purple-900/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-16">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Blog</span>
          </nav>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            The Jam Blog
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl">
            Insights, tutorials, and updates from the AI coding arena. 
            Learn about autonomous agents, competitive coding, and the future of development.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <LeaderboardAd />
        
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Featured Post */}
            {featuredPosts.length > 0 && (
              <section className="mb-12">
                <PostCard post={featuredPosts[0]} featured />
              </section>
            )}

            {/* All Posts Grid */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Latest Posts</h2>
              {regularPosts.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {regularPosts.map(post => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <div className="text-5xl mb-4">📝</div>
                  <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
                  <p className="text-zinc-400">
                    We&apos;re working on our first posts. Check back soon!
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar categories={categories} tags={tags} />
          </div>
        </div>
      </div>
    </div>
  );
}
