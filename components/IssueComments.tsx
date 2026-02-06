'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import dynamic from 'next/dynamic';
import type { RichEditorRef, MentionItem } from './RichEditor';

// Dynamically import RichEditor to avoid SSR issues
const RichEditor = dynamic(() => import('./RichEditor'), { 
  ssr: false,
  loading: () => <div className="h-[120px] bg-zinc-900 border border-zinc-700 rounded-lg animate-pulse" />
});

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

interface IssueCommentsProps {
  issueNumber: number;
  issueUrl?: string;
}

export function IssueComments({ issueNumber, issueUrl }: IssueCommentsProps) {
  const { session, user, signInWithGitHub } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const editorRef = useRef<RichEditorRef>(null);

  // Fetch mentionable users (agents + GitHub contributors)
  const fetchMentions = async (query: string): Promise<MentionItem[]> => {
    try {
      const res = await fetch(`/api/mentions?q=${encodeURIComponent(query)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((item: any) => ({
        id: item.username || item.github_username,
        label: item.name || item.username || item.github_username,
        avatar: item.avatar_url,
      }));
    } catch {
      return [];
    }
  };

  useEffect(() => {
    fetchComments();
  }, [issueNumber]);

  const fetchComments = async (bustCache = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch directly from GitHub API (public, no auth needed for reading)
      const url = `https://api.github.com/repos/GeorgiyAleksanyan/the-jam/issues/${issueNumber}/comments`;
      const res = await fetch(
        bustCache ? `${url}?_t=${Date.now()}` : url,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
          },
          cache: bustCache ? 'no-store' : 'default',
        }
      );
      
      if (!res.ok) {
        throw new Error('Failed to fetch comments');
      }
      
      const data = await res.json();
      setComments(data.map((c: any) => ({
        id: c.id,
        body: c.body,
        html_url: c.html_url,
        created_at: c.created_at,
        user: {
          login: c.user.login,
          avatar_url: c.user.avatar_url,
          html_url: c.user.html_url,
        },
      })));
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
    setSubmitError(null);
    try {
      const res = await fetch(`/api/github/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ body: newComment }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        if (data.code === 'GITHUB_NOT_LINKED' || data.code === 'GITHUB_TOKEN_EXPIRED') {
          setSubmitError('github_required');
        } else {
          setSubmitError(data.error || 'Failed to post comment');
        }
        return;
      }

      setNewComment('');
      // Wait a moment for GitHub to process, then refresh with cache bust
      setTimeout(() => fetchComments(true), 1500);
    } catch (err: any) {
      setSubmitError(err.message);
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

  // Simple markdown-ish rendering (bold, links, code)
  const renderBody = (body: string) => {
    // Escape HTML first
    let html = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Convert markdown-style formatting
    html = html
      // Code blocks
      .replace(/```[\s\S]*?```/g, (match) => 
        `<pre class="bg-black/50 p-2 rounded my-2 overflow-x-auto text-xs">${match.slice(3, -3)}</pre>`)
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-black/50 px-1 rounded text-sm">$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-blue-400 hover:underline">$1</a>')
      // Plain URLs
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="text-blue-400 hover:underline break-all">$1</a>')
      // Newlines
      .replace(/\n/g, '<br/>');
    
    return html;
  };

  if (loading) {
    return (
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">💬 Discussion</h2>
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading comments...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e1e] border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">💬 Discussion ({comments.length})</h2>
        {issueUrl && (
          <a 
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            View on GitHub
          </a>
        )}
      </div>

      {error && (
        <div className="text-red-400 mb-4 text-sm bg-red-900/20 border border-red-800 rounded p-3">
          {error}
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
            <div key={comment.id} className="border-l-2 border-gray-700 pl-4 py-2">
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
                <a
                  href={comment.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 hover:text-gray-400 ml-auto"
                >
                  #
                </a>
              </div>
              <div 
                className="text-sm text-gray-300"
                dangerouslySetInnerHTML={{ __html: renderBody(comment.body) }}
              />
            </div>
          ))
        )}
      </div>

      {/* GitHub link required error */}
      {submitError === 'github_required' && (
        <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span className="font-medium text-yellow-400">GitHub account required</span>
          </div>
          <p className="text-sm text-yellow-200/80 mb-3">
            To comment, you need to link your GitHub account. Your comment will be posted to GitHub under your username.
          </p>
          <button
            onClick={() => signInWithGitHub()}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Sign in with GitHub
          </button>
        </div>
      )}

      {/* Other errors */}
      {submitError && submitError !== 'github_required' && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
          {submitError}
        </div>
      )}

      {/* New comment form */}
      {user ? (
        <div className="space-y-3">
          <RichEditor
            ref={editorRef}
            placeholder="Add to the discussion... Use @ to mention, / for commands"
            fetchMentions={fetchMentions}
            disabled={submitting}
            onSubmit={async (content) => {
              if (!content.trim() || !session) return;
              setSubmitting(true);
              setSubmitError(null);
              try {
                const res = await fetch(`/api/github/issues/${issueNumber}/comments`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ body: content }),
                });

                const data = await res.json();
                
                if (!res.ok) {
                  if (data.code === 'GITHUB_NOT_LINKED' || data.code === 'GITHUB_TOKEN_EXPIRED') {
                    setSubmitError('github_required');
                  } else {
                    setSubmitError(data.error || 'Failed to post comment');
                  }
                  return;
                }

                editorRef.current?.clear();
                setTimeout(() => fetchComments(true), 1500);
              } catch (err: any) {
                setSubmitError(err.message);
              } finally {
                setSubmitting(false);
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              💡 Comments posted via your GitHub account
            </span>
            <button
              type="button"
              onClick={() => {
                const content = editorRef.current?.getMarkdown() || '';
                if (content.trim()) {
                  editorRef.current?.clear();
                  // Trigger submit via the onSubmit callback
                  const event = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true });
                  document.querySelector('.rich-editor .ProseMirror')?.dispatchEvent(event);
                }
              }}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {submitting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
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
