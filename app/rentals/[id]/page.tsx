'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { generateAgentAvatar, generateIdenticon } from '@/lib/avatars';
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { RENTAL_ESCROW_ADDRESS, USDC_ADDRESS, RENTAL_ESCROW_ABI, ERC20_ABI } from '@/lib/escrow';

type Message = {
  id: number;
  sender_id: string;
  sender_type: 'agent' | 'renter';
  content: string;
  message_type: string;
  created_at: string;
  read_at: string | null;
};

type Rental = {
  id: number;
  agent_id: number;
  renter_id: string;
  status: string;
  pricing_model: string;
  agreed_price: number;
  currency: string;
  payment_method: string;
  task_description: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  agent?: {
    id: number;
    name: string;
    slug: string;
    avatar_url: string | null;
    owner_id: string;
  };
  renter?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  approved: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  paid: 'bg-green-500/20 text-green-400 border-green-500/50',
  active: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  completed: 'bg-green-500/20 text-green-400 border-green-500/50',
  cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/50',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/50',
  disputed: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
};

export default function RentalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const rentalId = params.id as string;

  const [rental, setRental] = useState<Rental | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [role, setRole] = useState<'owner' | 'renter'>('renter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !rentalId) return;

    const fetchRental = async () => {
      try {
        const res = await fetch(`/api/rentals/${rentalId}`, {
          credentials: 'include',
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load rental');
          return;
        }

        setRental(data.rental);
        setMessages(data.messages || []);
        setRole(data.role);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRental();
  }, [user, rentalId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAction = async (action: string, reason?: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/rentals/${rentalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason }),
      });

      const data = await res.json();
      if (res.ok) {
        setRental(data.rental);
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/rentals/${rentalId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newMessage }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages([...messages, data.message]);
        setNewMessage('');
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message failed:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Rental Not Found</h2>
          <p className="text-zinc-400 mb-4">{error || 'Could not load rental details.'}</p>
          <Link href="/rentals" className="text-blue-400 hover:text-blue-300">
            ← Back to My Rentals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Link href="/rentals" className="text-zinc-400 hover:text-white text-sm mb-6 block">
          ← Back to My Rentals
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Rental Header */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <div className="flex items-start gap-4">
                <img
                  src={rental.agent?.avatar_url || generateAgentAvatar(rental.agent?.name || 'Agent')}
                  alt={rental.agent?.name || 'Agent'}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/agents/${rental.agent?.slug}`}
                      className="text-xl font-bold text-white hover:text-blue-400"
                    >
                      {rental.agent?.name}
                    </Link>
                    <span className={`text-xs px-3 py-1 rounded-full border ${STATUS_COLORS[rental.status]}`}>
                      {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">
                    {role === 'owner' ? `Rented by ${rental.renter?.username}` : 'You are renting this agent'}
                  </p>
                </div>
              </div>

              {/* Task Description */}
              {rental.task_description && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Task Description</h3>
                  <p className="text-white whitespace-pre-wrap">{rental.task_description}</p>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col h-[400px]">
              <div className="p-4 border-b border-zinc-800">
                <h3 className="font-semibold text-white">Messages</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-zinc-500 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isMe
                              ? 'bg-blue-600 text-white'
                              : 'bg-zinc-800 text-white'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-zinc-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white rounded-lg transition-colors"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Rental Details */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <h3 className="font-semibold text-white mb-4">Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Price</span>
                  <span className="text-white font-semibold">${rental.agreed_price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Pricing Model</span>
                  <span className="text-white capitalize">{rental.pricing_model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Payment</span>
                  <span className="text-white">{rental.payment_method === 'crypto' ? '💎 USDC' : '💳 Card'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Created</span>
                  <span className="text-white">{new Date(rental.created_at).toLocaleDateString()}</span>
                </div>
                {rental.started_at && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Started</span>
                    <span className="text-white">{new Date(rental.started_at).toLocaleDateString()}</span>
                  </div>
                )}
                {rental.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Completed</span>
                    <span className="text-white">{new Date(rental.completed_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
              <h3 className="font-semibold text-white mb-4">Actions</h3>
              <div className="space-y-3">
                {role === 'owner' && rental.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={!!actionLoading}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50"
                    >
                      {actionLoading === 'approve' ? 'Approving...' : 'Approve Request'}
                    </button>
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={!!actionLoading}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg disabled:opacity-50"
                    >
                      {actionLoading === 'reject' ? 'Rejecting...' : 'Reject Request'}
                    </button>
                  </>
                )}

                {/* Payment buttons for renter when approved */}
                {role === 'renter' && rental.status === 'approved' && (
                  <PaymentButtons rentalId={rental.id} />
                )}

                {role === 'owner' && (rental.status === 'approved' || rental.status === 'paid') && (
                  <button
                    onClick={() => handleAction('start')}
                    disabled={!!actionLoading}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
                  >
                    {actionLoading === 'start' ? 'Starting...' : 'Start Work'}
                  </button>
                )}

                {role === 'owner' && rental.status === 'active' && (
                  <button
                    onClick={() => handleAction('complete')}
                    disabled={!!actionLoading}
                    className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50"
                  >
                    {actionLoading === 'complete' ? 'Completing...' : 'Mark Complete'}
                  </button>
                )}

                {['pending', 'approved'].includes(rental.status) && (
                  <button
                    onClick={() => handleAction('cancel')}
                    disabled={!!actionLoading}
                    className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Rental'}
                  </button>
                )}

                {rental.status === 'completed' && (
                  <Link
                    href={`/rentals/${rental.id}/review`}
                    className="block w-full text-center py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                  >
                    Leave Review
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentButtons({ rentalId }: { rentalId: number }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [cryptoPayData, setCryptoPayData] = useState<any>(null);

  const handlePay = async (paymentType: 'card' | 'crypto' | 'onchain') => {
    if (paymentType === 'onchain') {
      // Prepare on-chain payment
      setLoading('onchain');
      try {
        const res = await fetch(`/api/rentals/${rentalId}/crypto-pay`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to prepare payment');
          return;
        }
        setCryptoPayData(data);
        setShowCryptoModal(true);
      } catch (error) {
        console.error('Crypto pay error:', error);
        alert('Failed to prepare payment');
      } finally {
        setLoading(null);
      }
      return;
    }

    setLoading(paymentType);
    try {
      const res = await fetch(`/api/rentals/${rentalId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ payment_type: paymentType }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Payment failed');
        return;
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-zinc-400 text-sm mb-3">Pay to start the rental:</p>
      <button
        onClick={() => handlePay('card')}
        disabled={!!loading}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading === 'card' ? (
          'Processing...'
        ) : (
          <>💳 Pay with Card</>
        )}
      </button>
      <button
        onClick={() => handlePay('crypto')}
        disabled={!!loading}
        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading === 'crypto' ? (
          'Processing...'
        ) : (
          <>💎 Pay with USDC (Stripe)</>
        )}
      </button>
      <button
        onClick={() => handlePay('onchain')}
        disabled={!!loading}
        className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading === 'onchain' ? (
          'Preparing...'
        ) : (
          <>🔗 Pay On-Chain (Base)</>
        )}
      </button>
      <p className="text-zinc-500 text-xs text-center mt-2">
        10% platform fee on all payments
      </p>

      {showCryptoModal && cryptoPayData && (
        <CryptoPayModal
          data={cryptoPayData}
          onClose={() => setShowCryptoModal(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}

function CryptoPayModal({
  data,
  onClose,
  onSuccess,
}: {
  data: { rental_id: number; agent_owner_wallet: string; amount_usdc: number; amount_display: number };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'connect' | 'approve' | 'fund' | 'confirm'>('connect');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setStep('approve');
        }
      } catch (err) {
        console.error('Wallet check failed:', err);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('Please install MetaMask or another Web3 wallet');
      return;
    }

    setLoading(true);
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      setWalletAddress(accounts[0]);
      
      // Switch to Base
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // Base chainId
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        }
      }

      setStep('approve');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!RENTAL_ESCROW_ADDRESS) {
      setError('Rental escrow contract not deployed yet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walletClient = createWalletClient({
        chain: base,
        transport: custom((window as any).ethereum),
      });

      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [RENTAL_ESCROW_ADDRESS as `0x${string}`, BigInt(data.amount_usdc)],
        account: walletAddress as `0x${string}`,
      });

      // Wait for confirmation
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setStep('fund');
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    if (!RENTAL_ESCROW_ADDRESS) {
      setError('Rental escrow contract not deployed yet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walletClient = createWalletClient({
        chain: base,
        transport: custom((window as any).ethereum),
      });

      const hash = await walletClient.writeContract({
        address: RENTAL_ESCROW_ADDRESS as `0x${string}`,
        abi: RENTAL_ESCROW_ABI,
        functionName: 'fundRental',
        args: [
          BigInt(data.rental_id),
          data.agent_owner_wallet as `0x${string}`,
          BigInt(data.amount_usdc),
        ],
        account: walletAddress as `0x${string}`,
      });

      // Wait for confirmation
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      });

      await publicClient.waitForTransactionReceipt({ hash });
      
      // Confirm in database
      setStep('confirm');
      const res = await fetch(`/api/rentals/${data.rental_id}/crypto-pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tx_hash: hash }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.shortMessage || err.message || 'Transaction failed');
      setStep('fund');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl p-6 max-w-md w-full border border-zinc-800">
        <h2 className="text-xl font-bold text-white mb-4">Pay with USDC on Base</h2>
        
        <div className="bg-zinc-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-zinc-400">Amount</span>
            <span className="text-white font-semibold">${data.amount_display} USDC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Network</span>
            <span className="text-blue-400">Base</span>
          </div>
          {walletAddress && (
            <div className="flex justify-between text-sm mt-2">
              <span className="text-zinc-400">Your Wallet</span>
              <span className="text-zinc-300 font-mono text-xs">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div className={`flex items-center gap-3 ${step === 'connect' ? 'text-white' : 'text-zinc-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              walletAddress ? 'bg-green-600' : step === 'connect' ? 'bg-blue-600' : 'bg-zinc-700'
            }`}>
              {walletAddress ? '✓' : '1'}
            </div>
            <span>Connect Wallet</span>
          </div>
          <div className={`flex items-center gap-3 ${step === 'approve' ? 'text-white' : 'text-zinc-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step === 'fund' || step === 'confirm' ? 'bg-green-600' : step === 'approve' ? 'bg-blue-600' : 'bg-zinc-700'
            }`}>
              {step === 'fund' || step === 'confirm' ? '✓' : '2'}
            </div>
            <span>Approve USDC</span>
          </div>
          <div className={`flex items-center gap-3 ${step === 'fund' ? 'text-white' : 'text-zinc-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step === 'confirm' ? 'bg-green-600' : step === 'fund' ? 'bg-blue-600' : 'bg-zinc-700'
            }`}>
              {step === 'confirm' ? '✓' : '3'}
            </div>
            <span>Fund Escrow</span>
          </div>
        </div>

        {step === 'connect' && (
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white rounded-lg"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}

        {step === 'approve' && (
          <button
            onClick={handleApprove}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white rounded-lg"
          >
            {loading ? 'Approving...' : 'Approve USDC'}
          </button>
        )}

        {step === 'fund' && (
          <button
            onClick={handleFund}
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white rounded-lg"
          >
            {loading ? 'Funding...' : 'Fund Escrow'}
          </button>
        )}

        {step === 'confirm' && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-zinc-400">Confirming payment...</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 mt-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
