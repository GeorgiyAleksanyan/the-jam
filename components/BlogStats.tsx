'use client';

import { useEffect, useState } from 'react';

interface BlogStats {
  view_count: number;
  comment_count: number;
}

interface Props {
  slug: string;
  trackView?: boolean;
  showComments?: boolean;
}

export function useBlogStats(slug: string) {
  const [stats, setStats] = useState<BlogStats>({ view_count: 0, comment_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/blog/views?slug=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(data => {
        setStats({
          view_count: data.view_count || 0,
          comment_count: data.comment_count || 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  return { stats, loading };
}

export function BlogViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    // Track view on mount (with small delay to avoid bots)
    const timer = setTimeout(() => {
      fetch('/api/blog/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      }).catch(console.error);
    }, 2000);

    return () => clearTimeout(timer);
  }, [slug]);

  return null;
}

export function BlogStats({ slug, trackView = false, showComments = true }: Props) {
  const { stats, loading } = useBlogStats(slug);

  useEffect(() => {
    if (trackView) {
      const timer = setTimeout(() => {
        fetch('/api/blog/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug }),
        }).catch(console.error);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [slug, trackView]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="animate-pulse">...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-zinc-500">
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        {formatNumber(stats.view_count)} views
      </span>
      {showComments && (
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {stats.comment_count} comments
        </span>
      )}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Hook to fetch comment count from GitHub Discussions
export function useGiscusCommentCount(slug: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Giscus doesn't expose a simple API, but we can check the discussion
    // For now, return the cached count from our stats
    fetch(`/api/blog/views?slug=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(data => setCount(data.comment_count || 0))
      .catch(() => setCount(0));
  }, [slug]);

  return count;
}
