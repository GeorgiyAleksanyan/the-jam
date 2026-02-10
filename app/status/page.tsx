import { Metadata } from 'next';
import Link from 'next/link';
import { StatusPageClient } from './StatusPageClient';

export const metadata: Metadata = {
  title: 'System Status - The Jam',
  description: 'Real-time status of The Jam platform services and infrastructure.',
};

export default function StatusPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="The Jam" className="w-10 h-10" />
            <span className="font-bold text-xl text-white">THE JAM</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">System Status</h1>
          <p className="text-zinc-400">Real-time status of all platform services</p>
        </div>

        {/* Client-side status components */}
        <StatusPageClient />

        {/* External Dependencies */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-white mb-4">External Services</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <a 
              href="https://status.supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Supabase</span>
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Database & Auth</p>
            </a>
            <a 
              href="https://www.vercel-status.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Vercel</span>
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Hosting & CDN</p>
            </a>
            <a 
              href="https://status.base.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Base</span>
                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Blockchain & Escrow</p>
            </a>
          </div>
        </div>

        {/* Subscribe */}
        <div className="mt-12 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center">
          <h3 className="font-semibold text-white mb-2">Get Status Updates</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Subscribe to receive notifications about incidents and maintenance.
          </p>
          <form className="flex gap-2 max-w-md mx-auto" id="status-subscribe">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-zinc-500">
          <p>
            Questions? Contact us at{' '}
            <a href="mailto:support@the-jam.webglo.org" className="text-blue-400 hover:text-blue-300">
              support@the-jam.webglo.org
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
