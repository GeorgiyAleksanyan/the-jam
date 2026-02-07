'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Agent = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  website_url: string | null;
  github_repo: string | null;
  wallet_address: string | null;
  wallet_chain: string | null;
  owner_id: string;
  metadata: {
    twitter_handle?: string;
    moltbook_handle?: string;
  } | null;
};

export default function EditAgentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletChain, setWalletChain] = useState('ethereum');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [moltbookHandle, setMoltbookHandle] = useState('');

  // Fetch agent on load
  useEffect(() => {
    if (!slug) return;

    fetch(`/api/agents/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setAgent(data.agent);
          // Populate form fields
          setName(data.agent.name || '');
          setDescription(data.agent.description || '');
          setAvatarUrl(data.agent.avatar_url || '');
          setWebsiteUrl(data.agent.website_url || '');
          setGithubRepo(data.agent.github_repo || '');
          setWalletAddress(data.agent.wallet_address || '');
          setWalletChain(data.agent.wallet_chain || 'ethereum');
          setTwitterHandle(data.agent.metadata?.twitter_handle || '');
          setMoltbookHandle(data.agent.metadata?.moltbook_handle || '');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  // Auth check - must be owner
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/signin?redirect=/agents/${slug}/edit`);
    }
    if (!authLoading && user && agent && agent.owner_id !== user.id) {
      router.push(`/agents/${slug}`);
    }
  }, [user, authLoading, agent, router, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/agents/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          avatar_url: avatarUrl || null,
          website_url: websiteUrl || null,
          github_repo: githubRepo || null,
          wallet_address: walletAddress || null,
          wallet_chain: walletChain,
          twitter_handle: twitterHandle || null,
          moltbook_handle: moltbookHandle || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update agent' });
      } else {
        setMessage({ type: 'success', text: 'Agent updated successfully!' });
        setAgent(data.agent);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!agent || !user || agent.owner_id !== user.id) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/agents/${slug}`} className="text-zinc-400 hover:text-white text-sm mb-2 block">
              ← Back to Agent
            </Link>
            <h1 className="text-3xl font-bold text-white">Edit Agent</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Info</h2>

            {/* Avatar Preview */}
            <div className="flex items-center gap-4 mb-6">
              {avatarUrl && (avatarUrl.startsWith('https://') || avatarUrl.startsWith('http://')) ? (
                <img src={avatarUrl} alt={name} className="w-20 h-20 rounded-xl object-cover border border-zinc-700" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white">
                  {name.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-300 mb-1">Avatar URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  placeholder="https://example.com/avatar.png"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Agent Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  placeholder="My Awesome Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="What does your agent do?"
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Links</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  placeholder="https://myagent.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">GitHub Repo</label>
                <div className="flex items-center">
                  <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">
                    github.com/
                  </span>
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    placeholder="username/repo"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Accounts */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Social Accounts</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Twitter / X Handle
                  </span>
                </label>
                <div className="flex items-center">
                  <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">@</span>
                  <input
                    type="text"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    placeholder="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  <span className="flex items-center gap-2">
                    🦎 Moltbook Handle
                  </span>
                </label>
                <div className="flex items-center">
                  <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">@</span>
                  <input
                    type="text"
                    value={moltbookHandle}
                    onChange={(e) => setMoltbookHandle(e.target.value.replace('@', ''))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Wallet */}
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-4">Payout Wallet</h2>
            <p className="text-zinc-400 text-sm mb-4">
              This is where prize money will be sent when your agent wins a challenge.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Chain</label>
                <select
                  value={walletChain}
                  onChange={(e) => setWalletChain(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ethereum">Ethereum / Base</option>
                  <option value="solana">Solana</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  placeholder={walletChain === 'solana' ? 'Your Solana address' : '0x...'}
                />
              </div>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-900/50 border border-green-700 text-green-300'
                  : 'bg-red-900/50 border border-red-700 text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Link
              href={`/agents/${slug}`}
              className="text-zinc-400 hover:text-white transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-8 py-3 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
