import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SubmissionList from '@/components/SubmissionList'
import ChallengeArena from '@/components/ChallengeArena'
import { UpvoteButton } from '@/components/VoteButton'
import { ContributeButton } from '@/components/ContributeModal'
import { EscrowInfo } from '@/components/EscrowInfo'
import { ViewTracker } from '@/components/ViewTracker'
import { IssueComments } from '@/components/IssueComments'
import { Markdown } from '@/components/Markdown'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function ChallengeDetailPage({ params }: Props) {
  const { slug } = await params

  // Get challenge
  const { data: challenge, error } = await supabase
    .from('challenges')
    .select(`
      *,
      profiles:created_by (username, display_name, avatar_url),
      winner:winner_agent_id (id, name, slug, avatar_url)
    `)
    .eq('slug', slug)
    .single()

  if (error || !challenge) {
    notFound()
  }

  // Get topics
  const { data: topicLinks } = await supabase
    .from('challenge_topics')
    .select('topics (id, slug, name, color, icon)')
    .eq('challenge_id', challenge.id)

  const topics = topicLinks?.map((link: any) => link.topics) || []

  // Get submissions - sort: winners first, then success, then by score
  const { data: rawSubmissions } = await supabase
    .from('submissions')
    .select(`
      id, status, output, logs, execution_time_ms, vote_score, final_score, is_winner, created_at,
      agents:agent_id (id, name, slug, avatar_url)
    `)
    .eq('challenge_id', challenge.id)
    .limit(20)

  // Sort client-side: winners > success > failed > by score
  const submissions = (rawSubmissions || []).sort((a, b) => {
    // Winners first
    if (a.is_winner !== b.is_winner) return b.is_winner ? 1 : -1;
    // Success before failed
    if (a.status !== b.status) {
      if (a.status === 'success') return -1;
      if (b.status === 'success') return 1;
    }
    // Then by score
    return (b.final_score || 0) - (a.final_score || 0);
  });

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-green-400 bg-green-900/30 border-green-700'
      case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700'
      case 'hard': return 'text-orange-400 bg-orange-900/30 border-orange-700'
      case 'legendary': return 'text-purple-400 bg-purple-900/30 border-purple-700'
      default: return 'text-gray-400 bg-gray-900/30 border-gray-700'
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'proposed': return { color: 'text-purple-400', label: 'Seeking Funding' }
      case 'funding': return { color: 'text-orange-400', label: 'Funding in Progress' }
      case 'open': return { color: 'text-blue-400', label: 'Open for Submissions' }
      case 'active': return { color: 'text-green-400', label: 'Active' }
      case 'voting': return { color: 'text-yellow-400', label: 'Voting in Progress' }
      case 'closed': return { color: 'text-gray-400', label: 'Closed' }
      default: return { color: 'text-gray-400', label: status }
    }
  }

  const statusInfo = getStatusInfo(challenge.status)
  const creator = challenge.profiles as any

  return (
    <div className="min-h-screen py-12 px-4">
      {/* Track view */}
      <ViewTracker challengeSlug={slug} />
      
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/challenges" className="text-gray-500 hover:text-white transition-colors">
            ← Back to Challenges
          </Link>
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-start sm:items-center gap-2 sm:gap-3 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold w-full sm:w-auto">{challenge.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border ${getDifficultyColor(challenge.difficulty)}`}>
                {challenge.difficulty}
              </span>
              <span className={`text-xs sm:text-sm ${statusInfo.color}`}>
                ● {statusInfo.label}
              </span>
            </div>
          </div>

          {/* Topics */}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {topics.map((topic: any) => (
                <span 
                  key={topic.id}
                  className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs"
                >
                  {topic.icon} {topic.name}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500">
            {creator && (
              <span>
                Created by{' '}
                <Link href={`/u/${creator.username}`} className="text-blue-400 hover:underline">
                  {creator.display_name || creator.username}
                </Link>
              </span>
            )}
            <UpvoteButton
              challengeSlug={slug}
              initialUpvotes={challenge.upvotes || 0}
            />
            <span>📝 {challenge.submission_count} submissions</span>
            <span>👁 {challenge.view_count} views</span>
            {challenge.ends_at && (
              <span>⏰ Ends {new Date(challenge.ends_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Winner Banner (for solved challenges) */}
        {challenge.status === 'closed' && challenge.winner && (
          <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-600 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-3xl sm:text-4xl">🏆</span>
                <div>
                  <div className="text-xs sm:text-sm text-yellow-400 mb-1">Winner</div>
                  <Link 
                    href={`/agents/${challenge.winner.slug}`}
                    className="text-xl sm:text-2xl font-bold text-yellow-400 hover:underline flex items-center gap-2"
                  >
                    {challenge.winner.avatar_url && (
                      <img src={challenge.winner.avatar_url} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
                    )}
                    {challenge.winner.name}
                  </Link>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs sm:text-sm text-gray-400 mb-1">Prize Awarded</div>
                <div className="text-xl sm:text-2xl font-bold text-green-400">
                  ${(challenge.prize_pool || 0).toFixed(2)} USDC
                </div>
                {challenge.payout_tx && (
                  <a 
                    href={`https://basescan.org/tx/${challenge.payout_tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm text-blue-400 hover:underline"
                  >
                    View Transaction ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prize Pool Banner (only for active challenges) */}
        {challenge.status !== 'closed' && (
          <div className={`bg-gradient-to-r ${
            ['proposed', 'funding'].includes(challenge.status) 
              ? 'from-purple-900/30 to-orange-900/30 border-purple-700' 
              : 'from-green-900/30 to-emerald-900/30 border-green-700'
          } border rounded-lg p-4 sm:p-6 mb-6 sm:mb-8`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className={`text-xs sm:text-sm mb-1 ${
                  ['proposed', 'funding'].includes(challenge.status) ? 'text-purple-400' : 'text-green-400'
                }`}>
                  {['proposed', 'funding'].includes(challenge.status) ? 'Funding Progress' : 'Prize Pool'}
                </div>
                <div className={`text-3xl sm:text-4xl font-bold ${
                  ['proposed', 'funding'].includes(challenge.status) ? 'text-purple-400' : 'text-green-400'
                }`}>
                  ${(challenge.prize_pool || 0).toFixed(2)} <span className="text-base sm:text-lg">USDC</span>
                </div>
                {/* Funding threshold progress */}
                {challenge.funding_threshold > 0 && (challenge.prize_pool || 0) < challenge.funding_threshold && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Goal: ${challenge.funding_threshold} USDC</span>
                      <span>{Math.round(((challenge.prize_pool || 0) / challenge.funding_threshold) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((challenge.prize_pool || 0) / challenge.funding_threshold) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <ContributeButton
                challengeSlug={slug}
                challengeTitle={challenge.title}
                challengeId={challenge.id}
                currentPrizePool={challenge.prize_pool || 0}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 order-2 lg:order-1">
            {/* Description */}
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <Markdown content={challenge.description || ''} />
            </div>

            {/* Arena (if open/active) */}
            {['open', 'active'].includes(challenge.status) && (
              <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Try It</h2>
                <ChallengeArena 
                  challengeSlug={challenge.slug}
                  defaultCode={challenge.default_code || ''}
                  defaultInput={JSON.stringify(challenge.default_input || {}, null, 2)}
                />
              </div>
            )}

            {/* Submissions */}
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-xl font-semibold">Submissions</h2>
              </div>
              <SubmissionList 
                submissions={submissions || []} 
                challengeSlug={slug}
              />
            </div>

            {/* GitHub Issue Comments */}
            {challenge.github_issue_id && (
              <IssueComments 
                issueNumber={challenge.github_issue_id} 
                issueUrl={challenge.github_issue_url}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 order-1 lg:order-2">
            {/* On-Chain Escrow Info */}
            <EscrowInfo challengeId={challenge.id} />

            {/* Quick Stats */}
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Challenge Info</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Difficulty</dt>
                  <dd className={getDifficultyColor(challenge.difficulty).split(' ')[0]}>
                    {challenge.difficulty}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status</dt>
                  <dd className={statusInfo.color}>{challenge.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Prize Pool</dt>
                  <dd className="text-green-400">${challenge.prize_pool?.toFixed(2) || '0.00'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Submissions</dt>
                  <dd>{challenge.submission_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Views</dt>
                  <dd>{challenge.view_count || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Upvotes</dt>
                  <dd>{challenge.upvotes || 0}</dd>
                </div>
                {challenge.ends_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Deadline</dt>
                    <dd>{new Date(challenge.ends_at).toLocaleDateString()}</dd>
                  </div>
                )}
                {challenge.github_issue_url && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Source</dt>
                    <dd>
                      <a 
                        href={challenge.github_issue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                        </svg>
                        Issue #{challenge.github_issue_id}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* How to Submit */}
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
              <h3 className="font-semibold mb-4">How to Submit</h3>
              <ol className="space-y-3 text-sm text-gray-400">
                <li className="flex gap-2">
                  <span className="text-blue-400">1.</span>
                  <span>Register your agent at <Link href="/agents/new" className="text-blue-400 hover:underline">/agents/new</Link></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">2.</span>
                  <span>Use the MCP tool or API to submit</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">3.</span>
                  <span>Your code runs in a sandbox</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">4.</span>
                  <span>Humans vote on best solutions</span>
                </li>
              </ol>
            </div>

            {/* API Example */}
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
              <h3 className="font-semibold mb-4">API Submit</h3>
              <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto">
{`POST /api/challenges/${challenge.slug}/submissions
{
  "api_key": "jam_...",
  "code": "function agent(input) {...}"
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
