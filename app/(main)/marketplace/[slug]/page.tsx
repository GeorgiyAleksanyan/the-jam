'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateAgentAvatar } from '@/lib/avatars';
import { useAuth } from '@/lib/auth-context';
import RentModal from '@/components/RentModal';

type AgentProfile = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  website_url: string | null;
  github_repo: string | null;
  owner_id: string;
  rental: {
    tagline: string | null;
    skills: string[];
    pricing_model: string;
    hourly_rate: number | null;
    task_rate_min: number | null;
    task_rate_max: number | null;
    monthly_rate: number | null;
    token_rate: number | null;
    currency: string;
    response_time: string;
    accepts_crypto: boolean;
    accepts_fiat: boolean;
    requires_approval: boolean;
    cancellation_policy: string;
    avg_rating: number | null;
    rating_count: number;
    total_rentals: number;
    completion_rate: number | null;
    is_available: boolean;
  };
  reviews: Array<{
    id: number;
    overall_rating: number;
    review_text: string | null;
    reviewer_name: string;
    created_at: string;
  }>;
};

const RESPONSE_TIME_LABELS: Record<string, string> = {
  instant: '⚡ Instant (automated)',
  minutes: '🚀 Within minutes',
  hours: '⏰ Within hours',
  days: '📅 Within a day or two',
};

const CANCELLATION_LABELS: Record<string, string> = {
  flexible: 'Full refund within 24 hours',
  moderate: '50% refund after work starts',
  strict: 'No refunds after payment',
};

export default function MarketplaceAgentPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuth();

  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRentModal, setShowRentModal] = useState(false);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/marketplace/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setAgent(data.agent);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-white mb-2">Agent Not Found</h2>
          <p className="text-zinc-400 mb-4">{error || 'This agent is not available for rental.'}</p>
          <Link href="/marketplace" className="text-blue-400 hover:text-blue-300">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = () => {
    const r = agent.rental;
    if (r.pricing_model === 'hourly' && r.hourly_rate) {
      return `$${r.hourly_rate}/hour`;
    }
    if (r.pricing_model === 'task' && r.task_rate_min) {
      return r.task_rate_max
        ? `$${r.task_rate_min} - $${r.task_rate_max}`
        : `From $${r.task_rate_min}`;
    }
    if (r.pricing_model === 'subscription' && r.monthly_rate) {
      return `$${r.monthly_rate}/month`;
    }
    if (r.pricing_model === 'token' && r.token_rate) {
      return `$${r.token_rate}/1k tokens`;
    }
    return 'Contact for pricing';
  };

  const isOwner = user?.id === agent.owner_id;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link href="/marketplace" className="text-zinc-400 hover:text-white text-sm mb-6 block">
          ← Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agent Header */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-start gap-6">
                <img
                  src={agent.avatar_url || generateAgentAvatar(agent.name)}
                  alt={agent.name}
                  className="w-24 h-24 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
                    {agent.rental.is_available ? (
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                        Available
                      </span>
                    ) : (
                      <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full">
                        Busy
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-zinc-300 mb-4">
                    {agent.rental.tagline || agent.description || 'No description'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    {agent.rental.avg_rating && (
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">⭐ {agent.rental.avg_rating.toFixed(1)}</span>
                        <span className="text-zinc-500">({agent.rental.rating_count} reviews)</span>
                      </div>
                    )}
                    <div className="text-zinc-400">
                      {agent.rental.total_rentals} rentals completed
                    </div>
                    {agent.rental.completion_rate && (
                      <div className="text-zinc-400">
                        {Math.round(agent.rental.completion_rate)}% completion rate
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            {agent.rental.skills.length > 0 && (
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <h2 className="text-xl font-semibold text-white mb-4">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {agent.rental.skills.map(skill => (
                    <span
                      key={skill}
                      className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {agent.description && (
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <h2 className="text-xl font-semibold text-white mb-4">About</h2>
                <p className="text-zinc-300 whitespace-pre-wrap">{agent.description}</p>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <h2 className="text-xl font-semibold text-white mb-4">
                Reviews {agent.rental.rating_count > 0 && `(${agent.rental.rating_count})`}
              </h2>

              {agent.reviews.length === 0 ? (
                <p className="text-zinc-500">No reviews yet. Be the first to rent this agent!</p>
              ) : (
                <div className="space-y-4">
                  {agent.reviews.map(review => (
                    <div key={review.id} className="border-b border-zinc-800 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-yellow-400">
                          {'⭐'.repeat(review.overall_rating)}
                        </div>
                        <span className="text-zinc-400 text-sm">{review.reviewer_name}</span>
                        <span className="text-zinc-600 text-sm">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {review.review_text && (
                        <p className="text-zinc-300">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Pricing & Rent */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 sticky top-6">
              <div className="text-3xl font-bold text-white mb-2">
                {formatPrice()}
              </div>
              <div className="text-sm text-zinc-400 mb-6 capitalize">
                {agent.rental.pricing_model} pricing
              </div>

              {/* Payment Methods */}
              <div className="flex items-center gap-4 mb-6 text-sm text-zinc-400">
                {agent.rental.accepts_crypto && (
                  <span className="flex items-center gap-1">💎 USDC</span>
                )}
                {agent.rental.accepts_fiat && (
                  <span className="flex items-center gap-1">💳 Card</span>
                )}
              </div>

              {/* CTA */}
              {isOwner ? (
                <Link
                  href={`/agents/${slug}/edit?tab=rental`}
                  className="block w-full text-center bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded-lg transition-colors mb-4"
                >
                  Edit Rental Settings
                </Link>
              ) : (
                <button
                  onClick={() => setShowRentModal(true)}
                  disabled={!agent.rental.is_available}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mb-4"
                >
                  {agent.rental.is_available ? 'Rent This Agent' : 'Not Available'}
                </button>
              )}

              {/* Info */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Response time</span>
                  <span className="text-white">
                    {RESPONSE_TIME_LABELS[agent.rental.response_time] || agent.rental.response_time}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Approval</span>
                  <span className="text-white">
                    {agent.rental.requires_approval ? 'Required' : 'Instant'}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cancellation</span>
                  <span className="text-white">
                    {CANCELLATION_LABELS[agent.rental.cancellation_policy] || agent.rental.cancellation_policy}
                  </span>
                </div>
              </div>

              {/* Links */}
              <div className="mt-6 pt-6 border-t border-zinc-800 space-y-2">
                {agent.website_url && (
                  <a
                    href={agent.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                )}
                {agent.github_repo && (
                  <a
                    href={`https://github.com/${agent.github_repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub
                  </a>
                )}
                <Link
                  href={`/agents/${slug}`}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Full Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TODO: Rent Modal - Phase 4 */}
      {showRentModal && (
        <RentModal
          agent={agent}
          onClose={() => setShowRentModal(false)}
          onSuccess={(data) => {
            setShowRentModal(false);
            router.push(`/rentals/${data.rental.id}`);
          }}
        />
      )}
    </div>
  );
}
