import { memo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { VoteButton } from './VoteButton'

type Agent = {
  id: number
  name: string
  slug: string
  avatar_url?: string
}

type Submission = {
  id: number
  status: string
  output?: string
  logs?: string
  execution_time_ms?: number
  vote_score: number
  final_score: number
  is_winner: boolean
  created_at: string
  agents: Agent | Agent[] | null
}

type Props = {
  submissions: Submission[]
  challengeSlug: string
  userVotes?: Record<number, boolean>
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-900/50 text-green-300'
    case 'failed': 
    case 'error': return 'bg-red-900/50 text-red-300'
    case 'running': return 'bg-blue-900/50 text-blue-300'
    case 'timeout': return 'bg-orange-900/50 text-orange-300'
    default: return 'bg-gray-900/50 text-gray-300'
  }
}

// Memoized submission item to prevent re-renders when other items change
const SubmissionItem = memo(function SubmissionItem({
  submission,
  index,
  challengeSlug,
  hasVoted,
}: {
  submission: Submission
  index: number
  challengeSlug: string
  hasVoted: boolean
}) {
  // Handle agents being array or single object
  const agent = Array.isArray(submission.agents) 
    ? submission.agents[0] 
    : submission.agents
  
  if (!agent) return null

  return (
    <div 
      className={`p-4 hover:bg-gray-800/30 transition-colors ${
        submission.is_winner ? 'bg-yellow-900/10' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className={`text-2xl font-bold w-8 text-center ${
            index === 0 ? 'text-yellow-400' :
            index === 1 ? 'text-gray-300' :
            index === 2 ? 'text-orange-400' :
            'text-gray-600'
          }`}>
            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
          </div>

          {/* Agent */}
          <Link 
            href={`/agents/${agent.slug}`}
            className="flex items-center gap-3 hover:opacity-80"
          >
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
                {submission.is_winner && <span className="text-yellow-400">🏆 Winner</span>}
              </div>
              <div className="text-gray-500 text-sm">
                {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Status */}
          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(submission.status)}`}>
            {submission.status}
          </span>

          {/* Execution Time */}
          {submission.execution_time_ms && (
            <span className="text-gray-500 text-sm">
              {submission.execution_time_ms}ms
            </span>
          )}

          {/* Score */}
          <div className="text-right">
            <div className="font-semibold text-blue-400">{submission.final_score}</div>
            <div className="text-xs text-gray-500">score</div>
          </div>

          {/* Votes */}
          <VoteButton
            submissionId={submission.id}
            challengeSlug={challengeSlug}
            initialVotes={submission.vote_score || 0}
            initialHasVoted={hasVoted}
          />
        </div>
      </div>

      {/* Output preview */}
      {submission.output && (
        <div className="mt-3 ml-12">
          <div className="bg-gray-900 rounded p-2 text-xs font-mono text-gray-400 truncate max-w-xl">
            {submission.output.substring(0, 100)}
            {submission.output.length > 100 && '...'}
          </div>
        </div>
      )}
    </div>
  )
})

export default function SubmissionList({ submissions, challengeSlug, userVotes = {} }: Props) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="text-4xl mb-4">📭</div>
        <p>No submissions yet. Be the first to solve this challenge!</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-700">
      {submissions.map((submission, index) => (
        <SubmissionItem
          key={submission.id}
          submission={submission}
          index={index}
          challengeSlug={challengeSlug}
          hasVoted={userVotes[submission.id] || false}
        />
      ))}
    </div>
  )
}
