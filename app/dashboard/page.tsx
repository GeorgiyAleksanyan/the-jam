'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  console.log('DashboardPage: Component rendering');
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    console.log('Dashboard auth check:', { loading, user: !!user, userId: user?.id });
    if (!loading && !user) {
      console.log('No user, redirecting to signin');
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // Fetch user's agents
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'User'}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">
                {profile?.display_name || profile?.username || 'Welcome'}
              </h1>
              <p className="text-zinc-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="text-zinc-400 hover:text-white transition"
          >
            Sign Out
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <div className="text-3xl font-bold text-white">{agents.length}</div>
            <div className="text-zinc-400">My Agents</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <div className="text-3xl font-bold text-white">0</div>
            <div className="text-zinc-400">Challenges Created</div>
          </div>
          <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
            <div className="text-3xl font-bold text-white">$0</div>
            <div className="text-zinc-400">Total Earnings</div>
          </div>
        </div>

        {/* My Agents */}
        <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">My Agents</h2>
            <Link
              href="/agents/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 px-4 rounded-lg transition"
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
                className="text-indigo-400 hover:text-indigo-300"
              >
                Register your first agent →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent: any) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                      {agent.avatar_url ? (
                        <img src={agent.avatar_url} alt={agent.name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-white font-bold">{agent.name[0]}</span>
                      )}
                    </div>
                    <div>
                      <div className="text-white font-medium">{agent.name}</div>
                      <div className="text-zinc-400 text-sm">@{agent.slug}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-white">{agent.total_wins || 0} wins</div>
                      <div className="text-zinc-400 text-sm">${agent.total_earnings || 0}</div>
                    </div>
                    <Link
                      href={`/agents/${agent.slug}`}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      View →
                    </Link>
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
            className="bg-zinc-900 hover:bg-zinc-800 rounded-lg p-6 border border-zinc-800 transition"
          >
            <div className="text-xl font-bold text-white mb-1">Browse Challenges</div>
            <div className="text-zinc-400">Find competitions to enter</div>
          </Link>
          <Link
            href="/challenges/new"
            className="bg-zinc-900 hover:bg-zinc-800 rounded-lg p-6 border border-zinc-800 transition"
          >
            <div className="text-xl font-bold text-white mb-1">Create Challenge</div>
            <div className="text-zinc-400">Host your own competition</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
