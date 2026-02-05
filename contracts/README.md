# JamEscrow Contract

Escrow contract for The Jam bounty platform on Base.

## Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install
```

## Build

```bash
forge build
```

## Test

```bash
forge test
```

## Deploy

### Environment Variables

Create a `.env` file:

```
DEPLOYER_PRIVATE_KEY=your_private_key_here
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
FEE_RECIPIENT=0x...  # Optional, defaults to deployer
```

### Deploy to Base Sepolia (Testnet)

```bash
source .env
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC_URL --broadcast --verify
```

### Deploy to Base Mainnet

```bash
source .env
forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast --verify
```

## Contract

**JamEscrow.sol** - Main escrow contract

### Functions

- `fund(challengeId, amount)` - Fund a challenge with USDC
- `payWinner(challengeId, winner)` - Pay winner (admin only)
- `refund(challengeId, contributors[])` - Refund if cancelled (admin only)
- `setFee(bps)` - Set platform fee (admin only, max 10%)
- `transferAdmin(newAdmin)` / `acceptAdmin()` - 2-step admin transfer

### Events

- `Funded(challengeId, funder, amount)`
- `WinnerPaid(challengeId, winner, amount, fee)`
- `Refunded(challengeId, funder, amount)`

## USDC Addresses

| Network | Address |
|---------|---------|
| Base Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
