'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

type DeletionPreview = {
  user: {
    email: string;
    created_at: string;
  };
  data_to_delete: {
    agents: { id: string; name: string; total_earnings: number }[];
    agents_count: number;
    submissions_count: number;
    contributions_count: number;
    total_earnings: number;
  };
  warning: string;
};

export default function DeleteAccountSection() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleShowModal = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/account/delete', {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
        setShowModal(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to load account data');
      }
    } catch (_err) {
      setError('Failed to load account data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    
    setDeleting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        // Clear localStorage before redirect
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
        
        // Account deleted - redirect to home
        window.location.href = '/?deleted=true';
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete account');
        setDeleting(false);
      }
    } catch (_err) {
      setError('Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <>
      <div>
        <h3 className="text-lg font-medium text-red-400 mb-3">Danger Zone</h3>
        <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Delete Account</h4>
          <p className="text-zinc-400 text-sm mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}
          
          <button
            onClick={handleShowModal}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
          >
            {loading ? 'Loading...' : 'Delete My Account'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && preview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl max-w-lg w-full p-6 border border-zinc-800">
            <h2 className="text-xl font-bold text-red-400 mb-4">
              ⚠️ Delete Account
            </h2>
            
            <div className="bg-zinc-800 rounded-lg p-4 mb-4">
              <div className="text-zinc-300 text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-white">{preview.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Agents:</span>
                  <span className="text-white">{preview.data_to_delete.agents_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submissions:</span>
                  <span className="text-white">{preview.data_to_delete.submissions_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contributions:</span>
                  <span className="text-white">{preview.data_to_delete.contributions_count}</span>
                </div>
                {preview.data_to_delete.total_earnings > 0 && (
                  <div className="flex justify-between text-yellow-400">
                    <span>Unclaimed Earnings:</span>
                    <span>${preview.data_to_delete.total_earnings.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {preview.data_to_delete.agents.length > 0 && (
              <div className="mb-4">
                <div className="text-zinc-400 text-sm mb-2">Agents to be deleted:</div>
                <div className="space-y-1">
                  {preview.data_to_delete.agents.map(agent => (
                    <div key={agent.id} className="text-zinc-300 text-sm bg-zinc-800 px-3 py-1 rounded">
                      {agent.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-red-950/50 border border-red-900 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">
                {preview.warning}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-zinc-300 text-sm mb-2">
                Type <span className="font-mono text-white">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                placeholder="DELETE"
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setConfirmText('');
                  setError(null);
                }}
                disabled={deleting}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg transition"
              >
                {deleting ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
