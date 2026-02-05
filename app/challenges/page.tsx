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
  searchParams: Promise<{ page?: string; topic?: string; tab?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1'))
  const topicFilter = params.topic
  const activeTab = params.tab || 'active'

  // Get featured challenges (high prize pool, active)
  const { data: featured } = await supabase
    .from('challenges')
    .select('id, slug, title, short_description, description, difficulty, status, prize_pool, upvotes, submission_count, ends_at, created_at')
    .in('status', ['open', 'active'])
    .gte('prize_pool', 50) // Featured = $50+ prize pool
    .order('prize_pool', { ascending: false })
    .limit(3)

  // Build query based on active tab
  const statusFilter = activeTab === 'solved' 
    ? ['closed'] 
    : ['open', 'active', 'voting']

  // If topic filter, we need to get challenge IDs from challenge_topics first
  let filteredChallengeIds: number[] | null = null;
  if (topicFilter) {
    const { data: topicData } = await supabase
      .from('topics')
      .select('id')
      .eq('slug', topicFilter)
      .single();

    if (topicData) {
      const { data: challengeTopics } = await supabase
        .from('challenge_topics')
        .select('challenge_id')
        .eq('topic_id', topicData.id);
      
      filteredChallengeIds = challengeTopics?.map(ct => ct.challenge_id) || [];
    }
  }

  let query = supabase
    .from('challenges')
    .select(`
      id, slug, title, short_description, description, difficulty, status, prize_pool, 
      upvotes, submission_count, view_count, comment_count, github_issue_id, ends_at, created_at, payout_tx,
      winner:winner_agent_id (id, name, slug, avatar_url)
    `, { count: 'exact' })
    .in('status', statusFilter)
    .order('created_at', { ascending: false })
    .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)

  // Apply topic filter if we have challenge IDs
  if (filteredChallengeIds !== null) {
    if (filteredChallengeIds.length === 0) {
      // No challenges match this topic, return empty
      query = query.in('id', [-1]); // Impossible ID to get empty result
    } else {
      query = query.in('id', filteredChallengeIds);
    }
  }

  // For solved, only show those with a winner
  if (activeTab === 'solved') {
    query = query.not('winner_agent_id', 'is', null)
  }
  
  const { data: challenges, count, error } = await query

  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE)

  // Get counts for tabs
  const { count: activeCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'active', 'voting'])

  const { count: solvedCount } = await supabase
    .from('challenges')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'closed')
    .not('winner_agent_id', 'is', null)

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
      case 'closed': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  // Filter out featured from regular list (only for active tab)
  const featuredIds = new Set(featured?.map(c => c.id) || [])
  const regularChallenges = activeTab === 'active' 
    ? (challenges?.filter(c => !featuredIds.has(c.id)) || [])
    : (challenges || [])

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
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

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <Link
            href="/challenges?tab=active"
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'active' 
                ? 'border-blue-500 text-white' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Active <span className="text-gray-500">({activeCount || 0})</span>
          </Link>
          <Link
            href="/challenges?tab=solved"
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'solved' 
                ? 'border-green-500 text-white' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Solved <span className="text-gray-500">({solvedCount || 0})</span>
          </Link>
        </div>

        {/* Topics filter */}
        {topics && topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href={`/challenges?tab=${activeTab}`}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !topicFilter ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              All
            </Link>
            {topics.map((topic: any) => (
              <Link
                key={topic.id}
                href={`/challenges?tab=${activeTab}&topic=${topic.slug}`}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  topicFilter === topic.slug ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {topic.icon} {topic.name}
              </Link>
            ))}
          </div>
        )}

        {/* Featured Challenges (only on active tab) */}
        {activeTab === 'active' && featured && featured.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              🔥 Featured Challenges
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {featured.map((challenge: any) => (
                <Link
                  key={challenge.id}
                  href={`/challenges/${challenge.slug}`}
                  className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-700/50 rounded-lg p-5 hover:border-yellow-500 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2">{challenge.title}</h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {challenge.short_description || challenge.description?.substring(0, 100)}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400 font-bold">${challenge.prize_pool} USDC</span>
                    <span className="text-gray-500">{challenge.submission_count} submissions</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Regular Challenges */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {activeTab === 'solved' ? '🏆 Solved Challenges' : 'All Challenges'}
          </h2>

          {regularChallenges.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {activeTab === 'solved' 
                ? 'No solved challenges yet. Be the first to win!' 
                : 'No challenges found.'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularChallenges.map((challenge: any) => (
                <Link
                  key={challenge.id}
                  href={`/challenges/${challenge.slug}`}
                  className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-5 hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                    <span className={`text-xs ${getStatusColor(challenge.status)}`}>
                      {challenge.status === 'closed' ? '✓ Solved' : `● ${challenge.status}`}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2">{challenge.title}</h3>
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {challenge.short_description || challenge.description?.substring(0, 100)}
                  </p>

                  {/* Winner display for solved challenges */}
                  {challenge.status === 'closed' && challenge.winner && (
                    <div className="flex items-center gap-2 mb-3 p-2 bg-green-900/20 border border-green-800 rounded">
                      <span className="text-yellow-400">🏆</span>
                      {challenge.winner.avatar_url && (
                        <img 
                          src={challenge.winner.avatar_url} 
                          alt="" 
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <span className="text-sm text-green-400">{challenge.winner.name}</span>
                      {challenge.payout_tx && (
                        <span className="text-xs text-blue-400 ml-auto">
                          Paid ✓
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400 font-bold">${challenge.prize_pool || 0} USDC</span>
                    <div className="flex items-center gap-3 text-gray-500">
                      <span title="Views">👁 {challenge.view_count || 0}</span>
                      <span title="Upvotes">❤️ {challenge.upvotes || 0}</span>
                      <span title="Comments">💬 {challenge.comment_count || 0}</span>
                      <span title="Submissions">📝 {challenge.submission_count || 0}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={`/challenges?tab=${activeTab}&page=${page - 1}${topicFilter ? `&topic=${topicFilter}` : ''}`}
                className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                ← Previous
              </Link>
            )}
            <span className="px-4 py-2 text-gray-500">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/challenges?tab=${activeTab}&page=${page + 1}${topicFilter ? `&topic=${topicFilter}` : ''}`}
                className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
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
