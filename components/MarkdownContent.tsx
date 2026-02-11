'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
  content: string;
}

export default function MarkdownContent({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      ]}
      components={{
        // Code blocks with syntax highlighting
        code({ node: _node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match && !className;
          
          if (isInline) {
            return (
              <code className="px-1 sm:px-1.5 py-0.5 bg-zinc-800 rounded text-purple-300 text-xs sm:text-sm break-words" {...props}>
                {children}
              </code>
            );
          }

          return (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <SyntaxHighlighter
                style={vscDarkPlus as any}
                language={match?.[1] || 'text'}
                PreTag="div"
                className="rounded-lg !bg-zinc-900 !mt-4 !mb-4 !text-xs sm:!text-sm"
                showLineNumbers
                wrapLongLines={false}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          );
        },
        
        // Images with Next.js optimization
        img({ src, alt }) {
          if (!src || typeof src !== 'string') return null;
          
          // External images
          if (src.startsWith('http')) {
            return (
              <span className="block my-6">
                <Image
                  src={src}
                  alt={alt || ''}
                  width={800}
                  height={450}
                  className="rounded-lg w-full"
                />
                {alt && <span className="block text-center text-sm text-zinc-500 mt-2">{alt}</span>}
              </span>
            );
          }
          
          // Local images
          return (
            <span className="block my-6">
              <Image
                src={src}
                alt={alt || ''}
                width={800}
                height={450}
                className="rounded-lg w-full"
              />
              {alt && <span className="block text-center text-sm text-zinc-500 mt-2">{alt}</span>}
            </span>
          );
        },

        // Links
        a({ href, children }) {
          const isInternal = href?.startsWith('/') || href?.startsWith('#');
          
          if (isInternal) {
            return (
              <Link href={href || '#'} className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                {children}
              </Link>
            );
          }
          
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              {children}
            </a>
          );
        },

        // Blockquotes
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-purple-500 pl-3 sm:pl-4 my-4 sm:my-6 italic text-zinc-400 text-sm sm:text-base">
              {children}
            </blockquote>
          );
        },

        // Tables
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4 sm:my-6 -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full border-collapse border border-zinc-700 text-sm">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-zinc-700 bg-zinc-800 px-2 sm:px-4 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-zinc-700 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
              {children}
            </td>
          );
        },

        // Headings with anchor links
        h2({ children, id }) {
          return (
            <h2 id={id} className="text-xl sm:text-2xl font-bold text-white mt-8 sm:mt-12 mb-3 sm:mb-4 scroll-mt-20 group">
              {children}
              {id && (
                <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-purple-400">
                  #
                </a>
              )}
            </h2>
          );
        },
        h3({ children, id }) {
          return (
            <h3 id={id} className="text-lg sm:text-xl font-bold text-white mt-6 sm:mt-8 mb-2 sm:mb-3 scroll-mt-20 group">
              {children}
              {id && (
                <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-purple-400">
                  #
                </a>
              )}
            </h3>
          );
        },
        h4({ children, id }) {
          return (
            <h4 id={id} className="text-base sm:text-lg font-bold text-white mt-4 sm:mt-6 mb-2 scroll-mt-20 group">
              {children}
              {id && (
                <a href={`#${id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-purple-400">
                  #
                </a>
              )}
            </h4>
          );
        },

        // Lists
        ul({ children }) {
          return <ul className="list-disc list-outside ml-4 sm:ml-6 space-y-1.5 sm:space-y-2 my-3 sm:my-4 text-zinc-300 text-sm sm:text-base">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-outside ml-4 sm:ml-6 space-y-1.5 sm:space-y-2 my-3 sm:my-4 text-zinc-300 text-sm sm:text-base">{children}</ol>;
        },

        // Paragraphs
        p({ children }) {
          return <p className="my-3 sm:my-4 text-zinc-300 leading-relaxed text-sm sm:text-base">{children}</p>;
        },

        // Horizontal rule
        hr() {
          return <hr className="border-zinc-700 my-8" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
