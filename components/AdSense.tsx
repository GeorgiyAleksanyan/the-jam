'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

// Your Google AdSense Publisher ID
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-2718034035990801';

// Check if user has consented to advertising cookies
function hasAdConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const consent = localStorage.getItem('jam_cookie_consent');
    if (!consent) return false;
    const parsed = JSON.parse(consent);
    return parsed.advertising === true;
  } catch {
    return false;
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
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    // Check consent on mount
    setShowAd(hasAdConsent());
    
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
  const [loadScript, setLoadScript] = useState(false);

  useEffect(() => {
    setLoadScript(hasAdConsent());
    
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
 * Footer Ad - horizontal banner
 */
export function FooterAd() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <AdSlot 
        slot="footer-banner"
        format="horizontal"
        style={{ minHeight: 90 }}
      />
    </div>
  );
}

/**
 * Sidebar Ad - vertical rectangle
 */
export function SidebarAd() {
  return (
    <div className="sticky top-20">
      <AdSlot 
        slot="sidebar"
        format="vertical"
        style={{ minHeight: 250 }}
      />
    </div>
  );
}

/**
 * In-Feed Ad - for content lists
 */
export function InFeedAd() {
  return (
    <AdSlot 
      slot="in-feed"
      format="fluid"
      layout="in-article"
      style={{ minHeight: 100 }}
      className="my-4"
    />
  );
}

/**
 * Challenge Page Ad - medium rectangle
 */
export function ChallengePageAd() {
  return (
    <div className="my-6">
      <AdSlot 
        slot="challenge-page"
        format="rectangle"
        style={{ minHeight: 250 }}
      />
    </div>
  );
}

/**
 * Agent Profile Ad - horizontal
 */
export function AgentProfileAd() {
  return (
    <div className="mt-6">
      <AdSlot 
        slot="agent-profile"
        format="horizontal"
        style={{ minHeight: 90 }}
      />
    </div>
  );
}

/**
 * Leaderboard Ad - top banner
 */
export function LeaderboardAd() {
  return (
    <div className="mb-6">
      <AdSlot 
        slot="leaderboard"
        format="horizontal"
        style={{ minHeight: 90 }}
      />
    </div>
  );
}

/**
 * Donate Page Ad - medium rectangle
 */
export function DonatePageAd() {
  return (
    <div className="my-6">
      <AdSlot 
        slot="donate-page"
        format="rectangle"
        style={{ minHeight: 250 }}
      />
    </div>
  );
}

/**
 * Agents Feed Ad - in-feed ad for agents list
 */
export function AgentsFeedAd() {
  return (
    <div className="my-4">
      <AdSlot 
        slot="agents-feed"
        format="fluid"
        layout="in-article"
        style={{ minHeight: 100 }}
      />
    </div>
  );
}

/**
 * Challenges Feed Ad - in-feed ad for challenges list
 */
export function ChallengesFeedAd() {
  return (
    <div className="my-4">
      <AdSlot 
        slot="challenges-feed"
        format="fluid"
        layout="in-article"
        style={{ minHeight: 100 }}
      />
    </div>
  );
}

/**
 * Challenge Sidebar Ad - vertical ad for challenge detail page
 */
export function ChallengeSidebarAd() {
  return (
    <div className="sticky top-20">
      <AdSlot 
        slot="challenge-sidebar"
        format="vertical"
        style={{ minHeight: 250 }}
      />
    </div>
  );
}
