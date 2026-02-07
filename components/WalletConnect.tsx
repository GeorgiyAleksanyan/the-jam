'use client';

import { useState, useEffect, useCallback } from 'react';

type WalletType = 'metamask' | 'phantom' | 'coinbase' | null;
type Chain = 'solana' | 'base' | 'ethereum';

interface WalletState {
  connected: boolean;
  address: string | null;
  chain: Chain | null;
  walletType: WalletType;
}

interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (args: any) => void) => void;
  isConnected: boolean;
  publicKey?: { toString: () => string };
}

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
}

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
    coinbaseWalletExtension?: EthereumProvider;
    ethereum?: EthereumProvider;
  }
}

// Base chain ID
const BASE_CHAIN_ID = '0x2105'; // 8453 in hex
const BASE_CHAIN_CONFIG = {
  chainId: BASE_CHAIN_ID,
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    address: null,
    chain: null,
    walletType: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing connection on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('jam_wallet');
    if (savedWallet) {
      try {
        const parsed = JSON.parse(savedWallet);
        setState(parsed);
      } catch {}
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    if (state.connected) {
      localStorage.setItem('jam_wallet', JSON.stringify(state));
    } else {
      localStorage.removeItem('jam_wallet');
    }
  }, [state]);

  const switchToBase = async (provider: EthereumProvider) => {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [BASE_CHAIN_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  };

  const connectMetaMask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = window.ethereum;
      if (!provider?.isMetaMask) {
        window.open('https://metamask.io/download/', '_blank');
        throw new Error('MetaMask not installed');
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Try to switch to Base
      try {
        await switchToBase(provider);
      } catch {
        console.log('Could not switch to Base, staying on current chain');
      }

      setState({
        connected: true,
        address,
        chain: 'base',
        walletType: 'metamask',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect MetaMask');
    } finally {
      setLoading(false);
    }
  }, []);

  const connectPhantom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = window.phantom?.solana;
      if (!provider?.isPhantom) {
        window.open('https://phantom.app/', '_blank');
        throw new Error('Phantom wallet not installed');
      }

      const response = await provider.connect();
      const address = response.publicKey.toString();

      setState({
        connected: true,
        address,
        chain: 'solana',
        walletType: 'phantom',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect Phantom');
    } finally {
      setLoading(false);
    }
  }, []);

  const connectCoinbase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = window.coinbaseWalletExtension || 
        (window.ethereum?.isCoinbaseWallet ? window.ethereum : null);
      
      if (!provider) {
        window.open('https://www.coinbase.com/wallet', '_blank');
        throw new Error('Coinbase Wallet not installed');
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Try to switch to Base
      try {
        await switchToBase(provider);
      } catch {
        console.log('Could not switch to Base');
      }

      setState({
        connected: true,
        address,
        chain: 'base',
        walletType: 'coinbase',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect Coinbase Wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const connectAny = useCallback(async () => {
    // Try to connect with any available wallet
    setLoading(true);
    setError(null);
    try {
      const provider = window.ethereum;
      if (!provider) {
        throw new Error('No wallet detected. Install MetaMask or Coinbase Wallet.');
      }

      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];

      // Determine wallet type
      const walletType: WalletType = provider.isMetaMask ? 'metamask' : 
        provider.isCoinbaseWallet ? 'coinbase' : 'metamask';

      // Try to switch to Base
      try {
        await switchToBase(provider);
      } catch {
        console.log('Could not switch to Base');
      }

      setState({
        connected: true,
        address,
        chain: 'base',
        walletType,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (state.walletType === 'phantom') {
        await window.phantom?.solana?.disconnect();
      }
    } catch {}
    
    setState({
      connected: false,
      address: null,
      chain: null,
      walletType: null,
    });
  }, [state.walletType]);

  return {
    ...state,
    loading,
    error,
    connectMetaMask,
    connectPhantom,
    connectCoinbase,
    connectAny,
    disconnect,
  };
}

interface WalletButtonProps {
  onConnect?: (address: string, chain: Chain) => void;
  className?: string;
}

export function WalletButton({ onConnect, className = '' }: WalletButtonProps) {
  const {
    connected,
    address,
    chain,
    walletType,
    loading,
    error,
    connectMetaMask,
    connectPhantom,
    connectCoinbase,
    disconnect,
  } = useWallet();

  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (connected && address && chain && onConnect) {
      onConnect(address, chain);
    }
  }, [connected, address, chain, onConnect]);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (connected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:opacity-90 transition-opacity ${className}`}
        >
          <span className="text-xs opacity-70">{chain?.toUpperCase()}</span>
          <span>{truncateAddress(address)}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
            <div className="p-3 border-b border-zinc-700">
              <div className="text-xs text-zinc-500">Connected via {walletType}</div>
              <div className="text-sm font-mono">{truncateAddress(address)}</div>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-red-400 hover:bg-zinc-700 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg font-medium hover:border-purple-500 transition-colors ${loading ? 'opacity-50' : ''} ${className}`}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>

      {showMenu && !loading && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50">
          <div className="p-2">
            <button
              onClick={() => {
                connectMetaMask();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-6 h-6" />
              <div className="text-left">
                <div className="font-medium">MetaMask</div>
                <div className="text-xs text-zinc-500">Base / Ethereum</div>
              </div>
            </button>
            <button
              onClick={() => {
                connectCoinbase();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <img src="https://www.coinbase.com/img/favicon/favicon-256.png" alt="Coinbase" className="w-6 h-6 rounded" />
              <div className="text-left">
                <div className="font-medium">Coinbase Wallet</div>
                <div className="text-xs text-zinc-500">Base / Ethereum</div>
              </div>
            </button>
            <button
              onClick={() => {
                connectPhantom();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <img src="https://phantom.app/img/phantom-logo.svg" alt="Phantom" className="w-6 h-6" />
              <div className="text-left">
                <div className="font-medium">Phantom</div>
                <div className="text-xs text-zinc-500">Solana</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute right-0 mt-2 px-3 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
