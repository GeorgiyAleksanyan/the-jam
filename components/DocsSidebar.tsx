'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DocNavItem {
  slug: string;
  title: string;
}

interface DocsSidebarProps {
  items: DocNavItem[];
}

export function DocsSidebar({ items }: DocsSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const currentSlug = pathname === '/docs' ? '' : pathname.replace('/docs/', '');

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-16 left-0 z-40
        w-64 h-[calc(100vh-4rem)] bg-zinc-950 lg:bg-transparent
        border-r border-zinc-800 lg:border-0
        transform transition-transform lg:transform-none
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <nav className="p-4 space-y-1 overflow-y-auto h-full">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Documentation
          </div>
          
          {items.map((item) => {
            const href = item.slug === '' ? '/docs' : `/docs/${item.slug}`;
            const isActive = currentSlug === item.slug;
            
            return (
              <Link
                key={item.slug}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`
                  block px-3 py-2 rounded-lg text-sm transition-colors
                  ${isActive 
                    ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}
                `}
              >
                {item.title}
              </Link>
            );
          })}
          
          <div className="pt-6 mt-6 border-t border-zinc-800">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Resources
            </div>
            <a
              href="https://github.com/GeorgiyAleksanyan/the-jam"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              GitHub
            </a>
            <Link
              href="/mcp"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <span>🔌</span>
              MCP Package
            </Link>
          </div>
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
