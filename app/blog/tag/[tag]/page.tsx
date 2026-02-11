import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPostsByTag, getAllTags, BlogPostMeta } from '@/lib/blog';
import { LeaderboardAd } from '@/components/AdSense';

interface Props {
  params: Promise<{ tag: string }>;
}

export async function generateStaticParams() {
  const tags = getAllTags();
  return tags.map(t => ({ tag: t.tag.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;

  return {
    title: `#${tag} | The Jam Blog`,
    description: `Browse all posts tagged with #${tag} on The Jam Blog`,
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function PostCard({ post }: { post: BlogPostMeta }) {
  return (
    <article className="group">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all hover:shadow-lg">
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
            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                {post.category}
              </span>
              <span>{formatDate(post.date)}</span>
            </div>
            <h2 className="font-bold text-lg text-white group-hover:text-purple-400 transition-colors mb-2">
              {post.title}
            </h2>
            <p className="text-sm text-zinc-400 line-clamp-2">{post.description}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const posts = getPostsByTag(tag);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <section className="border-b border-zinc-800 bg-gradient-to-b from-purple-900/20 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-white">#{tag}</span>
          </nav>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-purple-400">#</span>{tag}
          </h1>
          <p className="text-xl text-zinc-400">
            {posts.length} post{posts.length !== 1 ? 's' : ''} with this tag
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <LeaderboardAd />
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {posts.map(post => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
