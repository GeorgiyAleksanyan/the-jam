'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function AccountSettings() {
  const { user } = useAuth();
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  if (!user) return null;

  // Get provider info from user metadata
  const providers = user.app_metadata?.providers || [];
  const hasGitHub = providers.includes('github') || user.app_metadata?.provider === 'github';
  const hasEmail = providers.includes('email') || user.app_metadata?.provider === 'email';
  
  // Get identities for more detail
  const identities = user.identities || [];
  const githubIdentity = identities.find(i => i.provider === 'github');
  const _emailIdentity = identities.find(i => i.provider === 'email');

  const handleLinkGitHub = async () => {
    setLinking(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/profile?linked=github`,
        }
      });
      
      if (error) {
        setMessage({ type: 'error', text: error.message });
        setLinking(false);
      }
      // If no error, user will be redirected to GitHub
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to link GitHub' });
      setLinking(false);
    }
  };

  const handleUnlinkGitHub = async () => {
    if (!githubIdentity) return;
    
    // Don't allow unlinking if it's the only identity
    if (identities.length <= 1) {
      setMessage({ type: 'error', text: 'Cannot unlink your only sign-in method' });
      return;
    }

    setLinking(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.unlinkIdentity(githubIdentity);
      
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'GitHub account unlinked' });
        // Refresh the page to update user state
        window.location.reload();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to unlink GitHub' });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Section */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Email</h3>
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white">{user.email}</div>
              <div className="text-zinc-500 text-sm">
                {user.email_confirmed_at ? '✓ Verified' : '⚠ Not verified'}
              </div>
            </div>
            {!hasEmail && hasGitHub && (
              <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-1 rounded">
                From GitHub
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-sm mt-2">
            Your email is used for notifications and account recovery.
            {hasGitHub && !hasEmail && ' It was imported from your GitHub account.'}
          </p>
        </div>
      </div>

      {/* GitHub Connection */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">GitHub</h3>
        <div className="bg-zinc-800 rounded-lg p-4">
          {hasGitHub ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <div>
                  <div className="text-white">
                    {githubIdentity?.identity_data?.user_name || githubIdentity?.identity_data?.preferred_username || 'Connected'}
                  </div>
                  <div className="text-zinc-500 text-sm">✓ Linked</div>
                </div>
              </div>
              {identities.length > 1 && (
                <button
                  onClick={handleUnlinkGitHub}
                  disabled={linking}
                  className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                >
                  {linking ? 'Unlinking...' : 'Unlink'}
                </button>
              )}
            </div>
          ) : (
            <div>
              <p className="text-zinc-400 text-sm mb-3">
                Link your GitHub account to sign in with GitHub and sync your avatar.
              </p>
              <button
                onClick={handleLinkGitHub}
                disabled={linking}
                className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                {linking ? 'Connecting...' : 'Link GitHub Account'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sign-in Methods Summary */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Sign-in Methods</h3>
        <div className="bg-zinc-800 rounded-lg p-4">
          <div className="space-y-2">
            {hasEmail && (
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-green-400">✓</span>
                <span>Email & Password</span>
              </div>
            )}
            {hasGitHub && (
              <div className="flex items-center gap-2 text-zinc-300">
                <span className="text-green-400">✓</span>
                <span>GitHub</span>
              </div>
            )}
          </div>
          {identities.length === 1 && (
            <p className="text-zinc-500 text-sm mt-3">
              💡 Tip: Link another sign-in method for account recovery.
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-900/50 border border-green-700 text-green-300'
            : 'bg-red-900/50 border border-red-700 text-red-300'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
