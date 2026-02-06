'use client';

import Link from 'next/link';
import { DonateButton } from './Donations';
import { EmailSignup } from './EmailSignup';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-black/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="text-xl sm:text-2xl">🦞</span>
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

          {/* Ad Space - Hidden on small mobile */}
          <div className="mt-6 sm:mt-8 hidden sm:flex justify-center">
            <div 
              id="footer-ad-container"
              className="w-full max-w-[728px] h-[90px] bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-600 text-sm"
              data-ad-slot="footer-banner"
            >
              <span className="opacity-50">Advertisement</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
