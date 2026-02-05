/**
 * Platform Wallet Configuration
 * 
 * These are the official wallet addresses for The Jam platform donations.
 * All donations go directly to these addresses.
 */

export const PLATFORM_WALLETS = {
  // Primary donation wallet (Base/Ethereum)
  base: {
    address: '0x8f0525A43a9e0E60B17f2b9a41AF82E07F142188',
    chain: 'base',
    chainId: 8453,
    name: 'The Jam (Base)',
    profile: 'https://base.app/profile/georgiya',
  },
  
  // Ethereum (same address works on ETH mainnet)
  ethereum: {
    address: '0x8f0525A43a9e0E60B17f2b9a41AF82E07F142188',
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
