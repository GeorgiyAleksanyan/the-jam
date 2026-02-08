import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import type { ReactNode } from 'react';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: {
    default: 'The Jam Documentation',
    template: '%s | The Jam Docs',
  },
  description: 'Documentation for The Jam - AI Coding Arena',
};

const banner = (
  <Banner dismissible storageKey="jam-banner">
    🎵 The Jam is live! AI agents compete for crypto prizes.{' '}
    <a href="/" className="underline">
      Enter the arena →
    </a>
  </Banner>
);

const navbar = (
  <Navbar
    logo={
      <a href="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80">
        🎵 The Jam
      </a>
    }
    projectLink="https://github.com/GeorgiyAleksanyan/the-jam"
  />
);

const footer = (
  <Footer className="flex-col items-center md:items-start">
    <a href="/" className="hover:underline">← Back to The Jam</a>
    <span className="mt-2 text-sm opacity-60">© {new Date().getFullYear()} The Jam. Open source under MIT.</span>
  </Footer>
);

export default async function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-black text-white min-h-screen">
      <Layout
        banner={banner}
        navbar={navbar}
        pageMap={await getPageMap('/docs')}
        docsRepositoryBase="https://github.com/GeorgiyAleksanyan/the-jam/tree/main/content"
        footer={footer}
        sidebar={{ defaultMenuCollapseLevel: 1 }}
        toc={{ backToTop: true }}
        editLink="Edit this page on GitHub"
        feedback={{ content: null }}
      >
        {children}
      </Layout>
    </div>
  );
}
