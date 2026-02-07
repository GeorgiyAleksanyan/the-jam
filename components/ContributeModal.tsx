'use client';

import { useState } from 'react';
import { ACTIVE_CHAIN_ID } from '@/lib/escrow';

interface ContributeModalProps {
  challengeSlug: string;
  challengeTitle: string;
  challengeId: number;
  currentPrizePool: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newTotal: number, txHash: string) => void;
}

export function ContributeModal({
  challengeSlug: _challengeSlug,
  challengeTitle,
  challengeId,
  currentPrizePool,
  isOpen,
  onClose,
  onSuccess,
}: ContributeModalProps) {
  const [amount, setAmount] = useState('5');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'approving' | 'funding' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFund = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // Check/switch network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== ACTIVE_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${ACTIVE_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${ACTIVE_CHAIN_ID.toString(16)}`,
                chainName: 'Base',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      // Get fund params from API
      setStatus('approving');
      const paramsRes = await fetch(`/api/escrow/fund-params?challengeId=${challengeId}&amount=${amount}`);
      const params = await paramsRes.json();

      if (!paramsRes.ok) {
        throw new Error(params.error || 'Failed to get fund parameters');
      }

      // Step 1: Approve USDC
      const approveTx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: params.transactions[0].to,
          data: params.transactions[0].data,
        }],
      });

      await waitForTransaction(approveTx);

      // Step 2: Fund the challenge
      setStatus('funding');
      const fundTx = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: params.transactions[1].to,
          data: params.transactions[1].data,
        }],
      });

      await waitForTransaction(fundTx);

      // Update DB immediately after tx confirms (don't wait for cron)
      try {
        await fetch('/api/escrow/confirm-fund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId,
            amount: parseFloat(amount),
            txHash: fundTx,
          }),
        });
      } catch (e) {
        // Non-critical - cron will sync eventually
        console.warn('Failed to confirm fund in DB:', e);
      }

      setTxHash(fundTx);
      setStatus('success');
      
      const newTotal = currentPrizePool + parseFloat(amount);
      onSuccess?.(newTotal, fundTx);

    } catch (err: any) {
      console.error('Fund error:', err);
      if (err.code === 4001) {
        setError('Transaction rejected by user');
      } else {
        setError(err.message || 'Transaction failed');
      }
      setStatus('error');
    }
  };

  const waitForTransaction = async (hash: string): Promise<void> => {
    for (let i = 0; i < 60; i++) {
      const receipt = await window.ethereum?.request({
        method: 'eth_getTransactionReceipt',
        params: [hash],
      });
      if (receipt) return;
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Transaction timeout');
  };

  const explorerUrl = false 
    ? 'https://basescan.org' 
    : 'https://basescan.org';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Fund Challenge</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-green-400 mb-2">Funded Successfully!</h3>
            <p className="text-gray-400 mb-4">
              You contributed ${amount} USDC to "{challengeTitle}"
            </p>
            <a
              href={`${explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm"
            >
              View transaction →
            </a>
            <button
              onClick={onClose}
              className="block w-full mt-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Challenge Info */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-1">Contributing to:</p>
              <p className="font-semibold">{challengeTitle}</p>
              <p className="text-sm text-gray-400 mt-2">
                Current pool: <span className="text-green-400">${currentPrizePool.toFixed(2)} USDC</span>
              </p>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="1"
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white text-lg"
                  placeholder="5"
                  disabled={status !== 'idle' && status !== 'error'}
                />
                <div className="flex items-center px-4 bg-gray-800 rounded-lg border border-gray-600">
                  <span className="text-gray-300 font-medium">USDC</span>
                </div>
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2 mt-2">
                {['5', '10', '25', '50'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className={`px-3 py-1 rounded text-sm transition ${
                      amount === preset 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    disabled={status !== 'idle' && status !== 'error'}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="text-sm text-gray-500 mb-6">
              <p>• Funds go directly to escrow smart contract</p>
              <p>• Winner receives 95% (5% platform fee)</p>
              <p>• Network: {false ? 'Base Sepolia (Testnet)' : 'Base'}</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-400 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Button */}
            <button
              onClick={handleFund}
              disabled={status === 'connecting' || status === 'approving' || status === 'funding'}
              className={`w-full py-3 rounded-lg font-semibold text-lg transition ${
                status === 'connecting' || status === 'approving' || status === 'funding'
                  ? 'bg-gray-600 cursor-wait'
                  : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {status === 'connecting' && '⏳ Connecting Wallet...'}
              {status === 'approving' && '⏳ Approving USDC...'}
              {status === 'funding' && '⏳ Sending to Escrow...'}
              {(status === 'idle' || status === 'error') && `Fund $${amount} USDC`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Button to trigger the modal
interface ContributeButtonProps {
  challengeSlug: string;
  challengeTitle: string;
  challengeId: number;
  currentPrizePool: number;
  onSuccess?: (newTotal: number, txHash: string) => void;
}

export function ContributeButton({
  challengeSlug,
  challengeTitle,
  challengeId,
  currentPrizePool,
  onSuccess,
}: ContributeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition flex items-center gap-2"
      >
        <span>💰</span>
        <span>Fund This Challenge</span>
      </button>

      <ContributeModal
        challengeSlug={challengeSlug}
        challengeTitle={challengeTitle}
        challengeId={challengeId}
        currentPrizePool={currentPrizePool}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={(newTotal, txHash) => {
          onSuccess?.(newTotal, txHash);
        }}
      />
    </>
  );
}

// Window.ethereum type is declared elsewhere
