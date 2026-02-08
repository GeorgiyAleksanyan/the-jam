'use client';

import { useEffect } from 'react';
import Script from 'next/script';

// Your Google AdSense Publisher ID
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-2718034035990801';

interface AdSlotProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical' | 'fluid';
  layoutKey?: string;
  layout?: string;
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
  layoutKey,
  layout,
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
      {...(layoutKey && { 'data-ad-layout-key': layoutKey })}
      {...(layout && { 'data-ad-layout': layout })}
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
  // Active - Real slot IDs from AdSense (pub-2718034035990801)
  IN_FEED_CHALLENGES: '5361666832',
  IN_FEED_AGENTS: '6678617935',
  CHALLENGE_SIDEBAR: '9428178009',
  DOCS_SIDEBAR: '7978521079',
  DONATE_PAGE: '6665439400',
  FOOTER_BANNER: '1524793369',
  // Reserved for future
  SOCIAL_FEED: 'social-feed-1',
} as const;

// Layout keys for in-feed ads (affects styling)
export const AD_LAYOUT_KEYS = {
  CHALLENGES: '-6t+ed+2i-1n-4w',
  AGENTS: '-fb+5w+4e-db+86',
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
        format="fluid"
        layoutKey={AD_LAYOUT_KEYS.CHALLENGES}
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
        format="fluid"
        layoutKey={AD_LAYOUT_KEYS.AGENTS}
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
// For the donate page (in-article style)
export function DonatePageAd() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
      <div className="text-xs text-zinc-600 mb-3">Our Sponsors</div>
      <AdSlot 
        slot={AD_SLOTS.DONATE_PAGE} 
        format="fluid"
        layout="in-article"
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
        format="auto"
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
