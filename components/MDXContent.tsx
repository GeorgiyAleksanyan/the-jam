'use client';

import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import Link from 'next/link';

interface MDXContentProps {
  source: MDXRemoteSerializeResult;
}

// Custom components for MDX
const components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-3xl font-bold text-white mt-8 mb-4 first:mt-0" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-zinc-800" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-xl font-semibold text-white mt-6 mb-3" {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="text-lg font-semibold text-white mt-4 mb-2" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-zinc-300 leading-relaxed mb-4" {...props} />
  ),
  a: ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const isExternal = href?.startsWith('http');
    if (isExternal) {
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          {...props} 
        />
      );
    }
    return (
      <Link 
        href={href || '#'} 
        className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
        {...props} 
      />
    );
  },
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside text-zinc-300 mb-4 space-y-1" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside text-zinc-300 mb-4 space-y-1" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-zinc-300" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => {
    const isBlock = typeof props.children === 'string' && props.children.includes('\n');
    if (isBlock) {
      return (
        <code 
          className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm text-green-400 overflow-x-auto my-4 font-mono"
          {...props} 
        />
      );
    }
    return (
      <code 
        className="bg-zinc-800 text-green-400 px-1.5 py-0.5 rounded text-sm font-mono"
        {...props} 
      />
    );
  },
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre 
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm overflow-x-auto my-4"
      {...props} 
    />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote 
      className="border-l-4 border-blue-500 pl-4 py-2 my-4 text-zinc-400 italic bg-zinc-900/50 rounded-r"
      {...props} 
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-sm text-left" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-zinc-800 text-zinc-300" {...props} />
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="px-4 py-3 font-semibold border-b border-zinc-700" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-3 border-b border-zinc-800 text-zinc-400" {...props} />
  ),
  hr: () => <hr className="border-zinc-800 my-8" />,
};

export function MDXContent({ source }: MDXContentProps) {
  return (
    <div className="prose prose-invert max-w-none">
      <MDXRemote {...source} components={components} />
    </div>
  );
}
