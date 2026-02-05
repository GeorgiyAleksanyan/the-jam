'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface Comment {
  id: number;
  body: string;
  html_url: string;
  created_at: string;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

interface GitHubCommentsProps {
  issueNumber: number;
  repo?: string;
}

export function GitHubComments({ issueNumber, repo = 'GeorgiyAleksanyan/the-jam' }: GitHubCommentsProps) {
  const { session, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [issueNumber]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/github/issues/${issueNumber}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      const data = await res.json();
      setComments(data.comments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/github/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ body: newComment }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      setNewComment('');
      await fetchComments(); // Refresh comments
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">💬 Discussion</h2>
        <div className="text-gray-500 animate-pulse">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">💬 Discussion</h2>
        <a 
          href={`https://github.com/${repo}/issues/${issueNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:underline flex items-center gap-1"
        >
          View on GitHub
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {error && (
        <div className="text-red-400 mb-4 text-sm">
          Error loading comments: {error}
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No comments yet. Be the first to discuss!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-gray-700 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <a 
                  href={comment.user.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img 
                    src={comment.user.avatar_url} 
                    alt={comment.user.login}
                    className="w-6 h-6 rounded-full"
                  />
                </a>
                <a 
                  href={comment.user.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-400 hover:underline"
                >
                  {comment.user.login}
                </a>
                <span className="text-xs text-gray-500">
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap">
                {comment.body}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add to the discussion..."
            className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Comments sync with GitHub Issues
            </span>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 bg-[#2a2a2a] rounded-lg">
          <span className="text-gray-400 text-sm">
            <a href="/auth/signin" className="text-blue-400 hover:underline">Sign in</a> to join the discussion
          </span>
        </div>
      )}
    </div>
  );
}
