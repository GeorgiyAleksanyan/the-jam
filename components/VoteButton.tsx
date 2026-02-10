'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface VoteButtonProps {
  submissionId: number;
  challengeSlug: string;
  initialVotes: number;
  initialHasVoted?: boolean;
  disabled?: boolean;
}

export function VoteButton({
  submissionId,
  challengeSlug,
  initialVotes,
  initialHasVoted = false,
  disabled = false,
}: VoteButtonProps) {
  const { session } = useAuth();
  const [votes, setVotes] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [loading, setLoading] = useState(false);

  const handleVote = async () => {
    if (loading || disabled) return;

    if (!session?.access_token) {
      alert('Please sign in to vote');
      return;
    }

    const token = session.access_token;
    setLoading(true);

    try {
      if (hasVoted) {
        // Remove vote
        const res = await fetch(
          `/api/challenges/${challengeSlug}/votes?submission_id=${submissionId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (res.ok) {
          setVotes(data.total_votes);
          setHasVoted(false);
        }
      } else {
        // Add vote
        const res = await fetch(`/api/challenges/${challengeSlug}/votes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ submission_id: submissionId, weight: 1 }),
        });
        const data = await res.json();
        if (res.ok) {
          setVotes(data.total_votes);
          setHasVoted(true);
        } else if (data.error) {
          alert(data.error);
        }
      }
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={loading || disabled}
      aria-label={hasVoted ? `Remove vote (${votes} votes)` : `Vote for submission (${votes} votes)`}
      aria-pressed={hasVoted}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        hasVoted
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-emerald-500/50 hover:text-emerald-400'
      } ${loading ? 'opacity-50 cursor-wait' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <svg
        className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 15l7-7 7 7"
        />
      </svg>
      <span>{votes}</span>
    </button>
  );
}

interface UpvoteButtonProps {
  challengeSlug: string;
  initialUpvotes: number;
  initialHasUpvoted?: boolean;
}

export function UpvoteButton({
  challengeSlug,
  initialUpvotes,
  initialHasUpvoted = false,
}: UpvoteButtonProps) {
  const { session } = useAuth();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted);
  const [loading, setLoading] = useState(false);

  const handleUpvote = async () => {
    if (loading) return;

    if (!session?.access_token) {
      alert('Please sign in to upvote');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/challenges/${challengeSlug}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUpvotes(data.upvotes);
        setHasUpvoted(data.has_upvoted);
      }
    } catch (err) {
      console.error('Upvote error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpvote}
      disabled={loading}
      aria-label={hasUpvoted ? `Remove upvote (${upvotes} upvotes)` : `Upvote challenge (${upvotes} upvotes)`}
      aria-pressed={hasUpvoted}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        hasUpvoted
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-amber-500/50 hover:text-amber-400'
      } ${loading ? 'opacity-50 cursor-wait' : ''}`}
    >
      <svg
        className={`w-5 h-5 ${hasUpvoted ? 'fill-current' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>{upvotes} {upvotes === 1 ? 'upvote' : 'upvotes'}</span>
    </button>
  );
}
