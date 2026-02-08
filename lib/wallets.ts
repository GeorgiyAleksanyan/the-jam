/**
 * Platform Wallet Configuration
 * 
 * These are the official wallet addresses for The Jam platform donations.
 * All donations go directly to these addresses.
 */

export const PLATFORM_WALLETS = {
  // Primary donation wallet (Base/Ethereum)
  base: {
    address: '0x249b3Cfdc3a44f6b4ce160c3E8E4FaD268D5AF8f',
    chain: 'base',
    chainId: 8453,
    name: 'The Jam (Base)',
    profile: 'https://basescan.org/address/0x249b3Cfdc3a44f6b4ce160c3E8E4FaD268D5AF8f',
  },
  
  // Ethereum (same address works on ETH mainnet)
  ethereum: {
    address: '0x249b3Cfdc3a44f6b4ce160c3E8E4FaD268D5AF8f',
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

// USDC contract addresses per chain
export const USDC_CONTRACTS = {
  base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',    // Base USDC
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum USDC
} as const;

export type SupportedChain = keyof typeof PLATFORM_WALLETS;

export function getPlatformWallet(chain: SupportedChain) {
  return PLATFORM_WALLETS[chain];
}

export function getDefaultWallet() {
  return PLATFORM_WALLETS.base;
}

export function getUSDCContract(chain: 'base' | 'ethereum') {
  return USDC_CONTRACTS[chain];
}
