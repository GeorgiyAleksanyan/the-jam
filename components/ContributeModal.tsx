'use client';

import { useState } from 'react';
import { WalletButton, useWallet } from './WalletConnect';

interface ContributeModalProps {
  challengeSlug: string;
  challengeTitle: string;
  currentPrizePool: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newTotal: number) => void;
}

export function ContributeModal({
  challengeSlug,
  challengeTitle,
  currentPrizePool,
  isOpen,
  onClose,
  onSuccess,
}: ContributeModalProps) {
  const { connected, address, chain } = useWallet();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'amount' | 'confirm' | 'pending' | 'success'>('amount');
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!connected || !address || !chain) {
      setError('Please connect your wallet first');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!address || !chain) return;
    
    setLoading(true);
    setError(null);
    setStep('pending');

    try {
      // In a real implementation, this would:
      // 1. Create a transaction to send USDC to the escrow address
      // 2. Sign with the wallet
      // 3. Wait for confirmation
      // For now, we'll simulate with a mock tx hash
      
      // Simulated transaction (replace with real wallet transaction)
      const mockTxHash = `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      // Record the contribution
      const token = localStorage.getItem('supabase_access_token');
      const res = await fetch(`/api/challenges/${challengeSlug}/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          token: 'USDC',
          chain,
          tx_hash: mockTxHash,
          wallet_address: address,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to record contribution');
      }

      setTxHash(mockTxHash);
      setStep('success');
      onSuccess?.(data.new_prize_pool);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setStep('amount');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError(null);
    setStep('amount');
    setTxHash(null);
    onClose();
  };

  const presetAmounts = [5, 10, 25, 50, 100];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Contribute to Prize Pool</h2>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'amount' && (
            <>
              <p className="text-zinc-400 mb-4">
                Add to the prize pool for <span className="text-white font-medium">{challengeTitle}</span>
              </p>

              {/* Current Prize Pool */}
              <div className="bg-zinc-800 rounded-lg p-4 mb-6">
                <div className="text-sm text-zinc-500">Current Prize Pool</div>
                <div className="text-2xl font-bold text-green-400">
                  ${currentPrizePool.toFixed(2)} USDC
                </div>
              </div>

              {/* Wallet Connection */}
              <div className="mb-6">
                <label className="block text-sm text-zinc-500 mb-2">Wallet</label>
                <WalletButton />
              </div>

              {/* Amount Input */}
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
                    step="0.01"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-16 py-3 text-lg focus:border-green-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">USDC</span>
                </div>
              </div>

              {/* Preset Amounts */}
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

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!connected || !amount}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!connected ? 'Connect Wallet First' : 'Continue'}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-xl font-semibold mb-2">Confirm Contribution</h3>
                <p className="text-zinc-400">
                  You&apos;re about to contribute <span className="text-green-400 font-bold">${amount} USDC</span> to the prize pool.
                </p>
              </div>

              <div className="bg-zinc-800 rounded-lg p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Amount</span>
                  <span className="text-green-400">${amount} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Chain</span>
                  <span>{chain?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Wallet</span>
                  <span className="font-mono text-xs">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('amount')}
                  className="flex-1 py-3 bg-zinc-800 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Confirm & Send
                </button>
              </div>
            </>
          )}

          {step === 'pending' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h3 className="text-xl font-semibold mb-2">Processing Transaction</h3>
              <p className="text-zinc-400">Please confirm in your wallet...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold mb-2 text-green-400">Contribution Successful!</h3>
              <p className="text-zinc-400 mb-6">
                You&apos;ve added <span className="text-green-400 font-bold">${amount} USDC</span> to the prize pool.
              </p>

              {txHash && (
                <div className="bg-zinc-800 rounded-lg p-3 mb-6">
                  <div className="text-xs text-zinc-500 mb-1">Transaction Hash</div>
                  <code className="text-xs font-mono break-all">{txHash}</code>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full py-3 bg-zinc-800 rounded-lg font-medium hover:bg-zinc-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ContributeButtonProps {
  challengeSlug: string;
  challengeTitle: string;
  currentPrizePool: number;
  onSuccess?: (newTotal: number) => void;
  className?: string;
}

export function ContributeButton({
  challengeSlug,
  challengeTitle,
  currentPrizePool,
  onSuccess,
  className = '',
}: ContributeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-medium transition-colors ${className}`}
      >
        + Contribute
      </button>
      <ContributeModal
        challengeSlug={challengeSlug}
        challengeTitle={challengeTitle}
        currentPrizePool={currentPrizePool}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={(newTotal) => {
          onSuccess?.(newTotal);
          setIsOpen(false);
        }}
      />
    </>
  );
}
