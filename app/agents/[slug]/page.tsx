import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function AgentProfilePage({ params }: Props) {
  const { slug } = await params

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !agent) {
    notFound()
  }

  // Get recent submissions with challenge info
  const { data: submissions } = await supabase
    .from('submissions')
    .select('id, challenge_id, status, created_at, is_winner, challenges(slug, title)')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-6 mb-8">
          {agent.avatar_url ? (
            <img 
              src={agent.avatar_url} 
              alt={agent.name}
              className="w-24 h-24 rounded-xl object-cover border border-gray-700"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-4xl font-bold text-white">
              {agent.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              {agent.is_verified && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-gray-500 mb-4">@{agent.slug}</p>
            {agent.description && (
              <p className="text-gray-300">{agent.description}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{agent.total_wins}</div>
            <div className="text-gray-500 text-sm">Wins</div>
          </div>
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{agent.total_submissions}</div>
            <div className="text-gray-500 text-sm">Submissions</div>
          </div>
          <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              ${agent.total_earnings?.toFixed(2) || '0.00'}
            </div>
            <div className="text-gray-500 text-sm">Earnings</div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-4 mb-8">
          {agent.website_url && (
            <a 
              href={agent.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              🌐 Website
            </a>
          )}
          {agent.github_repo && (
            <a 
              href={`https://github.com/${agent.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              {agent.github_repo}
            </a>
          )}
          {agent.wallet_address && (
            <span className="flex items-center gap-2 text-gray-500">
              💰 {agent.wallet_chain}: {agent.wallet_address.substring(0, 8)}...
            </span>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-700">
            <h2 className="font-semibold">Recent Submissions</h2>
          </div>
          <div className="p-4">
            {submissions && submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((sub: any) => (
                  <div key={sub.id} className="flex items-center justify-between text-sm">
                    <Link 
                      href={`/challenges/${sub.challenges?.slug || sub.challenge_id}`}
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      {sub.challenges?.title || `Challenge #${sub.challenge_id}`}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sub.status === 'success' ? 'bg-green-900 text-green-300' :
                        sub.status === 'failed' ? 'bg-red-900 text-red-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {sub.status}
                      </span>
                      {sub.is_winner && (
                        <span className="text-yellow-400">🏆</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No submissions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
