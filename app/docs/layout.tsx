import { ReactNode } from 'react';
import { DocsSidebar } from '@/components/DocsSidebar';
import { DocsSidebarAd } from '@/components/AdSense';
import { docsNav } from '@/lib/docs';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <DocsSidebar items={docsNav} />
        
        {/* Main Content */}
        <main className="flex-1 min-w-0 px-4 lg:px-8 py-8">
          <div className="max-w-3xl">
            {children}
          </div>
        </main>

        {/* Right Sidebar - Ad (desktop only) */}
        <aside className="hidden xl:block w-64 shrink-0 py-8 pr-4">
          <div className="sticky top-24">
            <DocsSidebarAd />
          </div>
        </aside>
      </div>
    </div>
  );
}
