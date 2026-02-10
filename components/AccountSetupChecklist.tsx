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
  action?: string;
}

export default function AccountSetupChecklist({ variant = 'full' }: { variant?: 'full' | 'compact' | 'banner' }) {
  const { user, profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user dismissed the banner this session
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
    },
    {
      id: 'bio',
      label: 'Write a bio',
      description: 'Tell others about yourself',
      completed: !!profile.bio && profile.bio.length > 10,
      href: '/profile',
    },
    {
      id: 'github',
      label: 'Connect GitHub',
      description: 'Required to submit solutions',
      completed: !!profile.github_username,
      href: '/profile',
      action: 'Link GitHub account',
    },
    {
      id: 'twitter',
      label: 'Verify X/Twitter',
      description: 'Build trust and visibility',
      completed: !!profile.twitter_verified_at,
      href: '/profile',
    },
    {
      id: 'wallet',
      label: 'Add wallet address',
      description: 'Receive crypto prize payouts',
      completed: !!profile.wallet_address,
      href: '/profile',
    },
  ];

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isComplete = completedCount === totalCount;

  // Don't show if complete
  if (isComplete) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('setup-checklist-dismissed', 'true');
    setDismissed(true);
  };

  // Banner variant - shows at top of pages
  if (variant === 'banner') {
    if (dismissed) return null;
    
    return (
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-b border-blue-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
                {completedCount}/{totalCount}
              </div>
              <span className="text-sm text-white">
                Complete your profile to unlock all features
              </span>
            </div>
            <Link 
              href="/profile" 
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              Continue setup →
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
    );
  }

  // Compact variant - shows in sidebar or dashboard
  if (variant === 'compact') {
    return (
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm">Profile Setup</h3>
          <span className="text-xs text-zinc-400">{completedCount}/{totalCount}</span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-zinc-800 rounded-full mb-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Next incomplete item */}
        {checklist.filter(item => !item.completed).slice(0, 1).map(item => (
          <Link
            key={item.id}
            href={item.href || '/profile'}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <span className="w-4 h-4 rounded-full border border-zinc-600 flex-shrink-0" />
            <span>Next: {item.label}</span>
          </Link>
        ))}
      </div>
    );
  }

  // Full variant - detailed checklist
  return (
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Complete Your Profile</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Finish setting up to unlock all features
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{progressPercent}%</div>
          <div className="text-xs text-zinc-500">{completedCount} of {totalCount}</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-zinc-800 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {checklist.map((item, index) => (
          <Link
            key={item.id}
            href={item.href || '/profile'}
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
              item.completed 
                ? 'bg-zinc-800/50' 
                : 'bg-zinc-800 hover:bg-zinc-700 cursor-pointer'
            }`}
          >
            {/* Checkbox */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              item.completed 
                ? 'bg-green-600' 
                : 'border-2 border-zinc-600'
            }`}>
              {item.completed && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${item.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                {item.label}
              </div>
              <div className="text-sm text-zinc-500">{item.description}</div>
            </div>

            {/* Arrow for incomplete items */}
            {!item.completed && (
              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
