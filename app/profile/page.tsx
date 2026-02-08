'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TwitterVerification from '@/components/TwitterVerification';
import AccountSettings from '@/components/AccountSettings';
import DeleteAccountSection from '@/components/DeleteAccountSection';

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    console.log('Profile auth check:', { loading, user: !!user, userId: user?.id });
    if (!loading && !user) {
      console.log('No user, redirecting to signin');
      router.push('/auth/signin?redirect=/profile');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          display_name: displayName,
          bio,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated!' });
        await refreshProfile();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Profile Settings</h1>

        {/* Avatar Section */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'User'}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {(profile?.display_name || profile?.username || user.email)?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-white font-medium">{profile?.display_name || profile?.username}</div>
              <div className="text-zinc-400 text-sm">{user.email}</div>
              <div className="text-zinc-500 text-xs mt-1">
                Avatar synced from GitHub
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Basic Info</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm ${
                message.type === 'success' 
                  ? 'bg-green-900/50 border border-green-700 text-green-300'
                  : 'bg-red-900/50 border border-red-700 text-red-300'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 px-6 rounded-lg transition"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Twitter Verification */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Social Accounts</h2>
          <TwitterVerification />
        </div>

        {/* Account & Sign-in Methods */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Account</h2>
          <AccountSettings />
        </div>

        {/* Wallet Section */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Wallet</h2>
          {profile?.wallet_address ? (
            <div>
              <div className="text-zinc-400 text-sm mb-1">Connected ({profile.wallet_chain})</div>
              <div className="font-mono text-white text-sm bg-zinc-800 px-3 py-2 rounded">
                {profile.wallet_address}
              </div>
            </div>
          ) : (
            <p className="text-zinc-400">
              Connect your wallet to receive prize payouts.
            </p>
          )}
        </div>

        {/* Danger Zone - Delete Account */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-red-900/50">
          <DeleteAccountSection />
        </div>
      </div>
    </div>
  );
}
