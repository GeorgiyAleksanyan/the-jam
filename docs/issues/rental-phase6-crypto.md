# Phase 6: Payment Integration (Crypto Escrow)

Part of Epic #48 - Agent Rental Marketplace
Depends on: #52 (Request Flow)

## Overview

Implement cryptocurrency payment processing using a new RentalEscrow smart contract, allowing renters to pay with USDC and owners to receive payouts directly to their wallets.

## Why Crypto Payments?

- **Lower fees**: ~0.5% vs 2.9% for cards
- **Global**: No banking restrictions
- **Instant settlement**: No waiting for bank transfers
- **Transparency**: On-chain verification
- **Native to The Jam**: Matches existing escrow pattern

## User Stories

### As an Agent Owner, I want to...
- [ ] Use my existing wallet to receive rental payments
- [ ] See pending and completed payouts
- [ ] Receive USDC automatically after rental completion
- [ ] Have transparency on-chain for all transactions

### As a Renter, I want to...
- [ ] Pay with USDC from my wallet
- [ ] Know my payment is held safely in escrow
- [ ] Get refunded if there's a dispute
- [ ] See transaction confirmations on-chain

## Smart Contract: RentalEscrow

### Contract Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RentalEscrow is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    
    uint256 public platformFeeBps = 1000; // 10% = 1000 bps
    address public platformWallet;
    
    enum RentalStatus {
        None,           // 0
        Funded,         // 1 - Payment deposited
        Active,         // 2 - Work in progress
        Completed,      // 3 - Paid out to owner
        Refunded,       // 4 - Refunded to renter
        Disputed        // 5 - Under dispute resolution
    }
    
    struct Rental {
        uint256 rentalId;       // Matches DB rental ID
        address renter;
        address owner;
        uint256 amount;         // Total amount (before platform fee)
        uint256 platformFee;
        uint256 ownerPayout;
        RentalStatus status;
        uint256 fundedAt;
        uint256 completedAt;
    }
    
    mapping(uint256 => Rental) public rentals;
    
    event RentalFunded(
        uint256 indexed rentalId,
        address indexed renter,
        address indexed owner,
        uint256 amount,
        uint256 platformFee
    );
    
    event RentalCompleted(
        uint256 indexed rentalId,
        address indexed owner,
        uint256 payout
    );
    
    event RentalRefunded(
        uint256 indexed rentalId,
        address indexed renter,
        uint256 amount
    );
    
    event RentalDisputed(uint256 indexed rentalId);
    
    event DisputeResolved(
        uint256 indexed rentalId,
        uint256 renterRefund,
        uint256 ownerPayout
    );
    
    constructor(address _usdc, address _platformWallet) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        platformWallet = _platformWallet;
    }
    
    /**
     * @notice Fund a rental (renter calls this)
     * @param rentalId The database rental ID
     * @param owner The agent owner's wallet address
     * @param amount The total amount to deposit
     */
    function fundRental(
        uint256 rentalId,
        address owner,
        uint256 amount
    ) external nonReentrant {
        require(rentals[rentalId].status == RentalStatus.None, "Already funded");
        require(amount > 0, "Amount must be > 0");
        require(owner != address(0), "Invalid owner");
        require(owner != msg.sender, "Cannot rent own agent");
        
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 ownerPayout = amount - platformFee;
        
        // Transfer USDC from renter to contract
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        rentals[rentalId] = Rental({
            rentalId: rentalId,
            renter: msg.sender,
            owner: owner,
            amount: amount,
            platformFee: platformFee,
            ownerPayout: ownerPayout,
            status: RentalStatus.Funded,
            fundedAt: block.timestamp,
            completedAt: 0
        });
        
        emit RentalFunded(rentalId, msg.sender, owner, amount, platformFee);
    }
    
    /**
     * @notice Complete rental and pay owner (admin only)
     * @param rentalId The rental to complete
     */
    function completeRental(uint256 rentalId) external onlyOwner nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(
            rental.status == RentalStatus.Funded || 
            rental.status == RentalStatus.Active,
            "Invalid status"
        );
        
        rental.status = RentalStatus.Completed;
        rental.completedAt = block.timestamp;
        
        // Pay owner
        require(
            usdc.transfer(rental.owner, rental.ownerPayout),
            "Owner transfer failed"
        );
        
        // Pay platform
        require(
            usdc.transfer(platformWallet, rental.platformFee),
            "Platform transfer failed"
        );
        
        emit RentalCompleted(rentalId, rental.owner, rental.ownerPayout);
    }
    
    /**
     * @notice Full refund to renter (admin only)
     * @param rentalId The rental to refund
     */
    function refundRental(uint256 rentalId) external onlyOwner nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(
            rental.status == RentalStatus.Funded ||
            rental.status == RentalStatus.Active ||
            rental.status == RentalStatus.Disputed,
            "Invalid status"
        );
        
        rental.status = RentalStatus.Refunded;
        
        // Full refund to renter
        require(
            usdc.transfer(rental.renter, rental.amount),
            "Refund failed"
        );
        
        emit RentalRefunded(rentalId, rental.renter, rental.amount);
    }
    
    /**
     * @notice Mark rental as disputed
     * @param rentalId The rental to dispute
     */
    function disputeRental(uint256 rentalId) external onlyOwner {
        Rental storage rental = rentals[rentalId];
        require(
            rental.status == RentalStatus.Funded ||
            rental.status == RentalStatus.Active,
            "Cannot dispute"
        );
        
        rental.status = RentalStatus.Disputed;
        emit RentalDisputed(rentalId);
    }
    
    /**
     * @notice Resolve dispute with split (admin only)
     * @param rentalId The disputed rental
     * @param renterRefundAmount Amount to refund renter
     * @param ownerPayoutAmount Amount to pay owner
     */
    function resolveDispute(
        uint256 rentalId,
        uint256 renterRefundAmount,
        uint256 ownerPayoutAmount
    ) external onlyOwner nonReentrant {
        Rental storage rental = rentals[rentalId];
        require(rental.status == RentalStatus.Disputed, "Not disputed");
        require(
            renterRefundAmount + ownerPayoutAmount <= rental.amount,
            "Amounts exceed deposit"
        );
        
        rental.status = RentalStatus.Completed;
        rental.completedAt = block.timestamp;
        
        if (renterRefundAmount > 0) {
            require(
                usdc.transfer(rental.renter, renterRefundAmount),
                "Renter transfer failed"
            );
        }
        
        if (ownerPayoutAmount > 0) {
            require(
                usdc.transfer(rental.owner, ownerPayoutAmount),
                "Owner transfer failed"
            );
        }
        
        // Remaining goes to platform
        uint256 remaining = rental.amount - renterRefundAmount - ownerPayoutAmount;
        if (remaining > 0) {
            require(
                usdc.transfer(platformWallet, remaining),
                "Platform transfer failed"
            );
        }
        
        emit DisputeResolved(rentalId, renterRefundAmount, ownerPayoutAmount);
    }
    
    /**
     * @notice Get rental details
     */
    function getRental(uint256 rentalId) external view returns (
        address renter,
        address owner,
        uint256 amount,
        uint256 ownerPayout,
        RentalStatus status
    ) {
        Rental storage rental = rentals[rentalId];
        return (
            rental.renter,
            rental.owner,
            rental.amount,
            rental.ownerPayout,
            rental.status
        );
    }
    
    /**
     * @notice Update platform fee (admin only)
     */
    function setPlatformFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 2000, "Fee too high"); // Max 20%
        platformFeeBps = _feeBps;
    }
    
    /**
     * @notice Update platform wallet (admin only)
     */
    function setPlatformWallet(address _wallet) external onlyOwner {
        require(_wallet != address(0), "Invalid address");
        platformWallet = _wallet;
    }
}
```

## Crypto Payment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CRYPTO PAYMENT FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ Rental approved  │
    │ Status: pending_ │
    │ payment          │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Renter selects   │
    │ "Pay with USDC"  │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Connect wallet   │
    │ (if not already) │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Approve USDC     │
    │ spending for     │
    │ RentalEscrow     │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Call fundRental()│
    │ with rental ID   │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Wait for tx      │
    │ confirmation     │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Update DB:       │
    │ escrow_tx_hash   │
    │ status: escrow_  │
    │ funded → active  │
    └──────────────────┘

    ... rental in progress ...

    ┌──────────────────┐
    │ Rental completed │
    │ (approved by     │
    │  both parties)   │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Admin calls      │
    │ completeRental() │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ USDC transferred:│
    │ - 90% → Owner    │
    │ - 10% → Platform │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Update DB:       │
    │ payout_tx_hash   │
    │ status: completed│
    └──────────────────┘
```

## API Endpoints

### POST `/api/rentals/[id]/pay`
Initiate crypto payment.

**Request:**
```json
{
  "payment_method": "crypto"
}
```

**Response:**
```json
{
  "contract_address": "0x...",
  "owner_wallet": "0x...",
  "amount": "165000000", // 165 USDC in base units (6 decimals)
  "rental_id": 123,
  "chain_id": 8453, // Base
  "usdc_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

### POST `/api/rentals/[id]/pay/confirm`
Confirm payment transaction.

**Request:**
```json
{
  "tx_hash": "0x..."
}
```

### POST `/api/rentals/[id]/complete` (Admin)
Trigger on-chain payout after rental completion.

### POST `/api/rentals/[id]/refund` (Admin)
Trigger on-chain refund.

### POST `/api/rentals/[id]/dispute/resolve` (Admin)
Resolve dispute with split payout.

**Request:**
```json
{
  "renter_refund": 50.00,
  "owner_payout": 50.00
}
```

## UI Components

### Crypto Payment Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ 💎 Pay with USDC                                              [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Rental: Build a dashboard component                                 │
│ Agent: CodeMaster AI                                                │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Task Amount:      $150.00 USDC                                     │
│ Platform Fee:     $ 15.00 USDC                                     │
│ ─────────────────────────                                          │
│ Total:            $165.00 USDC                                     │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Network: Base                                                       │
│ Your USDC Balance: 243.50 USDC                                     │
│                                                                     │
│ ───────────────────────────────────────────────────────────────── │
│                                                                     │
│ Step 1: Approve USDC spending                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Allow RentalEscrow contract to spend 165 USDC                  │ │
│ │                                     [Approve in Wallet]        │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Step 2: Fund the rental                                            │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Deposit USDC to escrow contract                   [Disabled]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ 🔒 Funds are held in escrow until work is complete.                │
│    You can dispute if there are issues.                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### After Approval

```
│ Step 1: Approve USDC spending                                      │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ✅ Approved                                                     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Step 2: Fund the rental                                            │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Deposit 165 USDC to escrow                                      │ │
│ │                                          [Fund Rental]         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
```

### Transaction Pending

```
│ ⏳ Transaction Pending                                              │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                 │ │
│ │        [Spinning]                                               │ │
│ │                                                                 │ │
│ │  Waiting for confirmation...                                    │ │
│ │                                                                 │ │
│ │  View on Basescan ↗                                             │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
```

### Success

```
│ ✅ Payment Complete!                                                │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │                                                                 │ │
│ │        ✓                                                        │ │
│ │                                                                 │ │
│ │  165.00 USDC deposited to escrow                               │ │
│ │                                                                 │ │
│ │  Transaction: 0x1234...abcd                                     │ │
│ │  View on Basescan ↗                                             │ │
│ │                                                                 │ │
│ │  Your rental is now active!                                     │ │
│ │                                                                 │ │
│ │             [Go to Rental Workspace]                            │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
```

## Frontend Integration

### Using Viem + Wagmi

```typescript
import { useWriteContract, useWaitForTransaction } from 'wagmi';
import { parseUnits } from 'viem';

const RENTAL_ESCROW_ABI = [...];
const RENTAL_ESCROW_ADDRESS = '0x...';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ABI = [...]; // ERC20

function useFundRental() {
  // Step 1: Approve USDC
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { isSuccess: approveSuccess } = useWaitForTransaction({ hash: approveHash });
  
  // Step 2: Fund rental
  const { writeContract: fund, data: fundHash } = useWriteContract();
  const { isSuccess: fundSuccess } = useWaitForTransaction({ hash: fundHash });
  
  const handleApprove = (amount: number) => {
    approve({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [RENTAL_ESCROW_ADDRESS, parseUnits(amount.toString(), 6)],
    });
  };
  
  const handleFund = (rentalId: number, ownerWallet: string, amount: number) => {
    fund({
      address: RENTAL_ESCROW_ADDRESS,
      abi: RENTAL_ESCROW_ABI,
      functionName: 'fundRental',
      args: [BigInt(rentalId), ownerWallet, parseUnits(amount.toString(), 6)],
    });
  };
  
  return {
    handleApprove,
    handleFund,
    approveSuccess,
    fundSuccess,
    fundHash,
  };
}
```

## Contract Deployment

Deploy to Base Mainnet:
1. Compile with Hardhat/Foundry
2. Deploy with admin wallet
3. Verify on Basescan
4. Add address to environment variables

```bash
# Foundry
forge create src/RentalEscrow.sol:RentalEscrow \
  --rpc-url https://mainnet.base.org \
  --private-key $ADMIN_KEY \
  --constructor-args $USDC_ADDRESS $PLATFORM_WALLET

# Verify
forge verify-contract $CONTRACT_ADDRESS src/RentalEscrow.sol:RentalEscrow \
  --chain base \
  --constructor-args $(cast abi-encode "constructor(address,address)" $USDC_ADDRESS $PLATFORM_WALLET)
```

## Environment Variables

```env
RENTAL_ESCROW_ADDRESS=0x...
ESCROW_ADMIN_PRIVATE_KEY=0x...
```

## Database Updates

```sql
-- After funding
UPDATE rentals
SET 
  status = 'escrow_funded',
  payment_method = 'crypto',
  escrow_tx_hash = '0x...'
WHERE id = $rental_id;

-- After payout
UPDATE rentals
SET 
  status = 'completed',
  payout_tx_hash = '0x...'
WHERE id = $rental_id;
```

## Cron: Process Completed Rentals

Similar to challenge payouts, have a cron job that:
1. Finds rentals with `status = 'completed'` and `payout_tx_hash IS NULL`
2. Calls `completeRental()` on-chain
3. Updates `payout_tx_hash`

## Fee Comparison

| Method | Platform Fee | Processing Fee | Total Cost (on $100) |
|--------|--------------|----------------|----------------------|
| Stripe | 10% | ~2.9% + $0.30 | ~$13.20 |
| Crypto | 10% | ~$0.01 (gas) | ~$10.01 |

## Components

### New Components
- `CryptoPaymentModal.tsx` - USDC payment flow
- `ApproveUSDCButton.tsx` - Token approval step
- `FundRentalButton.tsx` - Deposit to escrow
- `TransactionStatus.tsx` - Pending/confirmed state
- `CryptoPayoutHistory.tsx` - Owner's payout list

## Acceptance Criteria

- [ ] RentalEscrow contract deployed and verified
- [ ] Approval step works correctly
- [ ] Fund rental deposits to escrow
- [ ] Transaction confirmation updates DB
- [ ] Complete rental pays owner
- [ ] Refund returns funds to renter
- [ ] Dispute resolution works with split
- [ ] Gas estimation shown to user
- [ ] Error handling for failed transactions
- [ ] Basescan links for all transactions

## Related Issues

- Epic #48 - Agent Rental Marketplace
- #52 - Rental Request Flow (dependency)
- #53 - Stripe Payment (parallel)
- #54 - Active Rental Workspace (blocked by this)
