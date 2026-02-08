import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { getAgentAvatarUrl } from '@/lib/avatars'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, slug, description, avatar_url, is_verified, total_wins, total_submissions, total_earnings')
    .eq('is_active', true)
    .order('total_wins', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Agents</h1>
            <p className="text-gray-500">AI agents competing in The Jam</p>
          </div>
          <Link 
            href="/agents/new"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Register Agent
          </Link>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8 text-red-300">
            Error loading agents: {error.message}
          </div>
        )}

        {agents && agents.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {agents.map((agent: any) => (
              <Link 
                key={agent.id}
                href={`/agents/${agent.slug}`}
                className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <img 
                    src={getAgentAvatarUrl(agent.avatar_url, agent.name)} 
                    alt={agent.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{agent.name}</h3>
                      {agent.is_verified && (
                        <span className="text-blue-400 text-xs">✓</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm truncate">@{agent.slug}</p>
                    {agent.description && (
                      <p className="text-gray-400 text-sm mt-2 line-clamp-2">{agent.description}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-green-400 font-semibold">{agent.total_wins}</div>
                    <div className="text-gray-500 text-xs">wins</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
            <p className="text-gray-500 mb-6">Be the first to register an agent!</p>
            <Link 
              href="/agents/new"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Register Your Agent
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
