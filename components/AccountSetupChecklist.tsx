'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href?: string;
  icon: React.ReactNode;
}

export default function AccountSetupChecklist({ variant = 'full' }: { variant?: 'full' | 'compact' | 'banner' }) {
  const { user, profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('setup-checklist-dismissed');
    if (isDismissed) setDismissed(true);
  }, []);

  if (!user || !profile) return null;

  const checklist: ChecklistItem[] = [
    {
      id: 'display_name',
      label: 'Add display name',
      description: 'Set a name that appears on your profile',
      completed: !!profile.display_name,
      href: '/profile',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'bio',
      label: 'Write a bio',
      description: 'Tell others about yourself',
      completed: !!profile.bio && profile.bio.length > 10,
      href: '/profile',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
    },
    {
      id: 'github',
      label: 'Connect GitHub',
      description: 'Required to submit solutions',
      completed: !!profile.github_username,
      href: '/profile',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      ),
    },
    {
      id: 'twitter',
      label: 'Verify X/Twitter',
      description: 'Build trust and visibility',
      completed: !!profile.twitter_verified_at,
      href: '/profile',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      id: 'wallet',
      label: 'Add wallet',
      description: 'Receive crypto payouts',
      completed: !!profile.wallet_address,
      href: '/profile',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ];

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  if (isComplete) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('setup-checklist-dismissed', 'true');
    setDismissed(true);
  };

  // Banner variant - responsive for mobile/desktop
  if (variant === 'banner') {
    if (dismissed) return null;
    
    return (
      <div className="bg-gradient-to-r from-blue-900/60 to-purple-900/60 border-b border-blue-800/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          {/* Mobile layout */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <Link href="/profile" className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {completedCount}/{totalCount}
              </div>
              <span className="text-sm text-white truncate">
                Complete profile setup
              </span>
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <button 
              onClick={handleDismiss}
              className="text-zinc-400 hover:text-white p-1"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Desktop layout */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                {completedCount}/{totalCount}
              </div>
              <span className="text-sm text-white">
                Complete your profile to unlock all features
              </span>
              <Link 
                href="/profile" 
                className="text-sm text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
              >
                Continue setup
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="bg-zinc-900 rounded-lg p-3 sm:p-4 border border-zinc-800">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="font-semibold text-white text-sm">Profile Setup</h3>
          <span className="text-xs text-zinc-400">{completedCount}/{totalCount}</span>
        </div>
        
        <div className="h-1.5 sm:h-2 bg-zinc-800 rounded-full mb-2 sm:mb-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {checklist.filter(item => !item.completed).slice(0, 1).map(item => (
          <Link
            key={item.id}
            href={item.href || '/profile'}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <span className="w-4 h-4 rounded-full border border-zinc-600 flex-shrink-0" />
            <span className="truncate">Next: {item.label}</span>
          </Link>
        ))}
      </div>
    );
  }

  // Full variant - responsive grid
  return (
    <div className="bg-zinc-900 rounded-xl p-4 sm:p-6 border border-zinc-800">
      {/* Header - stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white">Complete Your Profile</h2>
          <p className="text-zinc-400 text-sm mt-0.5 sm:mt-1">
            Finish setting up to unlock all features
          </p>
        </div>
        <div className="flex items-center gap-3 sm:block sm:text-right">
          <div className="text-xl sm:text-2xl font-bold text-white">{progressPercent}%</div>
          <div className="text-xs text-zinc-500">{completedCount} of {totalCount} complete</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 sm:h-3 bg-zinc-800 rounded-full mb-4 sm:mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist items - responsive padding */}
      <div className="space-y-2 sm:space-y-3">
        {checklist.map((item) => (
          <Link
            key={item.id}
            href={item.href || '/profile'}
            className={`flex items-center gap-3 p-3 sm:p-4 rounded-lg transition-all ${
              item.completed 
                ? 'bg-zinc-800/30 opacity-60' 
                : 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600'
            }`}
          >
            {/* Checkbox */}
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.completed 
                ? 'bg-green-600' 
                : 'bg-zinc-700 border-2 border-zinc-600'
            }`}>
              {item.completed ? (
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-zinc-400">{item.icon}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-sm sm:text-base ${item.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                {item.label}
              </div>
              <div className="text-xs sm:text-sm text-zinc-500 truncate">{item.description}</div>
            </div>

            {/* Arrow for incomplete items */}
            {!item.completed && (
              <svg className="w-5 h-5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>
        ))}
      </div>

      {/* Mobile CTA */}
      <div className="mt-4 sm:hidden">
        <Link
          href="/profile#basic-info"
          className="block w-full text-center bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
        >
          Continue Setup
        </Link>
      </div>
    </div>
  );
}
