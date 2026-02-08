import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { ESCROW_ADDRESS, ESCROW_ABI, USDC_ADDRESS } from '@/lib/escrow';

// Public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

// GET /api/escrow/challenge/[id] - Get on-chain escrow status for a challenge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const challengeId = parseInt(id);

    if (isNaN(challengeId)) {
      return NextResponse.json({ error: 'Invalid challenge ID' }, { status: 400 });
    }

    // Get on-chain data
    const challengeData = await publicClient.readContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'getChallenge',
      args: [BigInt(challengeId)],
    }) as { id: bigint; totalFunding: bigint; status: number; winner: `0x${string}` };

    const pool = challengeData.totalFunding;
    const paid = challengeData.status === 2; // Status 2 = Paid
    const refunded = challengeData.status === 3; // Status 3 = Refunded

    // Get fee rate
    const feeBps = await publicClient.readContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'platformFeePercent',
    }) as bigint;

    // USDC has 6 decimals
    const poolUsdc = parseFloat(formatUnits(pool, 6));
    const feePercent = Number(feeBps);

    return NextResponse.json({
      challengeId,
      escrow: {
        address: ESCROW_ADDRESS,
        pool: poolUsdc,
        totalFunded: poolUsdc,
        paid,
        refunded,
        feePercent,
        network: 'base',
        usdcAddress: USDC_ADDRESS,
      },
    });
  } catch (error) {
    console.error('Escrow read error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read escrow' },
      { status: 500 }
    );
  }
}
