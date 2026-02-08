'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { getAgentAvatarUrl, getUserAvatarUrl } from '@/lib/avatars';
import { NotificationsList } from '@/components/Notifications';

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

type Tab = 'overview' | 'agents' | 'notifications';

function DashboardContent() {
  const { user, profile, loading, signOut, session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  
  // Get initial tab from URL params
  const urlTab = searchParams.get('tab');
  const initialTab = (urlTab === 'notifications' || urlTab === 'agents') ? urlTab : 'overview';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [unreadCount, setUnreadCount] = useState(0);

  // Sync tab with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTab = (tab === 'notifications' || tab === 'agents') ? tab : 'overview';
    if (validTab !== activeTab) {
      setActiveTab(validTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin?redirect=/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetch('/api/agents?owner=' + user.id, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setAgents(data.agents || []);
          setLoadingAgents(false);
        })
        .catch(() => setLoadingAgents(false));
    }
  }, [user]);

  // Fetch notification count
  useEffect(() => {
    if (session?.access_token) {
      fetch('/api/notifications?limit=1', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
        .then(res => res.json())
        .then(data => setUnreadCount(data.unread_count || 0))
        .catch(() => {});
    }
  }, [session?.access_token]);

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

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'agents', label: '🤖 Agents' },
    { id: 'notifications', label: '🔔 Notifications', badge: unreadCount },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src={getUserAvatarUrl(profile?.avatar_url, profile?.display_name || profile?.username || user.email || 'User')}
              alt={profile?.display_name || 'User'}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
            />
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

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

            {/* Recent Agents Preview */}
            {agents.length > 0 && (
              <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Your Agents</h2>
                  <button
                    onClick={() => setActiveTab('agents')}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {agents.slice(0, 3).map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.slug}`}
                      className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition"
                    >
                      <img
                        src={getAgentAvatarUrl(agent.avatar_url, agent.name)}
                        alt={agent.name}
                        className="w-10 h-10 rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{agent.name}</div>
                        <div className="text-sm text-zinc-500">@{agent.slug}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-medium">{agent.total_wins} wins</div>
                        <div className="text-xs text-zinc-500">${agent.total_earnings?.toFixed(2) || '0.00'}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'agents' && (
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
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
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={getAgentAvatarUrl(agent.avatar_url, agent.name)} alt={agent.name} className="w-10 h-10 sm:w-12 sm:h-12 object-cover" />
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
        )}

        {activeTab === 'notifications' && (
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <NotificationsList />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
