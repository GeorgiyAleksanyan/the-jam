'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAgentAvatarUrl } from '@/lib/avatars';
import Link from 'next/link';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  created_at: string;
  agent_id?: number;
  agents?: {
    id: number;
    name: string;
    slug: string;
    avatar_url?: string;
  };
}

// Notification type configs
const NOTIF_ICONS: Record<string, string> = {
  payout_pending: '⏳',
  payout_complete: '💰',
  payout_failed: '❌',
  wallet_needed: '👛',
  challenge_won: '🏆',
  submission_received: '📬',
  challenge_funded: '💎',
  default: '🔔',
};

const NOTIF_COLORS: Record<string, string> = {
  payout_complete: 'border-green-600 bg-green-900/20',
  challenge_won: 'border-yellow-600 bg-yellow-900/20',
  payout_failed: 'border-red-600 bg-red-900/20',
  wallet_needed: 'border-orange-600 bg-orange-900/20',
  default: 'border-zinc-700 bg-zinc-800/50',
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

function getNotificationLink(notif: Notification): string | null {
  const data = notif.data || {};
  
  if (data.challenge_slug) {
    return `/challenges/${data.challenge_slug}`;
  }
  if (data.tx_hash) {
    return `https://basescan.org/tx/${data.tx_hash}`;
  }
  if (notif.agents?.slug) {
    return `/agents/${notif.agents.slug}`;
  }
  
  return null;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}

function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const icon = NOTIF_ICONS[notification.type] || NOTIF_ICONS.default;
  const colorClass = NOTIF_COLORS[notification.type] || NOTIF_COLORS.default;
  const isUnread = !notification.read_at;
  const link = getNotificationLink(notification);

  const content = (
    <div className={`p-4 rounded-lg border ${colorClass} ${isUnread ? 'ring-1 ring-blue-500/50' : ''} transition-all hover:border-zinc-600`}>
      <div className="flex items-start gap-3">
        {/* Icon/Avatar */}
        <div className="flex-shrink-0">
          {notification.agents ? (
            <img 
              src={getAgentAvatarUrl(notification.agents.avatar_url, notification.agents.name)}
              alt={notification.agents.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-xl">
              {icon}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{notification.title}</span>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
          <p className="text-sm text-zinc-400 line-clamp-2">{notification.message}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
            <span>{timeAgo(notification.created_at)}</span>
            {notification.data?.amount && (
              <span className="text-green-400">${notification.data.amount} USDC</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isUnread && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(notification.id); }}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded"
              title="Mark as read"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(notification.id); }}
            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  if (link) {
    const isExternal = link.startsWith('http');
    if (isExternal) {
      return (
        <a href={link} target="_blank" rel="noopener noreferrer" className="block">
          {content}
        </a>
      );
    }
    return <Link href={link} className="block">{content}</Link>;
  }

  return content;
}

export function NotificationsList() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!session?.access_token) return;

    const currentOffset = reset ? 0 : offset;
    
    try {
      const res = await fetch(`/api/notifications?limit=20&offset=${currentOffset}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setNotifications(prev => reset ? data.notifications : [...prev, ...data.notifications]);
        setUnreadCount(data.unread_count);
        setHasMore(data.has_more);
        if (reset) setOffset(20);
        else setOffset(prev => prev + 20);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, offset]);

  useEffect(() => {
    if (session?.access_token) {
      fetchNotifications(true);
    }
  }, [session?.access_token]);

  const markAsRead = async (id: number) => {
    if (!session?.access_token) return;

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [id] }),
      });

      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllAsRead = async () => {
    if (!session?.access_token) return;

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ all: true }),
      });

      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteNotification = async (id: number) => {
    if (!session?.access_token) return;

    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [id] }),
      });

      const notif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notif && !notif.read_at) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {}
  };

  if (!session) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <p>Sign in to view notifications</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-zinc-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-600 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-zinc-500">No notifications yet</p>
          <p className="text-sm text-zinc-600 mt-1">
            You'll be notified about wins, payouts, and more
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => fetchNotifications(false)}
              className="w-full py-3 text-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Bell icon with badge for header
export function NotificationBell() {
  const { session } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications?limit=1', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count);
        }
      } catch {}
    };

    fetchCount();
    // Poll every 60 seconds
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [session?.access_token]);

  if (!session) return null;

  return (
    <Link href="/dashboard?tab=notifications" className="relative p-2 hover:bg-zinc-800 rounded-lg transition-colors">
      <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
