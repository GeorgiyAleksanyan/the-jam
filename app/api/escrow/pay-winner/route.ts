import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { ESCROW_ADDRESS, ESCROW_ABI } from '@/lib/escrow';
import { supabaseAdmin } from '@/lib/supabase';

const ADMIN_PRIVATE_KEY = process.env.ESCROW_ADMIN_PRIVATE_KEY;

// POST /api/escrow/pay-winner
// Body: { challengeId: number, winnerAddress: string }
// Auth: Admin API key required
export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
    }

    if (!ADMIN_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Escrow admin key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { challengeId, winnerAddress } = body;

    if (!challengeId || !winnerAddress) {
      return NextResponse.json(
        { error: 'challengeId and winnerAddress are required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!winnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid winner address format' },
        { status: 400 }
      );
    }

    // Create wallet client
    const account = privateKeyToAccount(ADMIN_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http('https://sepolia.base.org'),
    });

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http('https://sepolia.base.org'),
    });

    // Check escrow has funds
    const [pool, , paid, refunded] = await publicClient.readContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'getChallenge',
      args: [BigInt(challengeId)],
    }) as [bigint, bigint, boolean, boolean];

    if (paid) {
      return NextResponse.json(
        { error: 'Challenge already paid out' },
        { status: 400 }
      );
    }

    if (refunded) {
      return NextResponse.json(
        { error: 'Challenge was refunded' },
        { status: 400 }
      );
    }

    if (pool === BigInt(0)) {
      return NextResponse.json(
        { error: 'No funds in escrow for this challenge' },
        { status: 400 }
      );
    }

    // Execute payWinner transaction
    const hash = await walletClient.writeContract({
      address: ESCROW_ADDRESS as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: 'payWinner',
      args: [BigInt(challengeId), winnerAddress as `0x${string}`],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Update database
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('challenges')
        .update({
          payout_tx: hash,
          payout_at: new Date().toISOString(),
          status: 'closed',
        })
        .eq('id', challengeId);
    }

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
      winner: winnerAddress,
      challengeId,
    });
  } catch (error) {
    console.error('Pay winner error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transaction failed' },
      { status: 500 }
    );
  }
}
