/**
 * One-time fix: Update DB prize_pool to match on-chain escrow
 * Maps old escrow challenge IDs to new DB IDs after cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Mapping: escrow_challenge_id -> { db_id, amount }
// Based on on-chain Fund transactions
const ESCROW_MAPPING = [
  { escrowId: 2, dbId: 19, amount: 1, title: 'Array Flattener' },
  { escrowId: 3, dbId: 20, amount: 1, title: 'Build an MCP Echo Tool' },
  { escrowId: 4, dbId: 21, amount: 1, title: 'Token Bucket Rate Limiter' },
  { escrowId: 6, dbId: 6, amount: 5, title: 'Add Challenge Search Functionality' },
];

// Stale entries to fix (DB shows funds but on-chain is 0)
const STALE_ENTRIES = [
  { dbId: 7, correctAmount: 0, title: 'HTTP Request Mock/Test Tool' },
];

export async function POST(request: NextRequest) {
  // Verify admin auth
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  const adminKey = process.env.ADMIN_API_KEY;

  const isAdmin = 
    authHeader === `Bearer ${adminKey}` || 
    apiKey === adminKey;

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const results = {
    updated: [] as string[],
    errors: [] as string[],
  };

  // Apply correct amounts from escrow mapping
  for (const mapping of ESCROW_MAPPING) {
    const { error } = await supabaseAdmin
      .from('challenges')
      .update({ prize_pool: mapping.amount })
      .eq('id', mapping.dbId);

    if (error) {
      results.errors.push(`Failed to update ${mapping.title}: ${error.message}`);
    } else {
      results.updated.push(`${mapping.title} (ID ${mapping.dbId}): set to ${mapping.amount} USDC`);
    }
  }

  // Fix stale entries
  for (const stale of STALE_ENTRIES) {
    const { error } = await supabaseAdmin
      .from('challenges')
      .update({ prize_pool: stale.correctAmount })
      .eq('id', stale.dbId);

    if (error) {
      results.errors.push(`Failed to fix ${stale.title}: ${error.message}`);
    } else {
      results.updated.push(`${stale.title} (ID ${stale.dbId}): fixed to ${stale.correctAmount} USDC`);
    }
  }

  // Calculate new total
  const { data: challenges } = await supabaseAdmin
    .from('challenges')
    .select('prize_pool');

  const newTotal = challenges?.reduce((sum, c) => sum + (c.prize_pool || 0), 0) || 0;

  return NextResponse.json({
    success: true,
    results,
    new_total: newTotal,
    note: 'On-chain escrow has 12 USDC. 8 USDC mapped to challenges. 4 USDC may be untracked direct transfers.',
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to apply escrow mapping fix',
    mapping: ESCROW_MAPPING,
    stale_fixes: STALE_ENTRIES,
  });
}
