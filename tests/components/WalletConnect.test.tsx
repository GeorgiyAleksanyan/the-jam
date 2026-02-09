import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletButton, useWallet } from '@/components/WalletConnect';
import React from 'react';

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: { log: vi.fn() }
}));

// Helper to create a test component for the hook
function TestHookComponent({ onStateChange }: { onStateChange?: (state: any) => void }) {
  const walletState = useWallet();
  React.useEffect(() => {
    onStateChange?.(walletState);
  }, [walletState, onStateChange]);
  return (
    <div>
      <span data-testid="connected">{String(walletState.connected)}</span>
      <span data-testid="address">{walletState.address || 'null'}</span>
      <span data-testid="chain">{walletState.chain || 'null'}</span>
      <span data-testid="walletType">{walletState.walletType || 'null'}</span>
      <span data-testid="loading">{String(walletState.loading)}</span>
      <span data-testid="error">{walletState.error || 'null'}</span>
      <button data-testid="connectMetaMask" onClick={walletState.connectMetaMask}>MetaMask</button>
      <button data-testid="connectPhantom" onClick={walletState.connectPhantom}>Phantom</button>
      <button data-testid="connectCoinbase" onClick={walletState.connectCoinbase}>Coinbase</button>
      <button data-testid="connectAny" onClick={walletState.connectAny}>Any</button>
      <button data-testid="disconnect" onClick={walletState.disconnect}>Disconnect</button>
    </div>
  );
}

describe('WalletConnect', () => {
  // Store original window properties
  const originalEthereum = (window as any).ethereum;
  const originalPhantom = (window as any).phantom;
  const originalCoinbaseWallet = (window as any).coinbaseWalletExtension;
  const originalLocalStorage = window.localStorage;
  
  // Mock localStorage
  let localStorageData: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: vi.fn((key: string) => localStorageData[key] || null),
    setItem: vi.fn((key: string, value: string) => { localStorageData[key] = value; }),
    removeItem: vi.fn((key: string) => { delete localStorageData[key]; }),
    clear: vi.fn(() => { localStorageData = {}; }),
    length: 0,
    key: vi.fn(() => null),
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    localStorageData = {};
    
    // Set up localStorage mock
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
    
    // Reset window wallet providers
    (window as any).ethereum = undefined;
    (window as any).phantom = undefined;
    (window as any).coinbaseWalletExtension = undefined;
  });

  afterEach(() => {
    // Restore original properties
    (window as any).ethereum = originalEthereum;
    (window as any).phantom = originalPhantom;
    (window as any).coinbaseWalletExtension = originalCoinbaseWallet;
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, writable: true });
  });

  describe('useWallet hook', () => {
    describe('initial state', () => {
      it('should start disconnected with no wallet', () => {
        render(<TestHookComponent />);
        
        expect(screen.getByTestId('connected').textContent).toBe('false');
        expect(screen.getByTestId('address').textContent).toBe('null');
        expect(screen.getByTestId('chain').textContent).toBe('null');
        expect(screen.getByTestId('walletType').textContent).toBe('null');
        expect(screen.getByTestId('loading').textContent).toBe('false');
        expect(screen.getByTestId('error').textContent).toBe('null');
      });

      it('should restore state from localStorage on mount', async () => {
        const savedState = {
          connected: true,
          address: '0x1234567890abcdef1234567890abcdef12345678',
          chain: 'base',
          walletType: 'metamask',
        };
        localStorageData['jam_wallet'] = JSON.stringify(savedState);

        render(<TestHookComponent />);

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('true');
          expect(screen.getByTestId('address').textContent).toBe(savedState.address);
          expect(screen.getByTestId('chain').textContent).toBe('base');
          expect(screen.getByTestId('walletType').textContent).toBe('metamask');
        });
      });

      it('should handle invalid localStorage JSON gracefully', () => {
        localStorageData['jam_wallet'] = 'invalid json{';

        render(<TestHookComponent />);
        
        // Should fallback to disconnected state
        expect(screen.getByTestId('connected').textContent).toBe('false');
      });
    });

    describe('MetaMask connection', () => {
      it('should connect to MetaMask successfully', async () => {
        const mockAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockImplementation(async ({ method }: { method: string }) => {
            if (method === 'eth_requestAccounts') return [mockAddress];
            if (method === 'wallet_switchEthereumChain') return null;
            return null;
          }),
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectMetaMask'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('true');
          expect(screen.getByTestId('address').textContent).toBe(mockAddress);
          expect(screen.getByTestId('chain').textContent).toBe('base');
          expect(screen.getByTestId('walletType').textContent).toBe('metamask');
        });
      });

      it('should open MetaMask download page if not installed', async () => {
        const mockOpen = vi.fn();
        window.open = mockOpen;

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectMetaMask'));
        });

        await waitFor(() => {
          expect(mockOpen).toHaveBeenCalledWith('https://metamask.io/download/', '_blank');
          expect(screen.getByTestId('error').textContent).toBe('MetaMask not installed');
        });
      });

      it('should handle connection error', async () => {
        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockRejectedValue(new Error('User rejected')),
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectMetaMask'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('false');
          expect(screen.getByTestId('error').textContent).toBe('User rejected');
        });
      });

      it('should add Base chain if not present (error 4902)', async () => {
        const mockAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
        const mockRequest = vi.fn().mockImplementation(async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') return [mockAddress];
          if (method === 'wallet_switchEthereumChain') {
            const error = new Error('Chain not added') as any;
            error.code = 4902;
            throw error;
          }
          if (method === 'wallet_addEthereumChain') return null;
          return null;
        });

        (window as any).ethereum = {
          isMetaMask: true,
          request: mockRequest,
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectMetaMask'));
        });

        await waitFor(() => {
          expect(mockRequest).toHaveBeenCalledWith({
            method: 'wallet_addEthereumChain',
            params: [expect.objectContaining({ chainName: 'Base' })],
          });
          expect(screen.getByTestId('connected').textContent).toBe('true');
        });
      });
    });

    describe('Phantom connection', () => {
      it('should connect to Phantom successfully', async () => {
        const mockAddress = 'So1anaAddressHere12345678901234567890123456';
        (window as any).phantom = {
          solana: {
            isPhantom: true,
            connect: vi.fn().mockResolvedValue({ publicKey: { toString: () => mockAddress } }),
          },
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectPhantom'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('true');
          expect(screen.getByTestId('address').textContent).toBe(mockAddress);
          expect(screen.getByTestId('chain').textContent).toBe('solana');
          expect(screen.getByTestId('walletType').textContent).toBe('phantom');
        });
      });

      it('should open Phantom download page if not installed', async () => {
        const mockOpen = vi.fn();
        window.open = mockOpen;

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectPhantom'));
        });

        await waitFor(() => {
          expect(mockOpen).toHaveBeenCalledWith('https://phantom.app/', '_blank');
          expect(screen.getByTestId('error').textContent).toBe('Phantom wallet not installed');
        });
      });
    });

    describe('Coinbase Wallet connection', () => {
      it('should connect to Coinbase Wallet extension', async () => {
        const mockAddress = '0xcoinbase1234567890abcdef1234567890abcdef';
        (window as any).coinbaseWalletExtension = {
          request: vi.fn().mockImplementation(async ({ method }: { method: string }) => {
            if (method === 'eth_requestAccounts') return [mockAddress];
            if (method === 'wallet_switchEthereumChain') return null;
            return null;
          }),
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectCoinbase'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('true');
          expect(screen.getByTestId('address').textContent).toBe(mockAddress);
          expect(screen.getByTestId('walletType').textContent).toBe('coinbase');
        });
      });

      it('should fallback to ethereum.isCoinbaseWallet', async () => {
        const mockAddress = '0xcoinbase1234567890abcdef1234567890abcdef';
        (window as any).ethereum = {
          isCoinbaseWallet: true,
          request: vi.fn().mockImplementation(async ({ method }: { method: string }) => {
            if (method === 'eth_requestAccounts') return [mockAddress];
            if (method === 'wallet_switchEthereumChain') return null;
            return null;
          }),
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectCoinbase'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('true');
          expect(screen.getByTestId('walletType').textContent).toBe('coinbase');
        });
      });

      it('should open Coinbase Wallet download page if not installed', async () => {
        const mockOpen = vi.fn();
        window.open = mockOpen;

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectCoinbase'));
        });

        await waitFor(() => {
          expect(mockOpen).toHaveBeenCalledWith('https://www.coinbase.com/wallet', '_blank');
        });
      });
    });

    describe('connectAny', () => {
      it('should connect to any available wallet', async () => {
        const mockAddress = '0xgeneric123456789abcdef1234567890abcdef12';
        (window as any).ethereum = {
          request: vi.fn().mockImplementation(async ({ method }: { method: string }) => {
            if (method === 'eth_requestAccounts') return [mockAddress];
            if (method === 'wallet_switchEthereumChain') return null;
            return null;
          }),
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectAny'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('true');
          expect(screen.getByTestId('address').textContent).toBe(mockAddress);
        });
      });

      it('should error if no wallet is available', async () => {
        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectAny'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('error').textContent).toContain('No wallet detected');
        });
      });

      it('should detect MetaMask wallet type', async () => {
        const mockAddress = '0xmetamask1234567890abcdef1234567890abcdef';
        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockResolvedValue([mockAddress]),
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectAny'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('walletType').textContent).toBe('metamask');
        });
      });

      it('should detect Coinbase wallet type', async () => {
        const mockAddress = '0xcoinbase1234567890abcdef1234567890abcdef';
        (window as any).ethereum = {
          isCoinbaseWallet: true,
          request: vi.fn().mockResolvedValue([mockAddress]),
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectAny'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('walletType').textContent).toBe('coinbase');
        });
      });
    });

    describe('disconnect', () => {
      it('should disconnect and clear state', async () => {
        const mockAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockResolvedValue([mockAddress]),
        };

        render(<TestHookComponent />);
        
        // First connect
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectMetaMask'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('true');
        });

        // Then disconnect
        await act(async () => {
          fireEvent.click(screen.getByTestId('disconnect'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('false');
          expect(screen.getByTestId('address').textContent).toBe('null');
        });

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('jam_wallet');
      });

      it('should call phantom disconnect for Solana wallets', async () => {
        const mockDisconnect = vi.fn().mockResolvedValue(undefined);
        const mockAddress = 'So1anaAddressHere12345678901234567890123456';
        (window as any).phantom = {
          solana: {
            isPhantom: true,
            connect: vi.fn().mockResolvedValue({ publicKey: { toString: () => mockAddress } }),
            disconnect: mockDisconnect,
          },
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectPhantom'));
        });

        await waitFor(() => {
          expect(screen.getByTestId('connected').textContent).toBe('true');
        });

        await act(async () => {
          fireEvent.click(screen.getByTestId('disconnect'));
        });

        await waitFor(() => {
          expect(mockDisconnect).toHaveBeenCalled();
        });
      });
    });

    describe('loading state', () => {
      it('should show loading during connection', async () => {
        let resolveRequest: (value: string[]) => void;
        const pendingPromise = new Promise<string[]>(resolve => {
          resolveRequest = resolve;
        });

        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockReturnValue(pendingPromise),
        };

        render(<TestHookComponent />);
        
        await act(async () => {
          fireEvent.click(screen.getByTestId('connectMetaMask'));
        });

        expect(screen.getByTestId('loading').textContent).toBe('true');

        await act(async () => {
          resolveRequest!(['0x1234567890abcdef1234567890abcdef12345678']);
        });

        await waitFor(() => {
          expect(screen.getByTestId('loading').textContent).toBe('false');
        });
      });
    });
  });

  describe('WalletButton component', () => {
    describe('disconnected state', () => {
      it('should render "Connect Wallet" button', () => {
        render(<WalletButton />);
        
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
      });

      it('should show wallet menu on click', async () => {
        const user = userEvent.setup();
        render(<WalletButton />);
        
        await user.click(screen.getByText('Connect Wallet'));

        expect(screen.getByText('MetaMask')).toBeInTheDocument();
        expect(screen.getByText('Coinbase Wallet')).toBeInTheDocument();
        expect(screen.getByText('Phantom')).toBeInTheDocument();
      });

      it('should show chain info in menu items', async () => {
        const user = userEvent.setup();
        render(<WalletButton />);
        
        await user.click(screen.getByText('Connect Wallet'));

        expect(screen.getAllByText('Base / Ethereum').length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('Solana')).toBeInTheDocument();
      });

      it('should connect MetaMask when selected', async () => {
        const mockAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockResolvedValue([mockAddress]),
        };

        const user = userEvent.setup();
        render(<WalletButton />);
        
        await user.click(screen.getByText('Connect Wallet'));
        await user.click(screen.getByText('MetaMask'));

        await waitFor(() => {
          expect(screen.getByText('0xabcd...ef12')).toBeInTheDocument();
        });
      });

      it('should close menu after selecting wallet', async () => {
        const mockAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockResolvedValue([mockAddress]),
        };

        const user = userEvent.setup();
        render(<WalletButton />);
        
        await user.click(screen.getByText('Connect Wallet'));
        await user.click(screen.getByText('MetaMask'));

        await waitFor(() => {
          // Menu options should not be visible after connection
          expect(screen.queryByText('Coinbase Wallet')).not.toBeInTheDocument();
        });
      });
    });

    describe('connected state', () => {
      beforeEach(() => {
        const savedState = {
          connected: true,
          address: '0x1234567890abcdef1234567890abcdef12345678',
          chain: 'base',
          walletType: 'metamask',
        };
        localStorageData['jam_wallet'] = JSON.stringify(savedState);
      });

      it('should show truncated address when connected', async () => {
        render(<WalletButton />);

        await waitFor(() => {
          expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
        });
      });

      it('should show chain name in uppercase', async () => {
        render(<WalletButton />);

        await waitFor(() => {
          expect(screen.getByText('BASE')).toBeInTheDocument();
        });
      });

      it('should show dropdown menu on click', async () => {
        const user = userEvent.setup();
        render(<WalletButton />);

        await waitFor(() => {
          expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
        });

        await user.click(screen.getByText('0x1234...5678'));

        expect(screen.getByText('Disconnect')).toBeInTheDocument();
        expect(screen.getByText('Connected via metamask')).toBeInTheDocument();
      });

      it('should disconnect when disconnect button is clicked', async () => {
        const user = userEvent.setup();
        render(<WalletButton />);

        await waitFor(() => {
          expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
        });

        await user.click(screen.getByText('0x1234...5678'));
        await user.click(screen.getByText('Disconnect'));

        await waitFor(() => {
          expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
        });
      });
    });

    describe('loading state', () => {
      it('should show loading indicator during connection', async () => {
        let resolveRequest: (value: string[]) => void;
        const pendingPromise = new Promise<string[]>(resolve => {
          resolveRequest = resolve;
        });

        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockReturnValue(pendingPromise),
        };

        const user = userEvent.setup();
        render(<WalletButton />);
        
        await user.click(screen.getByText('Connect Wallet'));
        await user.click(screen.getByText('MetaMask'));

        await waitFor(() => {
          expect(screen.getByText('Connecting...')).toBeInTheDocument();
        });

        // Clean up
        await act(async () => {
          resolveRequest!(['0x1234567890abcdef1234567890abcdef12345678']);
        });
      });

      it('should disable button during loading', async () => {
        let resolveRequest: (value: string[]) => void;
        const pendingPromise = new Promise<string[]>(resolve => {
          resolveRequest = resolve;
        });

        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockReturnValue(pendingPromise),
        };

        const user = userEvent.setup();
        render(<WalletButton />);
        
        await user.click(screen.getByText('Connect Wallet'));
        await user.click(screen.getByText('MetaMask'));

        await waitFor(() => {
          const button = screen.getByText('Connecting...').closest('button');
          expect(button).toBeDisabled();
        });

        await act(async () => {
          resolveRequest!(['0x1234567890abcdef1234567890abcdef12345678']);
        });
      });
    });

    describe('error state', () => {
      it('should show error message when connection fails', async () => {
        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockRejectedValue(new Error('User rejected the request')),
        };

        const user = userEvent.setup();
        render(<WalletButton />);
        
        await user.click(screen.getByText('Connect Wallet'));
        await user.click(screen.getByText('MetaMask'));

        await waitFor(() => {
          expect(screen.getByText('User rejected the request')).toBeInTheDocument();
        });
      });
    });

    describe('onConnect callback', () => {
      it('should call onConnect when wallet connects', async () => {
        const mockAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
        (window as any).ethereum = {
          isMetaMask: true,
          request: vi.fn().mockResolvedValue([mockAddress]),
        };

        const onConnect = vi.fn();
        const user = userEvent.setup();
        render(<WalletButton onConnect={onConnect} />);
        
        await user.click(screen.getByText('Connect Wallet'));
        await user.click(screen.getByText('MetaMask'));

        await waitFor(() => {
          expect(onConnect).toHaveBeenCalledWith(mockAddress, 'base');
        });
      });

      it('should call onConnect when restoring from localStorage', async () => {
        const savedState = {
          connected: true,
          address: '0x1234567890abcdef1234567890abcdef12345678',
          chain: 'base',
          walletType: 'metamask',
        };
        localStorageData['jam_wallet'] = JSON.stringify(savedState);

        const onConnect = vi.fn();
        render(<WalletButton onConnect={onConnect} />);

        await waitFor(() => {
          expect(onConnect).toHaveBeenCalledWith(savedState.address, 'base');
        });
      });
    });

    describe('custom className', () => {
      it('should apply custom className', () => {
        render(<WalletButton className="custom-class" />);
        
        const button = screen.getByText('Connect Wallet').closest('button');
        expect(button).toHaveClass('custom-class');
      });
    });

    describe('toggle menu', () => {
      it('should toggle menu visibility', async () => {
        const user = userEvent.setup();
        render(<WalletButton />);
        
        // Open menu
        await user.click(screen.getByText('Connect Wallet'));
        expect(screen.getByText('MetaMask')).toBeInTheDocument();

        // Close menu
        await user.click(screen.getByText('Connect Wallet'));
        expect(screen.queryByText('MetaMask')).not.toBeInTheDocument();
      });
    });
  });
});
