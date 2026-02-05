import { NextRequest, NextResponse } from 'next/server';
import { ESCROW_ADDRESS, USDC_ADDRESS, ACTIVE_CHAIN_ID, ESCROW_ABI, ERC20_ABI } from '@/lib/escrow';

/**
 * GET /api/escrow/fund-params
 * 
 * Returns the parameters needed for a wallet to fund a challenge.
 * The frontend uses these to construct the transaction.
 * 
 * Query params:
 * - challengeId: The challenge ID (required)
 * - amount: Amount in USDC (required, e.g., "5" for 5 USDC)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get('challengeId');
    const amountStr = searchParams.get('amount');

    if (!challengeId || !amountStr) {
      return NextResponse.json(
        { error: 'challengeId and amount are required' },
        { status: 400 }
      );
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 }
      );
    }

    // Convert to USDC units (6 decimals)
    const amountInUnits = BigInt(Math.floor(amount * 1_000_000));

    // Step 1: Approve USDC spending
    const approveData = {
      to: USDC_ADDRESS,
      data: encodeApproveCall(ESCROW_ADDRESS, amountInUnits),
      description: `Approve ${amount} USDC for escrow`,
    };

    // Step 2: Fund the challenge
    const fundData = {
      to: ESCROW_ADDRESS,
      data: encodeFundCall(BigInt(challengeId), amountInUnits),
      description: `Fund challenge #${challengeId} with ${amount} USDC`,
    };

    return NextResponse.json({
      chainId: ACTIVE_CHAIN_ID,
      network: ACTIVE_CHAIN_ID === 84532 ? 'base-sepolia' : 'base',
      escrowAddress: ESCROW_ADDRESS,
      usdcAddress: USDC_ADDRESS,
      challengeId: parseInt(challengeId),
      amount,
      amountRaw: amountInUnits.toString(),
      transactions: [approveData, fundData],
      // For wallets that support EIP-712
      approve: {
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ESCROW_ADDRESS, amountInUnits.toString()],
      },
      fund: {
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'fund',
        args: [challengeId, amountInUnits.toString()],
      },
    });
  } catch (error) {
    console.error('Fund params error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// Simple ABI encoding for approve(address,uint256)
function encodeApproveCall(spender: string, amount: bigint): string {
  const selector = '0x095ea7b3'; // keccak256("approve(address,uint256)")[:4]
  const paddedSpender = spender.slice(2).padStart(64, '0');
  const paddedAmount = amount.toString(16).padStart(64, '0');
  return selector + paddedSpender + paddedAmount;
}

// Simple ABI encoding for fund(uint256,uint256)
function encodeFundCall(challengeId: bigint, amount: bigint): string {
  const selector = '0xa65e2cfd'; // keccak256("fund(uint256,uint256)")[:4]
  const paddedChallengeId = challengeId.toString(16).padStart(64, '0');
  const paddedAmount = amount.toString(16).padStart(64, '0');
  return selector + paddedChallengeId + paddedAmount;
}
