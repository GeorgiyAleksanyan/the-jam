'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { generateAgentAvatar, generateIdenticon } from '@/lib/avatars';

type Rental = {
  id: number;
  agent_id: number;
  renter_id: string;
  status: string;
  pricing_model: string;
  agreed_price: number;
  currency: string;
  task_description: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  agent?: {
    id: number;
    name: string;
    slug: string;
    avatar_url: string | null;
    owner_id?: string;
  };
  renter?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-green-500/20 text-green-400',
  active: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-zinc-500/20 text-zinc-400',
  rejected: 'bg-red-500/20 text-red-400',
  disputed: 'bg-orange-500/20 text-orange-400',
};

export default function MyRentalsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'renting' | 'providing'>('renting');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRentals = async () => {
      setLoading(true);
      try {
        const role = activeTab === 'providing' ? 'owner' : 'renter';
        const res = await fetch(`/api/rentals?role=${role}`, {
          credentials: 'include',
        });
        const data = await res.json();
        setRentals(data.rentals || []);
      } catch (error) {
        console.error('Failed to fetch rentals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, [user, activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
          <p className="text-zinc-400">Please sign in to view your rentals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">My Rentals</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('renting')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'renting'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Renting Agents
          </button>
          <button
            onClick={() => setActiveTab('providing')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'providing'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Providing Services
          </button>
        </div>

        {/* Rentals List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : rentals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">No rentals yet</h3>
            <p className="text-zinc-400 mb-6">
              {activeTab === 'renting'
                ? "You haven't rented any agents yet."
                : "No one has rented your agents yet."}
            </p>
            {activeTab === 'renting' && (
              <Link
                href="/marketplace"
                className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Browse Marketplace
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {rentals.map((rental) => (
              <RentalCard
                key={rental.id}
                rental={rental}
                role={activeTab === 'providing' ? 'owner' : 'renter'}
                onUpdate={(updated) => {
                  setRentals(rentals.map(r => r.id === updated.id ? { ...r, ...updated } : r));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RentalCard({
  rental,
  role,
  onUpdate,
}: {
  rental: Rental;
  role: 'owner' | 'renter';
  onUpdate: (rental: Rental) => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/rentals/${rental.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok) {
        onUpdate(data.rental);
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const avatar = rental.agent?.avatar_url || generateAgentAvatar(rental.agent?.name || 'Agent');

  return (
    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
      <div className="flex items-start gap-4">
        <img
          src={avatar}
          alt={rental.agent?.name || 'Agent'}
          className="w-16 h-16 rounded-lg object-cover"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href={`/agents/${rental.agent?.slug}`}
              className="text-lg font-semibold text-white hover:text-blue-400"
            >
              {rental.agent?.name || 'Unknown Agent'}
            </Link>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[rental.status] || STATUS_COLORS.pending}`}>
              {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
            </span>
          </div>

          {rental.task_description && (
            <p className="text-zinc-400 text-sm mb-3 line-clamp-2">
              {rental.task_description}
            </p>
          )}

          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <span>${rental.agreed_price?.toFixed(2) || '0.00'}</span>
            <span>{rental.pricing_model}</span>
            <span>{new Date(rental.created_at).toLocaleDateString()}</span>
          </div>

          {/* Renter info (for owners) */}
          {role === 'owner' && rental.renter && (
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
              <img
                src={rental.renter.avatar_url || generateIdenticon(rental.renter.id)}
                alt={rental.renter.username}
                className="w-5 h-5 rounded-full"
              />
              <span>Rented by {rental.renter.username}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {role === 'owner' && rental.status === 'pending' && (
            <>
              <button
                onClick={() => handleAction('approve')}
                disabled={!!actionLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg disabled:opacity-50"
              >
                {actionLoading === 'approve' ? '...' : 'Approve'}
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={!!actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg disabled:opacity-50"
              >
                {actionLoading === 'reject' ? '...' : 'Reject'}
              </button>
            </>
          )}

          {role === 'owner' && rental.status === 'active' && (
            <button
              onClick={() => handleAction('complete')}
              disabled={!!actionLoading}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg disabled:opacity-50"
            >
              {actionLoading === 'complete' ? '...' : 'Mark Complete'}
            </button>
          )}

          {['pending', 'approved'].includes(rental.status) && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={!!actionLoading}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg disabled:opacity-50"
            >
              {actionLoading === 'cancel' ? '...' : 'Cancel'}
            </button>
          )}

          <Link
            href={`/rentals/${rental.id}`}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
