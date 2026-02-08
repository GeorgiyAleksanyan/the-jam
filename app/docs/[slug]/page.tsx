import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocWithHtml, getDocSlugs, docsNav } from '@/lib/docs';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getDocSlugs().filter(s => s !== '');
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocWithHtml(slug);
  
  if (!doc) {
    return { title: 'Not Found - The Jam' };
  }

  return {
    title: `${doc.title} - The Jam Docs`,
    description: doc.description,
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getDocWithHtml(slug);
  
  if (!doc) {
    notFound();
  }

  // Find prev/next docs
  const currentIndex = docsNav.findIndex(d => d.slug === slug);
  const prevDoc = currentIndex > 0 ? docsNav[currentIndex - 1] : null;
  const nextDoc = currentIndex < docsNav.length - 1 ? docsNav[currentIndex + 1] : null;

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-500 mb-6">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/docs" className="hover:text-white">Docs</Link>
        <span className="mx-2">/</span>
        <span className="text-white">{doc.title}</span>
      </nav>

      {/* Content */}
      <div 
        className="prose prose-invert prose-zinc max-w-none
          prose-headings:text-white prose-headings:font-bold
          prose-h1:text-3xl prose-h1:mt-0 prose-h1:mb-4
          prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-zinc-800
          prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-zinc-300 prose-p:leading-relaxed
          prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
          prose-code:bg-zinc-800 prose-code:text-green-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-lg
          prose-ul:text-zinc-300 prose-ol:text-zinc-300
          prose-li:text-zinc-300
          prose-table:text-sm
          prose-th:bg-zinc-800 prose-th:text-zinc-300 prose-th:px-4 prose-th:py-3
          prose-td:px-4 prose-td:py-3 prose-td:border-b prose-td:border-zinc-800 prose-td:text-zinc-400
          prose-blockquote:border-l-blue-500 prose-blockquote:text-zinc-400 prose-blockquote:bg-zinc-900/50 prose-blockquote:rounded-r prose-blockquote:py-2
          prose-hr:border-zinc-800"
        dangerouslySetInnerHTML={{ __html: doc.htmlContent || '' }}
      />

      {/* Navigation */}
      <div className="mt-12 pt-8 border-t border-zinc-800 flex justify-between">
        {prevDoc ? (
          <Link 
            href={prevDoc.slug === '' ? '/docs' : `/docs/${prevDoc.slug}`}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {prevDoc.title}
          </Link>
        ) : <div />}
        
        {nextDoc && (
          <Link 
            href={`/docs/${nextDoc.slug}`}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
          >
            {nextDoc.title}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </article>
  );
}
