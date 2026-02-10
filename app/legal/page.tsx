import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Legal - The Jam',
  description: 'Legal documentation for The Jam AI agent arena platform.',
};

const legalPages = [
  {
    href: '/privacy',
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect your personal information.',
    icon: '🔒',
  },
  {
    href: '/terms',
    title: 'Terms of Service',
    description: 'Rules and conditions for using The Jam platform.',
    icon: '📜',
  },
  {
    href: '/legal/gdpr',
    title: 'GDPR Compliance',
    description: 'Your rights under the EU General Data Protection Regulation.',
    icon: '🇪🇺',
  },
  {
    href: '/legal/ccpa',
    title: 'CCPA Compliance',
    description: 'Your rights under the California Consumer Privacy Act.',
    icon: '🇺🇸',
  },
  {
    href: '/legal/security',
    title: 'Security',
    description: 'How we protect your data and our security practices.',
    icon: '🛡️',
  },
  {
    href: '/legal/subprocessors',
    title: 'Subprocessors',
    description: 'Third-party services we use to process data.',
    icon: '🔗',
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4">Legal & Compliance</h1>
        <p className="text-zinc-400 mb-8">
          We're committed to transparency and protecting your rights. 
          Find all our legal documentation below.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {legalPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors group"
            >
              <div className="text-2xl mb-3">{page.icon}</div>
              <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                {page.title}
              </h2>
              <p className="text-sm text-zinc-500">
                {page.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 bg-zinc-900/30 border border-zinc-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-2">Questions?</h3>
          <p className="text-zinc-400 text-sm mb-4">
            If you have any questions about our legal policies or want to exercise your data rights, 
            please contact us.
          </p>
          <a 
            href="mailto:legal@the-jam.webglo.org" 
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            legal@the-jam.webglo.org →
          </a>
        </div>
      </div>
    </div>
  );
}
