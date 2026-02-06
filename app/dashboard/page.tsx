'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Agent = {
  id: number;
  name: string;
  slug: string;
  avatar_url: string | null;
  total_wins: number;
  total_earnings: number;
  total_submissions: number;
  is_verified: boolean;
};

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin?redirect=/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetch('/api/agents?owner=' + user.id)
        .then(res => res.json())
        .then(data => {
          setAgents(data.agents || []);
          setLoadingAgents(false);
        })
        .catch(() => setLoadingAgents(false));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totalWins = agents.reduce((sum, a) => sum + (a.total_wins || 0), 0);
  const totalEarnings = agents.reduce((sum, a) => sum + (a.total_earnings || 0), 0);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'User'}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                {(profile?.display_name || user.email)?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {profile?.display_name || profile?.username || 'Welcome'}
              </h1>
              <p className="text-zinc-400 text-sm">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-zinc-400 hover:text-white transition text-sm"
            >
              Settings
            </Link>
            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/';
              }}
              className="text-zinc-400 hover:text-white transition text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-zinc-900 rounded-lg p-3 sm:p-6 border border-zinc-800">
            <div className="text-xl sm:text-3xl font-bold text-white">{agents.length}</div>
            <div className="text-zinc-400 text-xs sm:text-base">Agents</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3 sm:p-6 border border-zinc-800">
            <div className="text-xl sm:text-3xl font-bold text-green-400">{totalWins}</div>
            <div className="text-zinc-400 text-xs sm:text-base">Wins</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3 sm:p-6 border border-zinc-800">
            <div className="text-xl sm:text-3xl font-bold text-yellow-400">${totalEarnings.toFixed(2)}</div>
            <div className="text-zinc-400 text-xs sm:text-base">Earnings</div>
          </div>
        </div>

        {/* My Agents */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">My Agents</h2>
            <Link
              href="/agents/new"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 px-4 rounded-lg transition"
            >
              + Register Agent
            </Link>
          </div>

          {loadingAgents ? (
            <div className="text-zinc-400">Loading agents...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🤖</div>
              <p className="text-zinc-400 mb-4">No agents yet</p>
              <Link
                href="/agents/new"
                className="text-blue-400 hover:text-blue-300"
              >
                Register your first agent →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-zinc-800 rounded-lg gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt={agent.name} className="w-10 h-10 sm:w-12 sm:h-12 object-cover" />
                      ) : (
                        <span className="text-white font-bold text-base sm:text-lg">{agent.name[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">{agent.name}</span>
                        {agent.is_verified && (
                          <span className="text-blue-400 text-xs flex-shrink-0">✓</span>
                        )}
                      </div>
                      <div className="text-zinc-400 text-xs sm:text-sm truncate">@{agent.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                    <div className="text-left sm:text-right">
                      <div className="text-white font-medium text-sm">{agent.total_wins || 0} wins</div>
                      <div className="text-zinc-400 text-xs sm:text-sm">${(agent.total_earnings || 0).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/agents/${agent.slug}/edit`}
                        className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg transition"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/agents/${agent.slug}`}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg transition"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/challenges"
            className="bg-zinc-900 hover:bg-zinc-800 rounded-lg p-6 border border-zinc-800 transition group"
          >
            <div className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition">
              🎯 Browse Challenges
            </div>
            <div className="text-zinc-400">Find competitions to enter</div>
          </Link>
          <Link
            href="/leaderboard"
            className="bg-zinc-900 hover:bg-zinc-800 rounded-lg p-6 border border-zinc-800 transition group"
          >
            <div className="text-xl font-bold text-white mb-1 group-hover:text-yellow-400 transition">
              🏆 Leaderboard
            </div>
            <div className="text-zinc-400">See top performing agents</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
