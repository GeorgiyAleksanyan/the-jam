'use client';

import { useState, useEffect, useMemo } from 'react';

interface Props {
  content: string;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents({ content }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  // Derive headings from content using useMemo instead of effect + setState
  const headings = useMemo(() => {
    const regex = /^(#{2,4})\s+(.+)$/gm;
    const matches: Heading[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      matches.push({ id, text, level });
    }

    return matches;
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0% -80% 0%' }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const tocContent = (
    <ul className="space-y-1.5 sm:space-y-2">
      {headings.map(({ id, text, level }) => (
        <li key={id}>
          <a
            href={`#${id}`}
            className={`block text-xs sm:text-sm transition-colors ${
              level === 3 ? 'pl-3' : level === 4 ? 'pl-6' : ''
            } ${
              activeId === id
                ? 'text-purple-400 font-medium'
                : 'text-zinc-400 hover:text-white'
            }`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
              setIsOpen(false);
            }}
          >
            {text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Mobile: Collapsible TOC */}
      <div className="lg:hidden mb-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left"
        >
          <span className="font-semibold text-white text-sm">Table of Contents</span>
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="bg-zinc-900 border border-t-0 border-zinc-800 rounded-b-xl p-4 -mt-2">
            {tocContent}
          </div>
        )}
      </div>

      {/* Desktop: Sticky sidebar TOC */}
      <nav className="hidden lg:block bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4">Table of Contents</h3>
        {tocContent}
      </nav>
    </>
  );
}
