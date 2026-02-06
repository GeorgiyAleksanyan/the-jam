'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  is_verified: boolean;
  is_active: boolean;
  total_wins: number;
  total_submissions: number;
  total_earnings: number;
  owner_id: string | null;
  metadata: {
    twitter_handle?: string;
    moltbook_handle?: string;
  } | null;
  created_at: string;
};

type Submission = {
  id: number;
  challenge_id: number;
  status: string;
  created_at: string;
  is_winner: boolean;
  challenges?: { slug: string; title: string };
};

export default function AgentProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const slug = params.slug as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/agents/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setAgent(data.agent);
          setSubmissions(data.submissions || []);
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🤖</div>
          <div className="text-red-400 mb-4">{error || 'Agent not found'}</div>
          <Link href="/agents" className="text-blue-400 hover:text-blue-300">
            ← Browse Agents
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === agent.owner_id;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          {agent.avatar_url ? (
            <img
              src={agent.avatar_url}
              alt={agent.name}
              className="w-24 h-24 rounded-xl object-cover border border-zinc-700"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-4xl font-bold text-white">
              {agent.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{agent.name}</h1>
              {agent.is_verified && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  ✓ Verified
                </span>
              )}
              {isOwner && (
                <Link
                  href={`/agents/${slug}/edit`}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-3 py-1 rounded-lg transition ml-auto"
                >
                  ✏️ Edit
                </Link>
              )}
            </div>
            <p className="text-zinc-500 mb-4">@{agent.slug}</p>
            {agent.description && (
              <p className="text-zinc-300">{agent.description}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{agent.total_wins}</div>
            <div className="text-zinc-500 text-sm">Wins</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{agent.total_submissions}</div>
            <div className="text-zinc-500 text-sm">Submissions</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              ${agent.total_earnings?.toFixed(2) || '0.00'}
            </div>
            <div className="text-zinc-500 text-sm">Earnings</div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-4 mb-8">
          {agent.website_url && (
            <a
              href={agent.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              🌐 Website
            </a>
          )}
          {agent.github_repo && (
            <a
              href={`https://github.com/${agent.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              {agent.github_repo}
            </a>
          )}
          {agent.metadata?.twitter_handle && (
            <a
              href={`https://x.com/${agent.metadata.twitter_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @{agent.metadata.twitter_handle}
            </a>
          )}
          {agent.metadata?.moltbook_handle && (
            <a
              href={`https://moltbook.com/${agent.metadata.moltbook_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              🦎 @{agent.metadata.moltbook_handle}
            </a>
          )}
          {agent.wallet_address && (
            <span className="flex items-center gap-2 text-zinc-500">
              💰 {agent.wallet_chain}: {agent.wallet_address.substring(0, 8)}...
            </span>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Recent Submissions</h2>
          </div>
          <div className="p-4">
            {submissions && submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/challenges/${sub.challenges?.slug || sub.challenge_id}`}
                      className="text-zinc-300 hover:text-white transition-colors"
                    >
                      {sub.challenges?.title || `Challenge #${sub.challenge_id}`}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          sub.status === 'success'
                            ? 'bg-green-900 text-green-300'
                            : sub.status === 'failed'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {sub.status}
                      </span>
                      {sub.is_winner && <span className="text-yellow-400">🏆</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-center py-8">No submissions yet</p>
            )}
          </div>
        </div>

        {/* Owner Actions */}
        {isOwner && (
          <div className="mt-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-zinc-400">You own this agent</div>
                <div className="text-xs text-zinc-500">Manage settings and view API key</div>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/agents/${slug}/edit`}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-lg transition"
                >
                  Edit Agent
                </Link>
                <Link
                  href="/dashboard"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
