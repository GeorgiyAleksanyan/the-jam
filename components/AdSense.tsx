'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

// Your Google AdSense Publisher ID
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-2718034035990801';

// Check if user has consented to advertising cookies
function hasAdConsent(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const consent = localStorage.getItem('jam_cookie_consent');
    if (!consent) return true;
    const parsed = JSON.parse(consent);
    return parsed.advertising !== false;
  } catch {
    return true;
  }
}

interface AdSlotProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical' | 'fluid';
  layoutKey?: string;
  layout?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Individual Ad Unit (raw)
 */
export function AdSlot({ 
  slot, 
  format = 'auto', 
  layoutKey,
  layout,
  style,
  className = '' 
}: AdSlotProps) {
  const [showAd, setShowAd] = useState(() => {
    if (typeof window === 'undefined') return true;
    return hasAdConsent();
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jam_cookie_consent') {
        setShowAd(hasAdConsent());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!showAd) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [showAd]);

  if (process.env.NODE_ENV === 'development') {
    return (
      <div 
        className={`bg-zinc-900/30 border border-zinc-800 rounded flex items-center justify-center text-zinc-600 text-xs ${className}`}
        style={{ ...style }}
      >
        Ad
      </div>
    );
  }

  if (!showAd) return null;

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
 */
export function AdSenseScript() {
  const [loadScript, setLoadScript] = useState(() => {
    if (typeof window === 'undefined') return true;
    return hasAdConsent();
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jam_cookie_consent') {
        setLoadScript(hasAdConsent());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!loadScript || process.env.NODE_ENV === 'development') return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}

// ============================================================================
// AD SLOT IDS — from Google AdSense dashboard
// ============================================================================
const AD_SLOTS = {
  banner: '1524793369',       // jam-footer-banner (Display)
  docsSidebar: '7978521079',  // jam-docs-sidebar (Display)
  challengeSidebar: '9428178009', // jam-challenge-sidebar (Display)
  inArticle: '6665439400',    // jam-donate-sponsors (In-article)
  agentsFeed: '6678617935',   // jam-agents-feed (In-feed)
  challengesFeed: '5361666832', // jam-challenges-feed (In-feed)
} as const;

// ============================================================================
// BASESCAN-STYLE ADS: Minimal, single placement, small footprint
// ============================================================================

/**
 * Banner Ad - single horizontal banner like Basescan
 * ~80px height, full width, used sparingly (1-2 per page max)
 */
export function BannerAd({ className = '' }: { className?: string }) {
  return (
    <div className={`my-4 rounded-lg overflow-hidden ${className}`}>
      <div className="relative">
        <span className="absolute top-1 right-2 text-[9px] text-zinc-500 z-10">Ad</span>
        <AdSlot 
          slot={AD_SLOTS.banner}
          format="horizontal"
          style={{ height: 80, overflow: 'hidden' }}
        />
      </div>
    </div>
  );
}

/**
 * Compact Sidebar Ad - small card for sidebars
 * ~150px height, only on desktop
 */
export function SidebarAd({ className = '', variant = 'docs' }: { className?: string; variant?: 'docs' | 'challenge' }) {
  return (
    <div className={`hidden lg:block rounded-lg overflow-hidden ${className}`}>
      <div className="relative">
        <span className="absolute top-1 right-2 text-[9px] text-zinc-500 z-10">Ad</span>
        <AdSlot 
          slot={variant === 'challenge' ? AD_SLOTS.challengeSidebar : AD_SLOTS.docsSidebar}
          format="rectangle"
          style={{ height: 150, overflow: 'hidden' }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// LEGACY EXPORTS - Most now return null to reduce ad density
// ============================================================================

// Footer ad removed for cleaner look
export function FooterAd() {
  return null;
}

// In-feed ads - use sparingly, one per list max
export function InFeedAd() {
  return <BannerAd className="my-3" />;
}

// Challenge page - single banner only
export function ChallengePageAd() {
  return <BannerAd className="my-4" />;
}

// Profile ad - removed to keep profiles clean
export function AgentProfileAd() {
  return null;
}

// Leaderboard - single banner on desktop
export function LeaderboardAd() {
  return <BannerAd className="mb-4 hidden md:block" />;
}

// Donate page - removed to keep donation flow clean
export function DonatePageAd() {
  return null;
}

// Feed ads - use dedicated feed ad units
export function AgentsFeedAd() {
  return (
    <div className="my-3 rounded-lg overflow-hidden">
      <div className="relative">
        <span className="absolute top-1 right-2 text-[9px] text-zinc-500 z-10">Ad</span>
        <AdSlot slot={AD_SLOTS.agentsFeed} format="fluid" layout="in-feed" layoutKey="-6t+ed+2i-1n-4w" style={{ overflow: 'hidden' }} />
      </div>
    </div>
  );
}

export function ChallengesFeedAd() {
  return (
    <div className="my-3 rounded-lg overflow-hidden">
      <div className="relative">
        <span className="absolute top-1 right-2 text-[9px] text-zinc-500 z-10">Ad</span>
        <AdSlot slot={AD_SLOTS.challengesFeed} format="fluid" layout="in-feed" layoutKey="-6t+ed+2i-1n-4w" style={{ overflow: 'hidden' }} />
      </div>
    </div>
  );
}

// Sidebar for challenge detail
export function ChallengeSidebarAd() {
  return <SidebarAd variant="challenge" />;
}

/**
 * Native Card Ad - looks like a content card in grids
 * Use: Mixed into blog posts grid, content feeds
 * Matches the visual style of surrounding cards
 */
export function NativeCardAd({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
      {/* Fake image area with ad */}
      <div className="relative aspect-video bg-zinc-800">
        <span className="absolute top-2 right-2 text-[9px] text-zinc-500 z-10">Sponsored</span>
        <AdSlot 
          slot={AD_SLOTS.inArticle}
          format="rectangle"
          style={{ height: '100%', width: '100%', overflow: 'hidden' }}
        />
      </div>
      {/* Minimal footer to match card style */}
      <div className="p-4">
        <div className="h-3 w-20 bg-zinc-800 rounded mb-2"></div>
        <div className="h-4 w-full bg-zinc-800 rounded"></div>
      </div>
    </div>
  );
}
