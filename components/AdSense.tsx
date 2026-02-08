'use client';

import { useEffect } from 'react';
import Script from 'next/script';

// Your Google AdSense Publisher ID
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-9128014602464663';

interface AdSlotProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Individual Ad Unit
 * Place these throughout the app where ads should appear
 */
export function AdSlot({ 
  slot, 
  format = 'auto', 
  style,
  className = '' 
}: AdSlotProps) {
  useEffect(() => {
    // Push ad to AdSense queue after component mounts
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  // Don't show ads in development
  if (process.env.NODE_ENV === 'development') {
    return (
      <div 
        className={`bg-zinc-900/50 border border-dashed border-zinc-700 rounded-lg flex items-center justify-center text-zinc-600 text-xs ${className}`}
        style={{ minHeight: 90, ...style }}
      >
        Ad: {slot}
      </div>
    );
  }

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'block', ...style }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
}

/**
 * AdSense Script Loader
 * Include once in the root layout
 */
export function AdSenseScript() {
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  return (
    <Script
      id="adsense-script"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}

/**
 * Strategic Ad Placements for The Jam
 * 
 * Philosophy: Ads should blend with content, not interrupt.
 * 
 * ACTIVE PLACEMENTS:
 * - IN_FEED: Blends with challenge/agent cards
 * - CHALLENGE_SIDEBAR: On challenge detail pages
 * - DOCS_SIDEBAR: On documentation pages
 * - FOOTER_BANNER: Subtle footer placement
 * 
 * RESERVED (for future):
 * - SOCIAL_FEED: When home feed is built
 */

export const AD_SLOTS = {
  // Active
  IN_FEED_CHALLENGES: 'challenges-feed-1',
  IN_FEED_AGENTS: 'agents-feed-1',
  CHALLENGE_SIDEBAR: 'challenge-sidebar-1',
  DOCS_SIDEBAR: 'docs-sidebar-1',
  DONATE_PAGE: 'donate-page-1',
  FOOTER_BANNER: 'footer-banner-1',
  // Reserved for future
  SOCIAL_FEED: 'social-feed-1',
} as const;

/**
 * Pre-configured ad components for common placements
 * Designed to blend with existing UI components
 */

// Blends with challenge cards in the grid
export function ChallengesFeedAd() {
  return (
    <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
      <AdSlot 
        slot={AD_SLOTS.IN_FEED_CHALLENGES} 
        format="auto"
        className="w-full"
      />
    </div>
  );
}

// Blends with agent cards in the grid
export function AgentsFeedAd() {
  return (
    <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[120px]">
      <AdSlot 
        slot={AD_SLOTS.IN_FEED_AGENTS} 
        format="auto"
        className="w-full"
      />
    </div>
  );
}

// Sidebar on challenge detail pages
export function ChallengeSidebarAd() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="text-xs text-zinc-600 mb-2">Sponsored</div>
      <AdSlot 
        slot={AD_SLOTS.CHALLENGE_SIDEBAR} 
        format="rectangle"
        style={{ minHeight: 250 }}
      />
    </div>
  );
}

// Sidebar on docs pages
export function DocsSidebarAd() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mt-6">
      <div className="text-xs text-zinc-600 mb-2">Sponsored</div>
      <AdSlot 
        slot={AD_SLOTS.DOCS_SIDEBAR} 
        format="rectangle"
        style={{ minHeight: 200 }}
      />
    </div>
  );
}

// For the donate page
export function DonatePageAd() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
      <div className="text-xs text-zinc-600 mb-3">Our Sponsors</div>
      <AdSlot 
        slot={AD_SLOTS.DONATE_PAGE} 
        format="auto"
        style={{ minHeight: 100 }}
      />
    </div>
  );
}

// Subtle footer ad
export function FooterAd() {
  return (
    <div className="w-full flex justify-center">
      <AdSlot 
        slot={AD_SLOTS.FOOTER_BANNER} 
        format="horizontal"
        style={{ maxWidth: 728, minHeight: 90 }}
        className="w-full"
      />
    </div>
  );
}

// For future social feed on homepage
export function SocialFeedAd() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <AdSlot 
        slot={AD_SLOTS.SOCIAL_FEED} 
        format="auto"
        className="w-full"
      />
    </div>
  );
}
