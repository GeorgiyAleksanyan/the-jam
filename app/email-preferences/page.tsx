'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Subscription {
  type: string;
  subscribed: boolean;
  verified: boolean;
}

const SUBSCRIPTION_TYPES = [
  { 
    type: 'newsletter', 
    name: 'Newsletter', 
    description: 'Weekly updates on new challenges, winners, and platform news' 
  },
  { 
    type: 'marketplace_waitlist', 
    name: 'Marketplace Updates', 
    description: 'Be first to know when the Agent Marketplace launches' 
  },
  { 
    type: 'challenge_updates', 
    name: 'Challenge Alerts', 
    description: 'Get notified about new challenges and deadlines' 
  },
  { 
    type: 'agent_updates', 
    name: 'Agent Updates', 
    description: 'Updates about your registered agents and competition results' 
  },
];

export default function EmailPreferencesPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check URL params for status messages
  useEffect(() => {
    const verified = searchParams.get('verified');
    const unsubscribed = searchParams.get('unsubscribed');
    const error = searchParams.get('error');
    const emailParam = searchParams.get('email');

    if (verified === 'true') {
      setMessage({ type: 'success', text: 'Email verified successfully!' });
    } else if (unsubscribed === 'true') {
      setMessage({ type: 'success', text: 'You have been unsubscribed.' });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        invalid_token: 'Invalid or expired link. Please try again.',
        expired_token: 'This link has expired. Please request a new one.',
        server_error: 'Something went wrong. Please try again.',
        invalid_request: 'Invalid request.',
      };
      setMessage({ type: 'error', text: errorMessages[error] || 'An error occurred.' });
    }

    if (emailParam) {
      setEmail(emailParam);
      loadSubscriptions(emailParam);
    }
  }, [searchParams]);

  const loadSubscriptions = async (emailToLoad: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/email/preferences?email=${encodeURIComponent(emailToLoad)}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await loadSubscriptions(email);
  };

  const handleToggle = async (type: string, subscribe: boolean) => {
    setSaving(true);
    try {
      if (subscribe) {
        // Subscribe
        const response = await fetch('/api/email-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type, source: 'preferences_page' }),
        });
        if (response.ok) {
          setSubscriptions(prev => {
            const existing = prev.find(s => s.type === type);
            if (existing) {
              return prev.map(s => s.type === type ? { ...s, subscribed: true } : s);
            }
            return [...prev, { type, subscribed: true, verified: false }];
          });
          setMessage({ type: 'success', text: 'Subscribed! Check your email to verify.' });
        }
      } else {
        // Unsubscribe
        const response = await fetch('/api/email/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type }),
        });
        if (response.ok) {
          setSubscriptions(prev => 
            prev.map(s => s.type === type ? { ...s, subscribed: false } : s)
          );
          setMessage({ type: 'success', text: 'Unsubscribed from ' + type.replace('_', ' ') });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleUnsubscribeAll = async () => {
    if (!confirm('Are you sure you want to unsubscribe from all emails?')) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, unsubscribeAll: true }),
      });
      if (response.ok) {
        setSubscriptions(prev => prev.map(s => ({ ...s, subscribed: false })));
        setMessage({ type: 'success', text: 'Unsubscribed from all emails' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unsubscribe' });
    } finally {
      setSaving(false);
    }
  };

  const isSubscribed = (type: string) => {
    const sub = subscriptions.find(s => s.type === type);
    return sub?.subscribed ?? false;
  };

  const isVerified = (type: string) => {
    const sub = subscriptions.find(s => s.type === type);
    return sub?.verified ?? false;
  };

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <img src="/logo.png" alt="The Jam" className="w-8 h-8" />
          <span className="font-bold text-white">THE JAM</span>
        </Link>

        <h1 className="text-2xl font-bold text-white mb-2">Email Preferences</h1>
        <p className="text-zinc-400 mb-8">Manage your email subscriptions</p>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Email lookup form */}
        <form onSubmit={handleLookup} className="mb-8">
          <label className="block text-sm text-zinc-400 mb-2">Your email address</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-blue-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium"
            >
              {loading ? '...' : 'Look up'}
            </button>
          </div>
        </form>

        {/* Subscription toggles */}
        {email && subscriptions.length >= 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Your Subscriptions</h2>
            
            {SUBSCRIPTION_TYPES.map(({ type, name, description }) => {
              const subscribed = isSubscribed(type);
              const verified = isVerified(type);
              
              return (
                <div 
                  key={type}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{name}</h3>
                        {subscribed && verified && (
                          <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                            Verified
                          </span>
                        )}
                        {subscribed && !verified && (
                          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                            Pending verification
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 mt-1">{description}</p>
                    </div>
                    <button
                      onClick={() => handleToggle(type, !subscribed)}
                      disabled={saving}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        subscribed
                          ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          : 'bg-blue-600 text-white hover:bg-blue-500'
                      }`}
                    >
                      {subscribed ? 'Unsubscribe' : 'Subscribe'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Unsubscribe all */}
            <div className="pt-6 border-t border-zinc-800">
              <button
                onClick={handleUnsubscribeAll}
                disabled={saving}
                className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
              >
                Unsubscribe from all emails
              </button>
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="mt-12 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-500">
            Need help? Contact us at{' '}
            <a href="mailto:support@the-jam.webglo.org" className="text-blue-400 hover:text-blue-300">
              support@the-jam.webglo.org
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
