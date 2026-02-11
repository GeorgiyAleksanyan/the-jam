'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-BFDSVY8Y4N';

// Check if user has consented to analytics cookies
// Defaults to true (opt-out model)
function getAnalyticsConsent(): { analytics: boolean; advertising: boolean } {
  if (typeof window === 'undefined') return { analytics: true, advertising: true };
  try {
    const consent = localStorage.getItem('jam_cookie_consent');
    if (!consent) return { analytics: true, advertising: true }; // Default enabled
    const parsed = JSON.parse(consent);
    return {
      analytics: parsed.analytics !== false, // Default true unless explicitly false
      advertising: parsed.advertising !== false,
    };
  } catch {
    return { analytics: true, advertising: true };
  }
}

export function GoogleAnalytics() {
  // Use lazy initial state for consent check
  const [consent, setConsent] = useState(() => {
    if (typeof window === 'undefined') return { analytics: true, advertising: true };
    return getAnalyticsConsent();
  });
  // Track if component is mounted (for SSR/CSR consistency)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted after hydration - this is intentional for SSR/CSR consistency
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Listen for consent changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'jam_cookie_consent') {
        const newConsent = getAnalyticsConsent();
        setConsent(newConsent);
        
        // Update gtag consent if already loaded
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('consent', 'update', {
            'analytics_storage': newConsent.analytics ? 'granted' : 'denied',
            'ad_storage': newConsent.advertising ? 'granted' : 'denied',
            'ad_personalization': newConsent.advertising ? 'granted' : 'denied',
            'ad_user_data': newConsent.advertising ? 'granted' : 'denied',
          });
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [isMounted]);

  // Don't render in development
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  // Wait for hydration to complete to avoid mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* Google Consent Mode - set defaults before gtag loads */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script id="gtag-consent-default" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          
          // Set default consent to denied
          gtag('consent', 'default', {
            'analytics_storage': '${consent.analytics ? 'granted' : 'denied'}',
            'ad_storage': '${consent.advertising ? 'granted' : 'denied'}',
            'ad_personalization': '${consent.advertising ? 'granted' : 'denied'}',
            'ad_user_data': '${consent.advertising ? 'granted' : 'denied'}',
            'functionality_storage': 'granted',
            'personalization_storage': 'granted',
            'security_storage': 'granted',
            'wait_for_update': 500
          });
        `}
      </Script>

      {/* Google Analytics Script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      
      {/* GA Configuration */}
      <Script id="google-analytics-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}

// Track page views (for client-side navigation)
export function trackPageView(url: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}

// Track custom events
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// Pre-built event trackers for common actions
export const analytics = {
  // User actions
  signUp: () => trackEvent('sign_up', 'engagement'),
  login: () => trackEvent('login', 'engagement'),
  
  // Challenge actions
  viewChallenge: (slug: string) => trackEvent('view_challenge', 'challenges', slug),
  submitSolution: (slug: string) => trackEvent('submit_solution', 'challenges', slug),
  fundChallenge: (slug: string, amount: number) => trackEvent('fund_challenge', 'challenges', slug, amount),
  voteSubmission: (challengeSlug: string) => trackEvent('vote', 'challenges', challengeSlug),
  
  // Agent actions
  viewAgent: (slug: string) => trackEvent('view_agent', 'agents', slug),
  registerAgent: () => trackEvent('register_agent', 'agents'),
  
  // Marketplace
  joinWaitlist: () => trackEvent('join_waitlist', 'marketplace'),
  
  // Donations
  donate: (amount: number) => trackEvent('donate', 'donations', 'crypto', amount),
  
  // Feedback
  submitFeedback: (type: string) => trackEvent('submit_feedback', 'feedback', type),
  
  // Cookie consent
  acceptAllCookies: () => trackEvent('accept_all', 'cookie_consent'),
  acceptEssentialOnly: () => trackEvent('essential_only', 'cookie_consent'),
};
