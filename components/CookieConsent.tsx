'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

type CookieConsent = {
  necessary: boolean;   // Always true - required for site to function
  analytics: boolean;   // Google Analytics
  advertising: boolean; // AdSense
  timestamp: number;
};

interface CookieConsentContextType {
  consent: CookieConsent | null;
  hasConsented: boolean;
  acceptAll: () => void;
  acceptNecessary: () => void;
  updateConsent: (consent: Partial<CookieConsent>) => void;
  showBanner: boolean;
  setShowBanner: (show: boolean) => void;
}

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

const COOKIE_CONSENT_KEY = 'jam_cookie_consent';
const CONSENT_VERSION = 1;

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConsent(parsed);
      } catch {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
    setInitialized(true);
  }, []);

  const saveConsent = (newConsent: CookieConsent) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
    
    // Trigger consent change event for AdSense
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        'analytics_storage': newConsent.analytics ? 'granted' : 'denied',
        'ad_storage': newConsent.advertising ? 'granted' : 'denied',
        'ad_personalization': newConsent.advertising ? 'granted' : 'denied',
        'ad_user_data': newConsent.advertising ? 'granted' : 'denied',
      });
    }
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      advertising: true,
      timestamp: Date.now(),
    });
  };

  const acceptNecessary = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      advertising: false,
      timestamp: Date.now(),
    });
  };

  const updateConsent = (updates: Partial<CookieConsent>) => {
    const newConsent: CookieConsent = {
      necessary: true,
      analytics: consent?.analytics ?? false,
      advertising: consent?.advertising ?? false,
      ...updates,
      timestamp: Date.now(),
    };
    saveConsent(newConsent);
  };

  const hasConsented = consent !== null;

  return (
    <CookieConsentContext.Provider value={{
      consent,
      hasConsented,
      acceptAll,
      acceptNecessary,
      updateConsent,
      showBanner,
      setShowBanner,
    }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function CookieBanner() {
  const { showBanner, acceptAll, acceptNecessary, setShowBanner } = useCookieConsent();
  const [showDetails, setShowDetails] = useState(false);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
      <div className="max-w-4xl mx-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl flex-shrink-0">🍪</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">Cookie Preferences</h3>
              <p className="text-zinc-400 text-sm mb-4">
                We use cookies to enhance your experience, analyze site traffic, and show relevant ads. 
                You can customize your preferences or accept all cookies.
              </p>
              
              {showDetails && (
                <div className="space-y-3 mb-4 p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-sm">Essential Cookies</div>
                      <div className="text-zinc-500 text-xs">Required for site functionality</div>
                    </div>
                    <span className="text-green-400 text-sm">Always On</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-sm">Analytics Cookies</div>
                      <div className="text-zinc-500 text-xs">Help us understand site usage</div>
                    </div>
                    <span className="text-zinc-400 text-sm">Optional</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium text-sm">Advertising Cookies</div>
                      <div className="text-zinc-500 text-xs">Show relevant ads via Google AdSense</div>
                    </div>
                    <span className="text-zinc-400 text-sm">Optional</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={acceptAll}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Accept All
                </button>
                <button
                  onClick={acceptNecessary}
                  className="px-6 py-2.5 bg-zinc-700 text-white font-medium rounded-lg hover:bg-zinc-600 transition-colors"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-4 py-2.5 text-zinc-400 hover:text-white text-sm transition-colors"
                >
                  {showDetails ? 'Hide Details' : 'Customize'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-4 sm:px-6 py-3 bg-zinc-800/50 border-t border-zinc-700 flex flex-wrap gap-4 text-xs text-zinc-500">
          <a href="/legal" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="/legal/gdpr" className="hover:text-white transition-colors">GDPR Rights</a>
          <a href="/legal/ccpa" className="hover:text-white transition-colors">CCPA Rights</a>
        </div>
      </div>
    </div>
  );
}

// Small button to re-open cookie settings
export function CookieSettingsButton() {
  const { setShowBanner } = useCookieConsent();
  
  return (
    <button
      onClick={() => setShowBanner(true)}
      className="text-zinc-500 hover:text-white text-sm transition-colors"
    >
      Cookie Settings
    </button>
  );
}
