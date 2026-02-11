import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getPostBySlug, getAllPosts, getRelatedPosts } from '@/lib/blog';
import { ChallengeSidebarAd, InFeedAd } from '@/components/AdSense';
import { BlogArticleSchema } from '@/components/StructuredData';
import GiscusComments from '@/components/GiscusComments';
import ShareButtons from '@/components/ShareButtons';
import TableOfContents from '@/components/TableOfContents';
import MarkdownContent from '@/components/MarkdownContent';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  
  if (!post) {
    return { title: 'Post Not Found' };
  }

  const url = `https://the-jam.webglo.org/blog/${slug}`;

  return {
    title: `${post.title} | The Jam Blog`,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      images: post.image ? [{ url: post.image }] : undefined,
      url,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : undefined,
    },
    alternates: {
      canonical: url,
    },
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function RelatedPostCard({ post }: { post: { slug: string; title: string; image?: string; category: string; readingTime: number } }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-all">
        {post.image && (
          <div className="relative aspect-video">
            <Image src={post.image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform" />
          </div>
        )}
        <div className="p-4">
          <span className="text-xs text-purple-400">{post.category}</span>
          <h4 className="font-medium text-white group-hover:text-purple-400 transition-colors mt-1 line-clamp-2">
            {post.title}
          </h4>
          <span className="text-xs text-zinc-500 mt-2 block">{post.readingTime} min read</span>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(slug, 3);
  const url = `https://the-jam.webglo.org/blog/${slug}`;

  return (
    <>
      <BlogArticleSchema
        title={post.title}
        description={post.description}
        datePublished={post.date}
        author={post.author}
        image={post.image}
        url={url}
      />

      <article className="min-h-screen">
        {/* Hero */}
        <header className="border-b border-zinc-800 bg-gradient-to-b from-purple-900/20 to-transparent">
          <div className="max-w-4xl mx-auto px-4 py-12">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <span>/</span>
              <Link 
                href={`/blog/category/${encodeURIComponent(post.category.toLowerCase())}`}
                className="hover:text-white transition-colors"
              >
                {post.category}
              </Link>
              <span>/</span>
              <span className="text-zinc-400 truncate max-w-[200px]">{post.title}</span>
            </nav>

            {/* Category */}
            <Link 
              href={`/blog/category/${encodeURIComponent(post.category.toLowerCase())}`}
              className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full hover:bg-purple-500/30 transition-colors mb-4"
            >
              {post.category}
            </Link>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Description */}
            <p className="text-xl text-zinc-400 mb-6">
              {post.description}
            </p>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              {/* Author */}
              <div className="flex items-center gap-3">
                {post.authorImage && (
                  <Image
                    src={post.authorImage}
                    alt={post.author}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <div>
                  <div className="text-white font-medium">{post.author}</div>
                  {post.authorTwitter && (
                    <a 
                      href={`https://twitter.com/${post.authorTwitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      @{post.authorTwitter}
                    </a>
                  )}
                </div>
              </div>
              
              <span className="hidden sm:block">·</span>
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span>·</span>
              <span>{post.readingTime} min read</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-6">
              {post.tags.map(tag => (
                <Link
                  key={tag}
                  href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}
                  className="px-3 py-1 text-sm bg-zinc-800 text-zinc-400 rounded-full hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.image && (
          <div className="max-w-5xl mx-auto px-4 -mt-6 mb-12">
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Table of Contents (Desktop) */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-20">
                <TableOfContents content={post.content} />
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="prose prose-invert prose-lg max-w-none">
                <MarkdownContent content={post.content} />
              </div>

              <InFeedAd />

              {/* Share */}
              <div className="mt-12 pt-8 border-t border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4">Share this post</h3>
                <ShareButtons url={url} title={post.title} />
              </div>

              {/* Comments */}
              <div className="mt-12 pt-8 border-t border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-6">Comments</h3>
                <GiscusComments />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-8">
              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Related Posts</h3>
                  <div className="space-y-4">
                    {relatedPosts.map(relatedPost => (
                      <RelatedPostCard key={relatedPost.slug} post={relatedPost} />
                    ))}
                  </div>
                </div>
              )}

              <ChallengeSidebarAd />
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
