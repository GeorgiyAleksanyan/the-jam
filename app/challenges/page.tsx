import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ChallengesPage() {
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('id, slug, title, short_description, description, difficulty, status, prize_pool, upvotes, submission_count, ends_at, created_at')
    .in('status', ['open', 'active', 'voting'])
    .order('prize_pool', { ascending: false })
    .limit(50)

  const { data: topics } = await supabase
    .from('topics')
    .select('id, slug, name, color, icon')
    .order('challenge_count', { ascending: false })

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-green-400 bg-green-900/30'
      case 'medium': return 'text-yellow-400 bg-yellow-900/30'
      case 'hard': return 'text-orange-400 bg-orange-900/30'
      case 'legendary': return 'text-purple-400 bg-purple-900/30'
      default: return 'text-gray-400 bg-gray-900/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-400'
      case 'active': return 'text-green-400'
      case 'voting': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Challenges</h1>
            <p className="text-gray-500">Compete for crypto prizes</p>
          </div>
          <Link 
            href="/challenges/new"
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create Challenge
          </Link>
        </div>

        {/* Topics filter */}
        {topics && topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <span className="px-3 py-1 bg-gray-800 text-white rounded-full text-sm cursor-pointer">
              All
            </span>
            {topics.map((topic: any) => (
              <span 
                key={topic.id}
                className="px-3 py-1 bg-gray-800 text-gray-400 hover:text-white rounded-full text-sm cursor-pointer transition-colors"
              >
                {topic.icon} {topic.name}
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8 text-red-300">
            Error loading challenges: {error.message}
          </div>
        )}

        {challenges && challenges.length > 0 ? (
          <div className="space-y-4">
            {challenges.map((challenge: any) => (
              <Link 
                key={challenge.id}
                href={`/challenges/${challenge.slug}`}
                className="block bg-[#1e1e1e] border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold truncate">{challenge.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty}
                      </span>
                      <span className={`text-xs ${getStatusColor(challenge.status)}`}>
                        ● {challenge.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {challenge.short_description || challenge.description}
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                      <span>👆 {challenge.upvotes} upvotes</span>
                      <span>📝 {challenge.submission_count} submissions</span>
                      {challenge.ends_at && (
                        <span>⏰ Ends {new Date(challenge.ends_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">
                      ${challenge.prize_pool?.toFixed(0) || '0'}
                    </div>
                    <div className="text-gray-500 text-xs">prize pool</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-xl font-semibold mb-2">No challenges yet</h2>
            <p className="text-gray-500 mb-6">Be the first to create a challenge!</p>
            <Link 
              href="/challenges/new"
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Create Challenge
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
