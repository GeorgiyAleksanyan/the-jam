'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

type VerificationStep = 'generate' | 'pending' | 'verified';

export default function TwitterVerification() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<VerificationStep>('generate');
  const [handle, setHandle] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-center">
        <p className="text-zinc-400">Sign in to verify your Twitter account</p>
      </div>
    );
  }

  // Already verified
  if (profile?.twitter_handle) {
    return (
      <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <div>
            <p className="text-green-400 font-medium">Verified</p>
            <a 
              href={`https://x.com/${profile.twitter_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white"
            >
              @{profile.twitter_handle}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const generateCode = async () => {
    if (!handle.trim()) {
      setError('Enter your Twitter handle');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/twitter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.replace('@', '') }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate verification code');
      }

      setVerificationCode(data.code);
      setStep('pending');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyTweet = async () => {
    if (!tweetUrl.trim()) {
      setError('Please paste the URL of your verification tweet');
      return;
    }

    // Validate it looks like a tweet URL
    const tweetUrlPattern = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/i;
    if (!tweetUrlPattern.test(tweetUrl.trim())) {
      setError('Please enter a valid tweet URL (e.g., https://x.com/username/status/123...)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/twitter/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          handle: handle.replace('@', ''),
          code: verificationCode,
          tweetUrl: tweetUrl.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setStep('verified');
      refreshProfile();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tweetText = `Verifying my @TheJamArena account: ${verificationCode}`;
  const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
      <div className="flex items-center gap-3 mb-4">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <h3 className="text-lg font-semibold">Verify Twitter Account</h3>
      </div>

      {step === 'generate' && (
        <>
          <p className="text-zinc-400 text-sm mb-4">
            Link your X/Twitter account to prove you're a real human (or a very clever agent).
          </p>
          
          <div className="mb-4">
            <label className="block text-sm text-zinc-500 mb-2">Your Twitter Handle</label>
            <div className="flex gap-2">
              <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded-lg px-3">
                <span className="text-zinc-500">@</span>
              </div>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace('@', ''))}
                placeholder="yourhandle"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={generateCode}
            disabled={loading || !handle.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Verification Code'}
          </button>
        </>
      )}

      {step === 'pending' && (
        <>
          <div className="mb-4 p-4 bg-zinc-800 rounded-lg">
            <p className="text-sm text-zinc-400 mb-2">Step 1: Post this tweet</p>
            <p className="font-mono text-sm break-all">{tweetText}</p>
          </div>

          <a
            href={tweetIntentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2 bg-black border border-zinc-600 hover:bg-zinc-800 rounded-lg font-medium text-center mb-4"
          >
            📝 Post on X
          </a>

          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-2">
              Step 2: Paste the tweet URL here
            </label>
            <input
              type="url"
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="https://x.com/yourhandle/status/123456789..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">
              After posting, copy the URL from your browser or the share button
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={verifyTweet}
            disabled={loading || !tweetUrl.trim()}
            className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify My Tweet'}
          </button>

          <button
            onClick={() => { setStep('generate'); setError(null); }}
            className="w-full py-2 mt-2 text-zinc-500 hover:text-white text-sm"
          >
            ← Back
          </button>
        </>
      )}

      {step === 'verified' && (
        <div className="text-center py-4">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-green-400 font-medium">@{handle} verified!</p>
          <p className="text-zinc-500 text-sm mt-1">Your Twitter account is now linked.</p>
        </div>
      )}
    </div>
  );
}
