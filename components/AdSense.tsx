'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

// Your Google AdSense Publisher ID
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-2718034035990801';

// Check if user has consented to advertising cookies
// Defaults to true (opt-out model)
function hasAdConsent(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const consent = localStorage.getItem('jam_cookie_consent');
    if (!consent) return true; // Default enabled
    const parsed = JSON.parse(consent);
    return parsed.advertising !== false; // Default true unless explicitly false
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
 * Individual Ad Unit
 * Place these throughout the app where ads should appear
 * Only shows if user has consented to advertising cookies
 */
export function AdSlot({ 
  slot, 
  format = 'auto', 
  layoutKey,
  layout,
  style,
  className = '' 
}: AdSlotProps) {
  // Use lazy initial state for consent check
  const [showAd, setShowAd] = useState(() => {
    if (typeof window === 'undefined') return true;
    return hasAdConsent();
  });

  useEffect(() => {
    // Listen for consent changes
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
    
    // Push ad to AdSense queue after component mounts
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [showAd]);

  // Don't show ads in development
  if (process.env.NODE_ENV === 'development') {
    return (
      <div 
        className={`bg-zinc-900/50 border border-dashed border-zinc-700 rounded-lg flex items-center justify-center text-zinc-600 text-xs ${className}`}
        style={{ minHeight: 90, ...style }}
      >
        Ad: {slot} {!showAd && '(consent required)'}
      </div>
    );
  }

  // Don't render ads without consent
  if (!showAd) {
    return null;
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
 * Include once in layout.tsx to load AdSense globally
 * Only loads if user has consented
 */
export function AdSenseScript() {
  // Use lazy initial state for consent check
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

  if (!loadScript || process.env.NODE_ENV === 'development') {
    return null;
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
    />
  );
}

// Pre-configured ad components for common placements

/**
 * Footer Ad - horizontal banner (smaller on mobile)
 */
export function FooterAd() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8">
      <AdSlot 
        slot="footer-banner"
        format="horizontal"
        style={{ minHeight: 50 }}
        className="md:min-h-[90px]"
      />
    </div>
  );
}

/**
 * Sidebar Ad - vertical rectangle (hidden on mobile)
 */
export function SidebarAd() {
  return (
    <div className="sticky top-20 hidden lg:block">
      <AdSlot 
        slot="sidebar"
        format="vertical"
        style={{ minHeight: 250 }}
      />
    </div>
  );
}

/**
 * In-Feed Ad - for content lists (compact on mobile)
 */
export function InFeedAd() {
  return (
    <AdSlot 
      slot="in-feed"
      format="fluid"
      layout="in-article"
      style={{ minHeight: 60 }}
      className="my-3 sm:my-4 sm:min-h-[100px]"
    />
  );
}

/**
 * Challenge Page Ad - medium rectangle (smaller on mobile)
 */
export function ChallengePageAd() {
  return (
    <div className="my-4 sm:my-6">
      <AdSlot 
        slot="challenge-page"
        format="rectangle"
        style={{ minHeight: 150 }}
        className="sm:min-h-[250px]"
      />
    </div>
  );
}

/**
 * Agent Profile Ad - horizontal (compact on mobile)
 */
export function AgentProfileAd() {
  return (
    <div className="mt-4 sm:mt-6">
      <AdSlot 
        slot="agent-profile"
        format="horizontal"
        style={{ minHeight: 50 }}
        className="sm:min-h-[90px]"
      />
    </div>
  );
}

/**
 * Leaderboard Ad - top banner (hidden on mobile)
 */
export function LeaderboardAd() {
  return (
    <div className="mb-6 hidden md:block">
      <AdSlot 
        slot="leaderboard"
        format="horizontal"
        style={{ minHeight: 90 }}
      />
    </div>
  );
}

/**
 * Donate Page Ad - medium rectangle (smaller on mobile)
 */
export function DonatePageAd() {
  return (
    <div className="my-4 sm:my-6">
      <AdSlot 
        slot="donate-page"
        format="rectangle"
        style={{ minHeight: 150 }}
        className="sm:min-h-[250px]"
      />
    </div>
  );
}

/**
 * Agents Feed Ad - in-feed ad for agents list (compact on mobile)
 */
export function AgentsFeedAd() {
  return (
    <div className="my-3 sm:my-4">
      <AdSlot 
        slot="agents-feed"
        format="fluid"
        layout="in-article"
        style={{ minHeight: 60 }}
        className="sm:min-h-[100px]"
      />
    </div>
  );
}

/**
 * Challenges Feed Ad - in-feed ad for challenges list (compact on mobile)
 */
export function ChallengesFeedAd() {
  return (
    <div className="my-3 sm:my-4">
      <AdSlot 
        slot="challenges-feed"
        format="fluid"
        layout="in-article"
        style={{ minHeight: 60 }}
        className="sm:min-h-[100px]"
      />
    </div>
  );
}

/**
 * Challenge Sidebar Ad - vertical ad for challenge detail page (hidden on mobile)
 */
export function ChallengeSidebarAd() {
  return (
    <div className="sticky top-20 hidden lg:block">
      <AdSlot 
        slot="challenge-sidebar"
        format="vertical"
        style={{ minHeight: 250 }}
      />
    </div>
  );
}
