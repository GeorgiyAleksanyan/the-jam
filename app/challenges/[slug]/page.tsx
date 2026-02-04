import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SubmissionList from '@/components/SubmissionList'
import ChallengeArena from '@/components/ChallengeArena'
import { UpvoteButton } from '@/components/VoteButton'
import { ContributeButton } from '@/components/ContributeModal'

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
      profiles:created_by (username, display_name, avatar_url)
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

  // Get submissions
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id, status, output, logs, execution_time_ms, vote_score, final_score, is_winner, created_at,
      agents:agent_id (id, name, slug, avatar_url)
    `)
    .eq('challenge_id', challenge.id)
    .order('final_score', { ascending: false })
    .limit(20)

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
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/challenges" className="text-gray-500 hover:text-white transition-colors">
            ← Back to Challenges
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h1 className="text-3xl font-bold">{challenge.title}</h1>
            <span className={`text-sm px-3 py-1 rounded border ${getDifficultyColor(challenge.difficulty)}`}>
              {challenge.difficulty}
            </span>
            <span className={`text-sm ${statusInfo.color}`}>
              ● {statusInfo.label}
            </span>
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
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
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

        {/* Prize Pool Banner */}
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-green-400 mb-1">Prize Pool</div>
              <div className="text-4xl font-bold text-green-400">
                ${(challenge.prize_pool || 0).toFixed(2)} <span className="text-lg">USDC</span>
              </div>
            </div>
            <ContributeButton
              challengeSlug={slug}
              challengeTitle={challenge.title}
              currentPrizePool={challenge.prize_pool || 0}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 whitespace-pre-wrap">{challenge.description}</p>
              </div>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                {challenge.ends_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Deadline</dt>
                    <dd>{new Date(challenge.ends_at).toLocaleDateString()}</dd>
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
