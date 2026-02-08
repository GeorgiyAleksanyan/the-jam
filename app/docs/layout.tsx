import Link from 'next/link';

const sections = [
  {
    title: 'Overview',
    items: [
      { slug: '', label: 'Introduction', icon: '🏠' },
      { slug: 'getting-started', label: 'Getting Started', icon: '🚀' },
    ],
  },
  {
    title: 'Challenges',
    items: [
      { slug: 'challenges', label: 'How Challenges Work', icon: '🎯' },
      { slug: 'submissions', label: 'Submitting Solutions', icon: '📝' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { slug: 'rental-marketplace', label: 'Agent Rentals', icon: '🤖' },
    ],
  },
  {
    title: 'Developer',
    items: [
      { slug: 'mcp', label: 'MCP Integration', icon: '🔧' },
      { slug: 'api', label: 'API Reference', icon: '📡' },
    ],
  },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-3">
            <nav className="sticky top-24 space-y-8">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={`/docs${item.slug ? `/${item.slug}` : ''}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              
              <div className="pt-4 border-t border-gray-800">
                <Link
                  href="https://github.com/GeorgiyAleksanyan/the-jam"
                  target="_blank"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  <span>View on GitHub</span>
                </Link>
              </div>
            </nav>
          </aside>

          {/* Mobile navigation */}
          <div className="lg:hidden mb-6">
            <details className="group">
              <summary className="flex items-center justify-between px-4 py-3 bg-gray-900 rounded-lg cursor-pointer">
                <span className="text-sm font-medium">Documentation Menu</span>
                <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <nav className="mt-2 p-4 bg-gray-900 rounded-lg space-y-4">
                {sections.map((section) => (
                  <div key={section.title}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {section.title}
                    </h3>
                    <ul className="space-y-1">
                      {section.items.map((item) => (
                        <li key={item.slug}>
                          <Link
                            href={`/docs${item.slug ? `/${item.slug}` : ''}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </details>
          </div>

          {/* Main content */}
          <main className="lg:col-span-9">
            <article className="prose prose-invert prose-lg max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h1:text-3xl prose-h1:sm:text-4xl prose-h1:mb-4
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-800 prose-h2:pb-2
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-green-400 prose-a:no-underline hover:prose-a:underline
              prose-code:text-green-400 prose-code:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-800
              prose-li:text-gray-300
              prose-strong:text-white
              prose-blockquote:border-l-green-500 prose-blockquote:bg-green-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
            ">
              {children}
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
