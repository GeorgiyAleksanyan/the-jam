'use client';

import { useState, useEffect } from 'react';
import { getDefaultWallet, USDC_CONTRACTS } from '@/lib/wallets';

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
      <div className="text-center mb-6">
        <div className="text-sm text-zinc-500">Total Donated</div>
        <div className="text-3xl font-bold text-green-400">
          ${totalDonated.toFixed(2)}
        </div>
      </div>

      <div className="space-y-3">
        {donations.map((donation) => (
          <div
            key={donation.id}
            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
          >
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

            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{donation.donor.name}</div>
              {donation.message && (
                <div className="text-sm text-zinc-500 truncate">
                  "{donation.message}"
                </div>
              )}
            </div>

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

// Unified donate modal with built-in wallet connection
interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Chain = 'base' | 'ethereum';

export function DonateModal({ isOpen, onClose }: DonateModalProps) {
  // Wallet state (self-contained)
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chain, setChain] = useState<Chain>('base');
  const [connectingWallet, setConnectingWallet] = useState(false);

  // Donation state
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const provider = (window as any).ethereum;
        if (provider) {
          const accounts = await provider.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setWalletConnected(true);
          }
        }
      } catch {}
    };
    if (isOpen) checkConnection();
  }, [isOpen]);

  if (!isOpen) return null;

  const connectWallet = async () => {
    setConnectingWallet(true);
    setError(null);
    
    try {
      const provider = (window as any).ethereum;
      if (!provider) {
        window.open('https://metamask.io/download/', '_blank');
        throw new Error('Please install MetaMask or another Web3 wallet');
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Try to switch to Base
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // Base
        });
        setChain('base');
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
          setChain('base');
        }
      }

      setWalletAddress(address);
      setWalletConnected(true);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleDonate = async () => {
    if (!walletConnected || !walletAddress) {
      await connectWallet();
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount < 1) {
      setError('Minimum donation is $1 USDC');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = (window as any).ethereum;
      if (!provider) throw new Error('No wallet provider found');

      const platformWallet = getDefaultWallet();
      const usdcAddress = USDC_CONTRACTS[chain];
      
      // USDC has 6 decimals
      const amountInWei = BigInt(Math.floor(numAmount * 1_000_000));
      
      // Encode transfer function call
      const transferData = '0xa9059cbb' + 
        platformWallet.address.slice(2).padStart(64, '0') + 
        amountInWei.toString(16).padStart(64, '0');

      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: usdcAddress,
          data: transferData,
        }],
      });

      setTxHash(hash);

      // Record in database
      try {
        await fetch('/api/donations', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: numAmount,
            token: 'USDC',
            chain,
            wallet_address: walletAddress,
            tx_hash: hash,
            message: message || undefined,
            donor_name: donorName || undefined,
            is_anonymous: isAnonymous,
          }),
        });
      } catch {}

      setSuccess(true);
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Transaction cancelled');
      } else if (err.message?.includes('insufficient')) {
        setError('Insufficient USDC balance');
      } else {
        setError(err.message || 'Transaction failed');
      }
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
    setTxHash(null);
    onClose();
  };

  const presetAmounts = [5, 10, 25, 50, 100];
  const explorerUrl = chain === 'ethereum' 
    ? 'https://etherscan.io/tx/' 
    : 'https://basescan.org/tx/';

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Support The Jam 💚</h2>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white" aria-label="Close donation modal">
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
              <p className="text-zinc-400 mb-4">
                Your donation helps keep The Jam running and growing.
              </p>
              {txHash && (
                <a
                  href={`${explorerUrl}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mb-6 text-sm text-blue-400 hover:text-blue-300"
                >
                  View transaction ↗
                </a>
              )}
              <button
                onClick={handleClose}
                className="w-full py-3 bg-green-600 rounded-lg font-medium hover:bg-green-500"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Wallet Status */}
              {walletConnected && walletAddress ? (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-400">Connected</span>
                  </div>
                  <span className="text-sm font-mono text-zinc-400">{truncateAddress(walletAddress)}</span>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <p className="text-sm text-zinc-400 mb-3">
                    Connect your wallet to donate with USDC on Base.
                  </p>
                  <button
                    onClick={connectWallet}
                    disabled={connectingWallet}
                    className="w-full py-2 bg-purple-600 rounded-lg font-medium hover:bg-purple-500 disabled:opacity-50"
                  >
                    {connectingWallet ? 'Connecting...' : '🔗 Connect Wallet'}
                  </button>
                </div>
              )}

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

              {/* Main CTA */}
              <button
                onClick={handleDonate}
                disabled={loading || !amount}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : !walletConnected ? (
                  'Connect Wallet & Donate'
                ) : (
                  `Donate $${amount || '0'} USDC`
                )}
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
