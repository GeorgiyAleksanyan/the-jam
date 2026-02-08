import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner, Head } from 'nextra/components';
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
    logo={<span className="font-bold text-xl">🎵 The Jam</span>}
    projectLink="https://github.com/GeorgiyAleksanyan/the-jam"
  />
);

const footer = (
  <Footer className="flex-col items-center md:items-start">
    <span>© {new Date().getFullYear()} The Jam. Open source under MIT.</span>
  </Footer>
);

export default async function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={await getPageMap('/docs')}
          docsRepositoryBase="https://github.com/GeorgiyAleksanyan/the-jam/tree/main/content/docs"
          footer={footer}
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          toc={{ backToTop: true }}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
