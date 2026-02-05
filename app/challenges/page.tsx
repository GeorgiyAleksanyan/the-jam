import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Challenges - The Jam',
  description: 'Browse coding challenges and compete for crypto prizes.',
}

const ITEMS_PER_PAGE = 12

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; topic?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1'))
  const topicFilter = params.topic

  // Get featured challenges (high prize pool, active)
  const { data: featured } = await supabase
    .from('challenges')
    .select('id, slug, title, short_description, description, difficulty, status, prize_pool, upvotes, submission_count, ends_at, created_at')
    .in('status', ['open', 'active'])
    .gte('prize_pool', 50) // Featured = $50+ prize pool
    .order('prize_pool', { ascending: false })
    .limit(3)

  // Build query for regular challenges
  let query = supabase
    .from('challenges')
    .select('id, slug, title, short_description, description, difficulty, status, prize_pool, upvotes, submission_count, ends_at, created_at', { count: 'exact' })
    .in('status', ['open', 'active', 'voting'])
    .order('created_at', { ascending: false })
    .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)

  // TODO: Add topic filtering via challenge_topics join
  
  const { data: challenges, count, error } = await query

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

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

  // Filter out featured from regular list
  const featuredIds = new Set(featured?.map(c => c.id) || [])
  const regularChallenges = challenges?.filter(c => !featuredIds.has(c.id)) || []

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Challenges</h1>
            <p className="text-gray-500">Compete for crypto prizes • {count || 0} active</p>
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
            <Link
              href="/challenges"
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !topicFilter ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              All
            </Link>
            {topics.map((topic: any) => (
              <Link 
                key={topic.id}
                href={`/challenges?topic=${topic.slug}`}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  topicFilter === topic.slug 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {topic.icon} {topic.name}
              </Link>
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8 text-red-300">
            Error loading challenges: {error.message}
          </div>
        )}

        {/* Featured Section */}
        {featured && featured.length > 0 && page === 1 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-yellow-400">⭐</span> Featured Challenges
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {featured.map((challenge: any) => (
                <Link 
                  key={challenge.id}
                  href={`/challenges/${challenge.slug}`}
                  className="block bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-xl p-5 hover:border-yellow-600 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                    <span className={`text-xs ${getStatusColor(challenge.status)}`}>
                      ● {challenge.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 line-clamp-1">{challenge.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                    {challenge.short_description || challenge.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-400">
                      ${challenge.prize_pool?.toFixed(0) || '0'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {challenge.submission_count} submissions
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Challenges Section */}
        <section>
          <h2 className="text-xl font-bold mb-4">
            {page === 1 ? 'All Challenges' : `Challenges (Page ${page})`}
          </h2>
          
          {regularChallenges.length > 0 ? (
            <div className="space-y-4">
              {regularChallenges.map((challenge: any) => (
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
            <div className="text-center py-16 bg-zinc-900/50 rounded-xl">
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
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            {page > 1 && (
              <Link
                href={`/challenges?page=${page - 1}${topicFilter ? `&topic=${topicFilter}` : ''}`}
                className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                ← Previous
              </Link>
            )}
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }
                
                return (
                  <Link
                    key={pageNum}
                    href={`/challenges?page=${pageNum}${topicFilter ? `&topic=${topicFilter}` : ''}`}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                      pageNum === page 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    {pageNum}
                  </Link>
                )
              })}
            </div>

            {page < totalPages && (
              <Link
                href={`/challenges?page=${page + 1}${topicFilter ? `&topic=${topicFilter}` : ''}`}
                className="px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
