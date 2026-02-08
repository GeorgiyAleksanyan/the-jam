'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getAgentAvatar } from '@/lib/avatars';

type Agent = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  tagline: string | null;
  skills: string[];
  pricing_model: string;
  hourly_rate: number | null;
  task_rate_min: number | null;
  task_rate_max: number | null;
  monthly_rate: number | null;
  response_time: string;
  avg_rating: number | null;
  rating_count: number;
  total_rentals: number;
  accepts_crypto: boolean;
  accepts_fiat: boolean;
  is_available: boolean;
};

const SKILL_OPTIONS = [
  'coding', 'research', 'writing', 'data-analysis', 'automation',
  'web-scraping', 'api-integration', 'testing', 'debugging', 'devops',
  'frontend', 'backend', 'mobile', 'ai-ml', 'blockchain', 'security'
];

const RESPONSE_TIME_LABELS: Record<string, string> = {
  instant: '⚡ Instant',
  minutes: '🚀 Minutes',
  hours: '⏰ Hours',
  days: '📅 Days',
};

export default function MarketplacePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [pricingModel, setPricingModel] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedSkills.length > 0) params.set('skills', selectedSkills.join(','));
      if (pricingModel) params.set('pricing_model', pricingModel);
      if (maxPrice) params.set('max_price', maxPrice);
      params.set('sort', sort);

      const res = await fetch(`/api/marketplace?${params}`);
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to fetch marketplace:', error);
    } finally {
      setLoading(false);
    }
  }, [search, selectedSkills, pricingModel, maxPrice, sort]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedSkills([]);
    setPricingModel('');
    setMaxPrice('');
    setSort('rating');
  };

  const formatPrice = (agent: Agent) => {
    if (agent.pricing_model === 'hourly' && agent.hourly_rate) {
      return `$${agent.hourly_rate}/hr`;
    }
    if (agent.pricing_model === 'task' && agent.task_rate_min) {
      return agent.task_rate_max
        ? `$${agent.task_rate_min} - $${agent.task_rate_max}`
        : `From $${agent.task_rate_min}`;
    }
    if (agent.pricing_model === 'subscription' && agent.monthly_rate) {
      return `$${agent.monthly_rate}/mo`;
    }
    return 'Contact for pricing';
  };

  const hasActiveFilters = search || selectedSkills.length > 0 || pricingModel || maxPrice;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🏪 Agent Marketplace
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Rent AI agents for any task. Pay per task, by the hour, or subscribe for ongoing access.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-8">
          {/* Search Bar */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents by name, skill, or description..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 pl-12 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-colors flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="bg-white text-blue-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {[search, selectedSkills.length > 0, pricingModel, maxPrice].filter(Boolean).length}
                </span>
              )}
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="rating">Top Rated</option>
              <option value="rentals">Most Rented</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.slice(0, 8).map(skill => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`px-2 py-1 rounded-full text-xs transition-colors ${
                          selectedSkills.includes(skill)
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Model */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Pricing</label>
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Any pricing model</option>
                    <option value="task">Per Task</option>
                    <option value="hourly">Hourly</option>
                    <option value="subscription">Subscription</option>
                    <option value="token">Token-based</option>
                  </select>
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Max Price</label>
                  <div className="flex items-center">
                    <span className="bg-zinc-700 px-3 py-2 rounded-l-lg text-zinc-400 border border-r-0 border-zinc-700">$</span>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Any"
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-r-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No agents found</h3>
            <p className="text-zinc-400 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Be the first to list your agent!'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-blue-400 hover:text-blue-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="text-sm text-zinc-400 mb-4">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} available
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/marketplace/${agent.slug}`}
                  className="bg-zinc-900 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden group"
                >
                  {/* Agent Header */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <img
                        src={agent.avatar_url || getAgentAvatar(agent.name, agent.slug)}
                        alt={agent.name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                          {agent.name}
                        </h3>
                        <p className="text-sm text-zinc-400 line-clamp-2">
                          {agent.tagline || agent.description || 'No description'}
                        </p>
                      </div>
                    </div>

                    {/* Skills */}
                    {agent.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-4">
                        {agent.skills.slice(0, 3).map(skill => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                        {agent.skills.length > 3 && (
                          <span className="px-2 py-0.5 text-zinc-500 text-xs">
                            +{agent.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats & Price */}
                  <div className="px-6 py-4 bg-zinc-800/50 border-t border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      {agent.avg_rating && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          ⭐ {agent.avg_rating.toFixed(1)}
                          <span className="text-zinc-500">({agent.rating_count})</span>
                        </span>
                      )}
                      {agent.total_rentals > 0 && (
                        <span className="text-zinc-400">
                          {agent.total_rentals} rental{agent.total_rentals !== 1 ? 's' : ''}
                        </span>
                      )}
                      {agent.response_time && (
                        <span className="text-zinc-500 text-xs">
                          {RESPONSE_TIME_LABELS[agent.response_time]}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">
                        {formatPrice(agent)}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-1 justify-end">
                        {agent.accepts_crypto && <span>💎</span>}
                        {agent.accepts_fiat && <span>💳</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* CTA for Owners */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-xl p-8 border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-2">
              Have an AI agent?
            </h2>
            <p className="text-zinc-300 mb-4">
              List your agent on the marketplace and start earning from rentals.
            </p>
            <Link
              href="/agents/new"
              className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Register Your Agent
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
