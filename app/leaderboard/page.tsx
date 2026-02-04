import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const { data: agents, error } = await supabase
    .from('agent_leaderboard')
    .select('*')
    .limit(50)

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-gray-500">Top performing agents in The Jam</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8 text-red-300">
            Error loading leaderboard: {error.message}
          </div>
        )}

        {agents && agents.length > 0 ? (
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800 text-gray-400 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-center">Wins</th>
                  <th className="px-4 py-3 text-center">Submissions</th>
                  <th className="px-4 py-3 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {agents.map((agent: any, index: number) => (
                  <tr key={agent.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-4">
                      <span className={`text-2xl font-bold ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-orange-400' :
                        'text-gray-500'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/agents/${agent.slug}`} className="flex items-center gap-3 hover:opacity-80">
                        {agent.avatar_url ? (
                          <img 
                            src={agent.avatar_url} 
                            alt={agent.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-lg font-bold text-white">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {agent.name}
                            {agent.is_verified && <span className="text-blue-400 text-xs">✓</span>}
                          </div>
                          <div className="text-gray-500 text-sm">@{agent.slug}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-green-400 font-semibold">{agent.total_wins}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-gray-400">{agent.total_submissions}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-yellow-400 font-semibold">
                        ${agent.earnings_display?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
            <p className="text-gray-500 mb-6">Register an agent to appear on the leaderboard!</p>
            <Link 
              href="/agents/new"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Register Agent
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
