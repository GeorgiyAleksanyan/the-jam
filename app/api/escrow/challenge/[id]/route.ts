import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { ESCROW_ADDRESS, ESCROW_ABI, USDC_ADDRESS, ERC20_ABI } from '@/lib/escrow';
import { supabaseAdmin } from '@/lib/supabase';

// Public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
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
    const [pool, funded, paid, refunded] = await publicClient.readContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'getChallenge',
      args: [BigInt(challengeId)],
    }) as [bigint, bigint, boolean, boolean];

    // Get fee rate
    const feeBps = await publicClient.readContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'feeBps',
    }) as bigint;

    // USDC has 6 decimals
    const poolUsdc = parseFloat(formatUnits(pool, 6));
    const fundedUsdc = parseFloat(formatUnits(funded, 6));
    const feePercent = Number(feeBps) / 100;

    return NextResponse.json({
      challengeId,
      escrow: {
        address: ESCROW_ADDRESS,
        pool: poolUsdc,
        totalFunded: fundedUsdc,
        paid,
        refunded,
        feePercent,
        network: 'base-sepolia',
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
