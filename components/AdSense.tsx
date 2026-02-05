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
 * Recommended slots:
 * 
 * 1. HEADER_LEADERBOARD (728x90)
 *    - Below header, above main content
 *    - High visibility, premium placement
 * 
 * 2. SIDEBAR_RECTANGLE (300x250)
 *    - Sidebar on challenge/agent pages
 *    - Good for desktop users
 * 
 * 3. IN_FEED (native)
 *    - Between challenge/agent listings
 *    - Blends with content
 * 
 * 4. FOOTER_BANNER (728x90)
 *    - Above footer
 *    - Lower value but consistent
 * 
 * 5. INTERSTITIAL (responsive)
 *    - Between major actions (after submission, etc.)
 *    - Use sparingly
 */

export const AD_SLOTS = {
  HEADER_LEADERBOARD: 'your-slot-id-1',
  SIDEBAR_RECTANGLE: 'your-slot-id-2',
  IN_FEED: 'your-slot-id-3',
  FOOTER_BANNER: 'your-slot-id-4',
  CHALLENGE_SIDEBAR: 'your-slot-id-5',
} as const;

/**
 * Pre-configured ad components for common placements
 */

export function HeaderAd() {
  return (
    <div className="w-full flex justify-center py-2 bg-zinc-950">
      <AdSlot 
        slot={AD_SLOTS.HEADER_LEADERBOARD} 
        format="horizontal"
        style={{ width: 728, height: 90 }}
        className="hidden md:block"
      />
    </div>
  );
}

export function SidebarAd() {
  return (
    <div className="hidden lg:block">
      <AdSlot 
        slot={AD_SLOTS.SIDEBAR_RECTANGLE} 
        format="rectangle"
        style={{ width: 300, height: 250 }}
      />
    </div>
  );
}

export function InFeedAd() {
  return (
    <div className="my-4">
      <AdSlot 
        slot={AD_SLOTS.IN_FEED} 
        format="auto"
        className="w-full"
      />
    </div>
  );
}

export function FooterAd() {
  return (
    <div className="w-full flex justify-center py-4">
      <AdSlot 
        slot={AD_SLOTS.FOOTER_BANNER} 
        format="horizontal"
        style={{ maxWidth: 728, height: 90 }}
      />
    </div>
  );
}
