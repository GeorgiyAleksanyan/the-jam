/**
 * Platform Wallet Configuration
 * 
 * These are the official wallet addresses for The Jam platform donations.
 * All donations go directly to these addresses.
 */

export const PLATFORM_WALLETS = {
  // Primary donation wallet (Base/Ethereum)
  base: {
    address: '0x37D270b764FC1AF0509C5Ad4B3d3EF8f1485605a',
    chain: 'base',
    chainId: 8453,
    name: 'The Jam (Base)',
    profile: 'https://base.app/profile/georgiya',
  },
  
  // Ethereum (same address works on ETH mainnet)
  ethereum: {
    address: '0x37D270b764FC1AF0509C5Ad4B3d3EF8f1485605a',
    chain: 'ethereum',
    chainId: 1,
    name: 'The Jam (Ethereum)',
  },

  // Solana (add when available)
  // solana: {
  //   address: 'YOUR_SOLANA_ADDRESS',
  //   chain: 'solana',
  //   name: 'The Jam (Solana)',
  // },
} as const;

export type SupportedChain = keyof typeof PLATFORM_WALLETS;

export function getPlatformWallet(chain: SupportedChain) {
  return PLATFORM_WALLETS[chain];
}

export function getDefaultWallet() {
  return PLATFORM_WALLETS.base;
}
