'use client';

import { useState, useEffect } from 'react';
import { useWallet } from './WalletConnect';
import { getDefaultWallet } from '@/lib/wallets';

interface Donation {
  id: number;
  created_at: string;
  amount: number;
  token: string;
  chain: string;
  message?: string;
  donor: {
    name: string;
    avatar?: string;
    slug?: string;
  };
}

interface DonationWallProps {
  limit?: number;
}

export function DonationWall({ limit = 10 }: DonationWallProps) {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [totalDonated, setTotalDonated] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/donations?limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        setDonations(data.donations || []);
        setTotalDonated(data.total_donated || 0);
      })
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-zinc-800 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Total */}
      <div className="text-center mb-6">
        <div className="text-sm text-zinc-500">Total Donated</div>
        <div className="text-3xl font-bold text-green-400">
          ${totalDonated.toFixed(2)}
        </div>
      </div>

      {/* Donations List */}
      <div className="space-y-3">
        {donations.map((donation) => (
          <div
            key={donation.id}
            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
          >
            {/* Avatar */}
            {donation.donor.avatar ? (
              <img
                src={donation.donor.avatar}
                alt={donation.donor.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-lg">
                💚
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{donation.donor.name}</div>
              {donation.message && (
                <div className="text-sm text-zinc-500 truncate">
                  "{donation.message}"
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="text-right">
              <div className="font-bold text-green-400">
                ${donation.amount.toFixed(2)}
              </div>
              <div className="text-xs text-zinc-500">{donation.token}</div>
            </div>
          </div>
        ))}
      </div>

      {donations.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          Be the first to support The Jam!
        </div>
      )}
    </div>
  );
}

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonateModal({ isOpen, onClose }: DonateModalProps) {
  const { connected, address, chain } = useWallet();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDonate = async () => {
    if (!connected || !address || !chain) {
      setError('Please connect your wallet first');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate transaction (replace with real wallet transaction)
      const mockTxHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;

      const token = localStorage.getItem('supabase_access_token');
      const res = await fetch('/api/donations', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: numAmount,
          token: 'USDC',
          chain,
          wallet_address: address,
          tx_hash: mockTxHash,
          message: message || undefined,
          donor_name: donorName || undefined,
          is_anonymous: isAnonymous,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to record donation');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Donation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setMessage('');
    setDonorName('');
    setIsAnonymous(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const presetAmounts = [5, 10, 25, 50, 100];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Support The Jam 💚</h2>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold mb-2 text-green-400">Thank You!</h3>
              <p className="text-zinc-400 mb-6">
                Your donation helps keep The Jam running and growing.
              </p>
              <button
                onClick={handleClose}
                className="w-full py-3 bg-zinc-800 rounded-lg font-medium hover:bg-zinc-700"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-zinc-400 mb-4">
                Help keep The Jam running! Your donation supports infrastructure, development, and prize pools.
              </p>

              {/* Amount */}
              <div className="mb-4">
                <label className="block text-sm text-zinc-500 mb-2">Amount (USDC)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-16 py-3 text-lg focus:border-green-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">USDC</span>
                </div>
              </div>

              {/* Presets */}
              <div className="flex gap-2 mb-6">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset.toString())}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      amount === preset.toString()
                        ? 'bg-green-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="block text-sm text-zinc-500 mb-2">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message..."
                  maxLength={500}
                  rows={2}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none resize-none"
                />
              </div>

              {/* Display Name */}
              <div className="mb-4">
                <label className="block text-sm text-zinc-500 mb-2">Display Name (optional)</label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="How should we credit you?"
                  maxLength={100}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus:border-green-500 focus:outline-none"
                />
              </div>

              {/* Anonymous */}
              <label className="flex items-center gap-2 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700"
                />
                <span className="text-sm text-zinc-400">Donate anonymously</span>
              </label>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleDonate}
                disabled={loading || !connected || !amount}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : !connected ? 'Connect Wallet First' : 'Donate'}
              </button>

              {/* Direct wallet option */}
              <div className="mt-6 pt-4 border-t border-zinc-700">
                <p className="text-xs text-zinc-500 mb-2">Or send directly to our wallet:</p>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400">Base / Ethereum</span>
                    <a 
                      href={getDefaultWallet().profile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View Profile ↗
                    </a>
                  </div>
                  <code className="text-xs text-green-400 break-all select-all">
                    {getDefaultWallet().address}
                  </code>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface DonateButtonProps {
  className?: string;
}

export function DonateButton({ className = '' }: DonateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium hover:opacity-90 transition-opacity ${className}`}
      >
        💚 Donate
      </button>
      <DonateModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
