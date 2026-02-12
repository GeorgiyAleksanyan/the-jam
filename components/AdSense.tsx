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
 * Individual Ad Unit (raw, no wrapper)
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
        style={{ minHeight: 60, ...style }}
      >
        Ad: {slot}
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
// NATIVE-STYLED AD COMPONENTS
// Basescan-inspired: subtle, integrated, professional
// ============================================================================

/**
 * Native Ad Wrapper - provides consistent styling
 */
function NativeAdWrapper({ 
  children, 
  className = '',
  label = 'Sponsored',
  size = 'normal' // 'compact' | 'normal' | 'large'
}: { 
  children: React.ReactNode;
  className?: string;
  label?: string;
  size?: 'compact' | 'normal' | 'large';
}) {
  const sizeClasses = {
    compact: 'p-2',
    normal: 'p-3',
    large: 'p-4'
  };

  return (
    <div className={`
      bg-zinc-900/40 
      border border-zinc-800/50 
      rounded-lg 
      overflow-hidden
      ${sizeClasses[size]}
      ${className}
    `}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className="overflow-hidden rounded">
        {children}
      </div>
    </div>
  );
}

/**
 * Compact Banner - small horizontal strip
 * Use: Between sections, top of pages
 * Height: ~50px
 */
export function CompactBannerAd({ className = '' }: { className?: string }) {
  return (
    <NativeAdWrapper size="compact" className={className}>
      <AdSlot 
        slot="compact-banner"
        format="horizontal"
        style={{ height: 50, overflow: 'hidden' }}
      />
    </NativeAdWrapper>
  );
}

/**
 * Sidebar Card Ad - fits naturally in sidebars
 * Use: Challenge detail sidebar, profile sidebar
 * Height: ~200px
 */
export function SidebarCardAd({ className = '' }: { className?: string }) {
  return (
    <div className={`sticky top-20 hidden lg:block ${className}`}>
      <NativeAdWrapper size="normal">
        <AdSlot 
          slot="sidebar-card"
          format="rectangle"
          style={{ height: 200, overflow: 'hidden' }}
        />
      </NativeAdWrapper>
    </div>
  );
}

/**
 * In-Feed Card Ad - blends with content cards
 * Use: In challenge lists, agent lists
 * Height: ~120px
 */
export function InFeedCardAd({ className = '' }: { className?: string }) {
  return (
    <NativeAdWrapper size="normal" className={`my-4 ${className}`}>
      <AdSlot 
        slot="in-feed-card"
        format="fluid"
        layout="in-article"
        style={{ minHeight: 100, maxHeight: 120, overflow: 'hidden' }}
      />
    </NativeAdWrapper>
  );
}

/**
 * Text Link Ad - minimal, text-style ad
 * Use: Footer area, between text content
 * Height: ~40px
 */
export function TextLinkAd({ className = '' }: { className?: string }) {
  return (
    <div className={`
      bg-zinc-900/30 
      border border-zinc-800/30 
      rounded 
      px-3 py-2
      ${className}
    `}>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Ad</span>
        <div className="flex-1 overflow-hidden">
          <AdSlot 
            slot="text-link"
            format="horizontal"
            style={{ height: 32, overflow: 'hidden' }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Footer Strip Ad - bottom of page, full width but compact
 * Use: Above footer
 * Height: ~60px
 */
export function FooterStripAd({ className = '' }: { className?: string }) {
  return (
    <div className={`border-t border-zinc-800/50 bg-zinc-950/50 ${className}`}>
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider whitespace-nowrap">Sponsored</span>
          <div className="flex-1 overflow-hidden rounded">
            <AdSlot 
              slot="footer-strip"
              format="horizontal"
              style={{ height: 50, overflow: 'hidden' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Challenge Detail Ad - medium rectangle for challenge pages
 * Use: Below challenge description, in sidebar
 * Height: ~250px
 */
export function ChallengeDetailAd({ className = '' }: { className?: string }) {
  return (
    <NativeAdWrapper size="normal" className={`my-6 ${className}`}>
      <AdSlot 
        slot="challenge-detail"
        format="rectangle"
        style={{ height: 250, overflow: 'hidden' }}
      />
    </NativeAdWrapper>
  );
}

// ============================================================================
// LEGACY COMPONENTS (kept for backward compatibility)
// These now use native styling
// ============================================================================

export function FooterAd() {
  return <FooterStripAd className="mt-8" />;
}

export function SidebarAd() {
  return <SidebarCardAd />;
}

export function InFeedAd() {
  return <InFeedCardAd />;
}

export function ChallengePageAd() {
  return <ChallengeDetailAd />;
}

export function AgentProfileAd() {
  return <CompactBannerAd className="mt-6" />;
}

export function LeaderboardAd() {
  return <CompactBannerAd className="mb-6 hidden md:block" />;
}

export function DonatePageAd() {
  return <ChallengeDetailAd />;
}

export function AgentsFeedAd() {
  return <InFeedCardAd />;
}

export function ChallengesFeedAd() {
  return <InFeedCardAd />;
}

export function ChallengeSidebarAd() {
  return <SidebarCardAd />;
}
