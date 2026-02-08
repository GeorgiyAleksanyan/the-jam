// Contract addresses for different networks
export const ESCROW_ADDRESSES = {
  // Base Mainnet
  8453: {
    escrow: '0x8fFEcDf8a26279d61CAa8e2D52C9A3335963A102',
    rentalEscrow: '', // Deploy and add address
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  // Base Sepolia (Testnet)
  84532: {
    escrow: '0x8fFEcDf8a26279d61CAa8e2D52C9A3335963A102',
    rentalEscrow: '', // Deploy and add address
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
} as const;

// Use mainnet by default
export const ACTIVE_CHAIN_ID = 8453;
export const ESCROW_ADDRESS = ESCROW_ADDRESSES[ACTIVE_CHAIN_ID].escrow;
export const RENTAL_ESCROW_ADDRESS = ESCROW_ADDRESSES[ACTIVE_CHAIN_ID].rentalEscrow;
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
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'totalFunding', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'winner', type: 'address' },
        ],
      },
    ],
  },
  {
    name: 'platformFeePercent',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// ABI for RentalEscrow contract
export const RENTAL_ESCROW_ABI = [
  {
    name: 'fundRental',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'rentalId', type: 'uint256' },
      { name: 'agentOwner', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'startRental',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'rentalId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'completeRental',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'rentalId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancelRental',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'rentalId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'openDispute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'rentalId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getRental',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'rentalId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'rentalId', type: 'uint256' },
          { name: 'renter', type: 'address' },
          { name: 'agentOwner', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'platformFee', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'fundedAt', type: 'uint256' },
          { name: 'completedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'platformFeeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getEscrowBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// ERC20 ABI for USDC
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

// Rental status enum matching contract
export enum RentalEscrowStatus {
  None = 0,
  Funded = 1,
  Active = 2,
  Completed = 3,
  Cancelled = 4,
  Disputed = 5,
  Refunded = 6,
}
