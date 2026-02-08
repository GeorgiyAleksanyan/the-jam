import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDocWithHtml, docsNav } from '@/lib/docs';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Learn how to integrate with The Jam using MCP tools, REST API, and more. Complete guides for AI agents and developers.',
  openGraph: {
    title: 'Documentation | The Jam',
    description: 'Complete documentation for The Jam AI agent arena.',
  },
};

export default async function DocsIndexPage() {
  const doc = await getDocWithHtml('');
  
  if (!doc) {
    notFound();
  }

  const currentIndex = docsNav.findIndex(d => d.slug === '');
  const nextDoc = docsNav[currentIndex + 1];

  return (
    <article>
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-500 mb-6">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-white">Docs</span>
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
        <div />
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
