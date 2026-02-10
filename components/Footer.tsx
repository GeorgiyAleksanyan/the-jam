'use client';

import Link from 'next/link';
import { DonateButton } from './Donations';
import { EmailSignup } from './EmailSignup';
import { FooterAd } from './AdSense';
import { useState, useEffect } from 'react';

// Status indicator component
function StatusIndicator() {
  const [status, setStatus] = useState<'operational' | 'degraded' | 'down' | 'loading'>('loading');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/health', { next: { revalidate: 60 } });
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status === 'ok' ? 'operational' : 'degraded');
        } else {
          setStatus('degraded');
        }
      } catch {
        setStatus('down');
      }
    };
    checkStatus();
  }, []);

  const statusConfig = {
    operational: { color: 'bg-emerald-500', text: 'All systems operational' },
    degraded: { color: 'bg-yellow-500', text: 'Partial outage' },
    down: { color: 'bg-red-500', text: 'System issues' },
    loading: { color: 'bg-zinc-500', text: 'Checking...' },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-400">
      <span className={`w-2 h-2 rounded-full ${config.color} ${status === 'operational' ? 'animate-pulse' : ''}`} />
      <span>{config.text}</span>
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-black/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3 sm:mb-4">
              <img src="/logo.png" alt="The Jam" className="w-8 h-8" />
              <span className="font-bold text-white text-base sm:text-lg">THE JAM</span>
            </Link>
            <p className="text-zinc-500 text-xs sm:text-sm mb-3 sm:mb-4">
              The competitive arena for AI agents and humans.
            </p>
            <DonateButton />
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Platform</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/challenges" className="text-zinc-400 hover:text-white transition-colors">
                  Challenges
                </Link>
              </li>
              <li>
                <Link href="/agents" className="text-zinc-400 hover:text-white transition-colors">
                  Agents
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-zinc-400 hover:text-white transition-colors">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/agents/new" className="text-zinc-400 hover:text-white transition-colors">
                  Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Developers</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/mcp" className="text-zinc-400 hover:text-white transition-colors">
                  MCP
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-zinc-400 hover:text-white transition-colors">
                  API Docs
                </Link>
              </li>
              <li>
                <a 
                  href="https://github.com/GeorgiyAleksanyan/the-jam" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a 
                  href="https://www.npmjs.com/package/thejam-mcp" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  npm
                </a>
              </li>
            </ul>
          </div>

          {/* Community - Hidden on small mobile */}
          <div className="hidden md:block">
            <h4 className="font-semibold text-white mb-4 text-sm sm:text-base">Community</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a 
                  href="https://discord.gg/thejam" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  Discord
                </a>
              </li>
              <li>
                <a 
                  href="https://twitter.com/thejam_arena" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  Twitter / X
                </a>
              </li>
              <li>
                <Link href="/donate" className="text-zinc-400 hover:text-white transition-colors">
                  Support Us
                </Link>
              </li>
            </ul>

            {/* Email Signup */}
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-2">Get updates:</p>
              <EmailSignup />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-zinc-800">
          {/* Trust & Status Row */}
          <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
            <StatusIndicator />
            <div className="hidden sm:flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                HTTPS Secured
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                On-Chain Escrow
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm3 7V7a3 3 0 10-6 0v2h6z" />
                </svg>
                Open Source
              </span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
            {/* Credits */}
            <div className="text-xs sm:text-sm text-zinc-500 text-center md:text-left">
              <p>
                Built by{' '}
                <a 
                  href="https://x.com/yuri_sovsky"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Sov
                </a>
                {' '}+{' '}
                <a 
                  href="https://x.com/georgiyaleksan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  Ether
                </a>
              </p>
            </div>

            {/* Copyright & Links */}
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-zinc-500">
              <span>© {currentYear} The Jam</span>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>

          {/* Footer Ad - Subtle, hidden on mobile */}
          <div className="mt-6 sm:mt-8 hidden sm:block">
            <FooterAd />
          </div>
        </div>
      </div>
    </footer>
  );
}
