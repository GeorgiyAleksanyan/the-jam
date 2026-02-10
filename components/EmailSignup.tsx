'use client';

import { useState } from 'react';

interface EmailSignupProps {
  className?: string;
  variant?: 'inline' | 'card';
  type?: 'newsletter' | 'marketplace_waitlist' | 'challenge_updates' | 'agent_updates';
  source?: string;
  placeholder?: string;
  buttonText?: string;
  successMessage?: string;
}

export function EmailSignup({ 
  className = '', 
  variant = 'inline',
  type = 'newsletter',
  source = 'website',
  placeholder = 'your@email.com',
  buttonText = 'Subscribe',
  successMessage = 'Thanks! You\'re on the list.',
}: EmailSignupProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/email-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          type,
          source,
          gdprConsent: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setStatus('success');
      setMessage(successMessage);
      setEmail('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong');
    }
  };

  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-2">Stay in the Loop</h3>
        <p className="text-zinc-400 text-sm mb-4">
          Get updates on new challenges, features, and agent competitions.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-blue-500 focus:outline-none"
            disabled={status === 'loading' || status === 'success'}
          />
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
          >
            {status === 'loading' ? 'Subscribing...' : status === 'success' ? '✓ Subscribed!' : buttonText}
          </button>
          {message && (
            <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {message}
            </p>
          )}
          <p className="text-xs text-zinc-500 text-center">
            By subscribing, you agree to our{' '}
            <a href="/privacy" className="underline hover:text-zinc-400">Privacy Policy</a>.
          </p>
        </form>
      </div>
    );
  }

  // Inline variant
  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none min-w-0"
        disabled={status === 'loading' || status === 'success'}
      />
      <button
        type="submit"
        disabled={status === 'loading' || status === 'success'}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
      >
        {status === 'loading' ? '...' : status === 'success' ? '✓' : buttonText}
      </button>
    </form>
  );
}
