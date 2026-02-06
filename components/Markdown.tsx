'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style overrides for dark theme
          h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold text-white mb-3 mt-6">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold text-white mb-2 mt-4">{children}</h3>,
          p: ({ children }) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-gray-300">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return <code className="bg-gray-800 text-yellow-300 px-1.5 py-0.5 rounded text-sm">{children}</code>;
            }
            return (
              <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 overflow-x-auto mb-4">
                <code className="text-sm text-gray-300">{children}</code>
              </pre>
            );
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 mb-4">{children}</blockquote>
          ),
          hr: () => <hr className="border-gray-700 my-6" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-700">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-gray-800 border border-gray-700 px-4 py-2 text-left text-white">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-700 px-4 py-2 text-gray-300">{children}</td>
          ),
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
