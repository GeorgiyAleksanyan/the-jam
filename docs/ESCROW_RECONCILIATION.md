# Escrow Reconciliation Report

**Date:** 2026-02-09
**Status:** ACTION REQUIRED

## Issue Summary

The on-chain escrow contract was funded using **GitHub issue numbers** instead of **database challenge IDs**, causing a mismatch between on-chain funds and database records.

## Current State

### On-Chain Escrow Balances (Base Mainnet)

| On-Chain ID | USDC | Status |
|-------------|------|--------|
| 2 | 1 USDC | Unclaimed |
| 3 | 1 USDC | Unclaimed |
| 4 | 0 | ✅ Paid to aybanda (tx: 0xec7be3a...) |
| 6 | 6 USDC | Unclaimed |
| 7 | 2 USDC | Unclaimed |
| 8 | 2 USDC | Unclaimed |
| **Total** | **12 USDC** | Remaining on-chain |

### Database Challenges

| DB ID | Title | prize_pool | GitHub Issue # | Status |
|-------|-------|------------|----------------|--------|
| 6 | Challenge Search | 6 | ? | closed |
| 7 | HTTP Mock Tool | 2 | ? | funding |
| 18 | Hello Jam | 0 | #1 | closed |
| 19 | Array Flattener | 0 | #2 | closed |
| 20 | MCP Echo Tool | 0 | #3 | closed |
| 21 | Token Bucket | 0 | #4 | closed |
| 22 | Agent Utility | 0 | #5 | closed |

## Root Cause

1. Escrow contract uses `challengeId` as the unique identifier for funds
2. The funding UI/process used GitHub issue numbers (1, 2, 3...) instead of DB IDs (18, 19, 20...)
3. DB auto-increment IDs don't match GitHub issue numbers
4. Result: Funds are orphaned under wrong IDs

## Mapping (GitHub Issue → On-Chain ID → DB ID)

| GitHub Issue | On-Chain ID Used | DB ID (Actual) | Funds |
|--------------|------------------|----------------|-------|
| #1 | 1 | 18 | 0 USDC |
| #2 | 2 | 19 | 1 USDC orphaned |
| #3 | 3 | 20 | 1 USDC orphaned |
| #4 | 4 | 21 | ✅ Manually paid |
| #5 | 5 | 22 | 0 USDC |
| #6 | 6 | 6 (matched) | 6 USDC |
| #7 | 7 | 7 (matched) | 2 USDC |
| #8 | 8 | ? | 2 USDC orphaned |

## Recommended Fixes

### Option A: Manual Reconciliation (Immediate)
For each orphaned fund, manually call `payWinner(onChainId, winnerAddress)` when a winner is selected, using the on-chain ID that has funds.

### Option B: Add escrow_challenge_id Field (Recommended)
1. Add `escrow_challenge_id` column to challenges table
2. Store the actual on-chain ID used when funding
3. Update payout logic to use `escrow_challenge_id` instead of `id`

### Option C: Refund and Re-fund
1. Call `refund(challengeId)` for each orphaned fund
2. Re-fund using correct DB IDs
3. Requires USDC going back to original funder

## Prevention Going Forward

1. **Always use DB ID for escrow** - never GitHub issue number
2. **UI should show DB ID clearly** when funding
3. **Add validation** - confirm fund-params uses correct ID
4. **Registration requirement** - document clearly that winners must:
   - Register on The Jam
   - Link a Base network wallet
   - Submit through the platform

## Immediate Actions

- [x] Paid aybanda for Token Bucket (on-chain ID 4)
- [ ] Decide handling for orphaned funds (2, 3, 6, 7, 8)
- [ ] Add escrow_challenge_id column to DB
- [ ] Update documentation for challenge creators
