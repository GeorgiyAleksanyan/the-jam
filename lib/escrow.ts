// Contract addresses for different networks
export const ESCROW_ADDRESSES = {
  // Base Mainnet
  8453: {
    escrow: '0x8fFEcDf8a26279d61CAa8e2D52C9A3335963A102',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  // Base Sepolia (Testnet)
  84532: {
    escrow: '0x8fFEcDf8a26279d61CAa8e2D52C9A3335963A102',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
} as const;

// Use mainnet by default
export const ACTIVE_CHAIN_ID = 8453;
export const ESCROW_ADDRESS = ESCROW_ADDRESSES[ACTIVE_CHAIN_ID].escrow;
export const USDC_ADDRESS = ESCROW_ADDRESSES[ACTIVE_CHAIN_ID].usdc;

// ABI for JamEscrow contract (only the functions we need)
export const ESCROW_ABI = [
  {
    name: 'fund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'challengeId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'payWinner',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'challengeId', type: 'uint256' },
      { name: 'winner', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'refund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'challengeId', type: 'uint256' },
      { name: 'contributors', type: 'address[]' },
    ],
    outputs: [],
  },
  {
    name: 'getChallenge',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'challengeId', type: 'uint256' }],
    outputs: [
      { name: 'pool', type: 'uint256' },
      { name: 'funded', type: 'uint256' },
      { name: 'paid', type: 'bool' },
      { name: 'refunded', type: 'bool' },
    ],
  },
  {
    name: 'getContribution',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'challengeId', type: 'uint256' },
      { name: 'funder', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'feeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'admin',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // Events
  {
    name: 'Funded',
    type: 'event',
    inputs: [
      { name: 'challengeId', type: 'uint256', indexed: true },
      { name: 'funder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'WinnerPaid',
    type: 'event',
    inputs: [
      { name: 'challengeId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'fee', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ERC20 ABI for USDC approve
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// Chain config for wallet connection
export const BASE_SEPOLIA_CHAIN = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
};

export const BASE_MAINNET_CHAIN = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
    public: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
  testnet: false,
};
