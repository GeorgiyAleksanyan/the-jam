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

type RentalProfile = {
  id?: number;
  is_available: boolean;
  pricing_model: 'task' | 'hourly' | 'subscription' | 'token' | null;
  hourly_rate: number | null;
  task_rate_min: number | null;
  task_rate_max: number | null;
  monthly_rate: number | null;
  token_rate: number | null;
  currency: string;
  accepts_crypto: boolean;
  accepts_fiat: boolean;
  tagline: string;
  skills: string[];
  response_time: 'instant' | 'minutes' | 'hours' | 'days' | null;
  requires_approval: boolean;
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
  max_concurrent_rentals: number;
  stripe_onboarding_complete: boolean;
  stripe_account_id: string | null;
  total_rentals: number;
  avg_rating: number | null;
};

const SKILL_OPTIONS = [
  'coding', 'research', 'writing', 'data-analysis', 'automation',
  'web-scraping', 'api-integration', 'testing', 'debugging', 'devops',
  'frontend', 'backend', 'mobile', 'ai-ml', 'blockchain', 'security'
];

export default function EditAgentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [activeTab, setActiveTab] = useState<'basic' | 'rental'>('basic');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [rentalProfile, setRentalProfile] = useState<RentalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Basic form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletChain, setWalletChain] = useState('ethereum');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [moltbookHandle, setMoltbookHandle] = useState('');

  // Rental form fields
  const [isAvailable, setIsAvailable] = useState(false);
  const [pricingModel, setPricingModel] = useState<'task' | 'hourly' | 'subscription' | 'token'>('task');
  const [hourlyRate, setHourlyRate] = useState('');
  const [taskRateMin, setTaskRateMin] = useState('');
  const [taskRateMax, setTaskRateMax] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [tokenRate, setTokenRate] = useState('');
  const [acceptsCrypto, setAcceptsCrypto] = useState(true);
  const [acceptsFiat, setAcceptsFiat] = useState(false);
  const [tagline, setTagline] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [responseTime, setResponseTime] = useState<'instant' | 'minutes' | 'hours' | 'days'>('hours');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [cancellationPolicy, setCancellationPolicy] = useState<'flexible' | 'moderate' | 'strict'>('moderate');
  const [maxConcurrent, setMaxConcurrent] = useState(1);

  // Fetch agent and rental profile on load
  useEffect(() => {
    if (!slug) return;

    Promise.all([
      fetch(`/api/agents/${slug}`).then(res => res.json()),
      fetch(`/api/agents/${slug}/rental`).then(res => res.json())
    ])
      .then(([agentData, rentalData]) => {
        if (agentData.error) {
          setError(agentData.error);
        } else {
          setAgent(agentData.agent);
          setName(agentData.agent.name || '');
          setDescription(agentData.agent.description || '');
          setAvatarUrl(agentData.agent.avatar_url || '');
          setWebsiteUrl(agentData.agent.website_url || '');
          setGithubRepo(agentData.agent.github_repo || '');
          setWalletAddress(agentData.agent.wallet_address || '');
          setWalletChain(agentData.agent.wallet_chain || 'ethereum');
          setTwitterHandle(agentData.agent.metadata?.twitter_handle || '');
          setMoltbookHandle(agentData.agent.metadata?.moltbook_handle || '');
        }

        if (rentalData.profile) {
          const p = rentalData.profile;
          setRentalProfile(p);
          setIsAvailable(p.is_available);
          setPricingModel(p.pricing_model || 'task');
          setHourlyRate(p.hourly_rate?.toString() || '');
          setTaskRateMin(p.task_rate_min?.toString() || '');
          setTaskRateMax(p.task_rate_max?.toString() || '');
          setMonthlyRate(p.monthly_rate?.toString() || '');
          setTokenRate(p.token_rate?.toString() || '');
          setAcceptsCrypto(p.accepts_crypto);
          setAcceptsFiat(p.accepts_fiat);
          setTagline(p.tagline || '');
          setSkills(p.skills || []);
          setResponseTime(p.response_time || 'hours');
          setRequiresApproval(p.requires_approval);
          setCancellationPolicy(p.cancellation_policy || 'moderate');
          setMaxConcurrent(p.max_concurrent_rentals || 1);
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

  const handleSubmitBasic = async (e: React.FormEvent) => {
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

  const handleSubmitRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/agents/${slug}/rental`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_available: isAvailable,
          pricing_model: pricingModel,
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          task_rate_min: taskRateMin ? parseFloat(taskRateMin) : null,
          task_rate_max: taskRateMax ? parseFloat(taskRateMax) : null,
          monthly_rate: monthlyRate ? parseFloat(monthlyRate) : null,
          token_rate: tokenRate ? parseFloat(tokenRate) : null,
          accepts_crypto: acceptsCrypto,
          accepts_fiat: acceptsFiat,
          tagline,
          skills,
          response_time: responseTime,
          requires_approval: requiresApproval,
          cancellation_policy: cancellationPolicy,
          max_concurrent_rentals: maxConcurrent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update rental settings' });
      } else {
        setMessage({ type: 'success', text: 'Rental settings saved!' });
        setRentalProfile(data.profile);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleStripeConnect = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${slug}/rental/stripe-connect`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start Stripe setup' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
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

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'basic'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('rental')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'rental'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            🏪 Rental Marketplace
            {isAvailable && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">Live</span>}
          </button>
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <form onSubmit={handleSubmitBasic} className="space-y-6">
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
        )}

        {/* Rental Tab */}
        {activeTab === 'rental' && (
          <form onSubmit={handleSubmitRental} className="space-y-6">
            {/* Availability Toggle */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Marketplace Listing</h2>
                  <p className="text-zinc-400 text-sm mt-1">
                    Make your agent available for others to rent
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {isAvailable && rentalProfile && (
                <div className="mt-4 p-4 bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-zinc-400">
                      Rentals: <span className="text-white font-medium">{rentalProfile.total_rentals}</span>
                    </div>
                    {rentalProfile.avg_rating && (
                      <div className="text-zinc-400">
                        Rating: <span className="text-yellow-400 font-medium">⭐ {rentalProfile.avg_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tagline & Skills */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <h2 className="text-xl font-semibold text-white mb-4">Profile</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Tagline <span className="text-zinc-500">(140 chars)</span>
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value.slice(0, 140))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    placeholder="A powerful AI agent that excels at..."
                    maxLength={140}
                  />
                  <div className="text-right text-xs text-zinc-500 mt-1">{tagline.length}/140</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          skills.includes(skill)
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Response Time</label>
                  <select
                    value={responseTime}
                    onChange={(e) => setResponseTime(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="instant">⚡ Instant (automated)</option>
                    <option value="minutes">🚀 Minutes</option>
                    <option value="hours">⏰ Hours</option>
                    <option value="days">📅 Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <h2 className="text-xl font-semibold text-white mb-4">Pricing</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Pricing Model</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'task', label: '📋 Per Task', desc: 'Fixed price per job' },
                      { value: 'hourly', label: '⏱️ Hourly', desc: 'Billed per hour' },
                      { value: 'subscription', label: '🔄 Subscription', desc: 'Monthly access' },
                      { value: 'token', label: '🎫 Token-Based', desc: 'Per 1k tokens' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPricingModel(opt.value as any)}
                        className={`p-3 rounded-lg text-left transition-colors ${
                          pricingModel === opt.value
                            ? 'bg-blue-600 border-blue-500'
                            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                        } border`}
                      >
                        <div className="font-medium text-white">{opt.label}</div>
                        <div className="text-xs text-zinc-400">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic pricing fields based on model */}
                {pricingModel === 'hourly' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Hourly Rate (USD)</label>
                    <div className="flex items-center">
                      <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">$</span>
                      <input
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        placeholder="25.00"
                        step="0.01"
                        min="0"
                      />
                      <span className="ml-2 text-zinc-400">/hour</span>
                    </div>
                  </div>
                )}

                {pricingModel === 'task' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Min Price (USD)</label>
                      <div className="flex items-center">
                        <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">$</span>
                        <input
                          type="number"
                          value={taskRateMin}
                          onChange={(e) => setTaskRateMin(e.target.value)}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                          placeholder="10.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Max Price (USD)</label>
                      <div className="flex items-center">
                        <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">$</span>
                        <input
                          type="number"
                          value={taskRateMax}
                          onChange={(e) => setTaskRateMax(e.target.value)}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                          placeholder="500.00"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {pricingModel === 'subscription' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Monthly Rate (USD)</label>
                    <div className="flex items-center">
                      <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">$</span>
                      <input
                        type="number"
                        value={monthlyRate}
                        onChange={(e) => setMonthlyRate(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        placeholder="99.00"
                        step="0.01"
                        min="0"
                      />
                      <span className="ml-2 text-zinc-400">/month</span>
                    </div>
                  </div>
                )}

                {pricingModel === 'token' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Rate per 1k Tokens (USD)</label>
                    <div className="flex items-center">
                      <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">$</span>
                      <input
                        type="number"
                        value={tokenRate}
                        onChange={(e) => setTokenRate(e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                        placeholder="0.01"
                        step="0.0001"
                        min="0"
                      />
                      <span className="ml-2 text-zinc-400">/1k tokens</span>
                    </div>
                  </div>
                )}

                {/* Payment methods */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Accept Payments</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptsCrypto}
                        onChange={(e) => setAcceptsCrypto(e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-zinc-300">💎 Crypto (USDC)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptsFiat}
                        onChange={(e) => setAcceptsFiat(e.target.checked)}
                        className="w-4 h-4 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-zinc-300">💳 Card (Stripe)</span>
                    </label>
                  </div>
                </div>

                {/* Stripe Connect */}
                {acceptsFiat && (
                  <div className="p-4 bg-zinc-800 rounded-lg">
                    {rentalProfile?.stripe_onboarding_complete ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Stripe Connected
                      </div>
                    ) : (
                      <div>
                        <p className="text-zinc-400 text-sm mb-3">
                          Connect your Stripe account to receive card payments.
                        </p>
                        <button
                          type="button"
                          onClick={handleStripeConnect}
                          disabled={saving}
                          className="bg-[#635bff] hover:bg-[#7a73ff] text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                          </svg>
                          Connect with Stripe
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>

              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="text-white font-medium">Require Approval</div>
                    <div className="text-zinc-400 text-sm">Manually approve each rental request</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Max Concurrent Rentals</label>
                  <input
                    type="number"
                    value={maxConcurrent}
                    onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)}
                    className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    min="1"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Cancellation Policy</label>
                  <select
                    value={cancellationPolicy}
                    onChange={(e) => setCancellationPolicy(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="flexible">Flexible - Full refund within 24h</option>
                    <option value="moderate">Moderate - 50% refund after start</option>
                    <option value="strict">Strict - No refunds after payment</option>
                  </select>
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
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-8 py-3 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Rental Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
