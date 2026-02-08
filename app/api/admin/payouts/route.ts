/**
 * Admin Payouts Management
 * 
 * GET: List all pending payouts with status
 * POST: Retry a specific payout
 * 
 * Requires admin API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${process.env.ADMIN_API_KEY}`;
}

// GET /api/admin/payouts - List all payouts
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabaseAdmin
    .from('pending_payouts')
    .select(`
      *,
      agents:agent_id (id, name, slug, wallet_address),
      challenges:challenge_id (id, title, slug, prize_pool)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get summary stats
  const { data: stats } = await supabaseAdmin
    .from('pending_payouts')
    .select('status, amount');

  const summary = {
    pending: 0,
    no_wallet: 0,
    processing: 0,
    paid: 0,
    failed: 0,
    total_pending_amount: 0,
    total_paid_amount: 0,
  };

  stats?.forEach((p: any) => {
    if (summary.hasOwnProperty(p.status)) {
      summary[p.status as keyof typeof summary]++;
    }
    if (['pending', 'no_wallet', 'processing'].includes(p.status)) {
      summary.total_pending_amount += parseFloat(p.amount) || 0;
    }
    if (p.status === 'paid') {
      summary.total_paid_amount += parseFloat(p.amount) || 0;
    }
  });

  return NextResponse.json({
    payouts: data,
    summary,
  });
}

// POST /api/admin/payouts - Retry a payout or update status
// Body: { payout_id: number, action: 'retry' | 'mark_paid' | 'mark_failed' }
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const body = await request.json();
  const { payout_id, action, tx_hash } = body;

  if (!payout_id || !action) {
    return NextResponse.json({ error: 'payout_id and action required' }, { status: 400 });
  }

  // Get payout
  const { data: payout, error } = await supabaseAdmin
    .from('pending_payouts')
    .select('*')
    .eq('id', payout_id)
    .single();

  if (error || !payout) {
    return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
  }

  switch (action) {
    case 'retry':
      // Reset to pending for retry
      await supabaseAdmin
        .from('pending_payouts')
        .update({ 
          status: 'pending', 
          attempts: 0,
          error: null,
        })
        .eq('id', payout_id);

      // Trigger the cron endpoint
      try {
        await fetch(new URL('/api/cron/process-payouts', request.url).toString(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.ADMIN_API_KEY}`,
          },
        });
      } catch {}

      return NextResponse.json({ success: true, message: 'Payout queued for retry' });

    case 'mark_paid':
      if (!tx_hash) {
        return NextResponse.json({ error: 'tx_hash required for mark_paid' }, { status: 400 });
      }

      await supabaseAdmin
        .from('pending_payouts')
        .update({ 
          status: 'paid', 
          tx_hash,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payout_id);

      // Update challenge too
      await supabaseAdmin
        .from('challenges')
        .update({ 
          payout_tx: tx_hash,
          payout_at: new Date().toISOString(),
        })
        .eq('id', payout.challenge_id);

      return NextResponse.json({ success: true, message: 'Marked as paid' });

    case 'mark_failed':
      await supabaseAdmin
        .from('pending_payouts')
        .update({ 
          status: 'failed', 
          error: body.reason || 'Manually marked as failed',
        })
        .eq('id', payout_id);

      return NextResponse.json({ success: true, message: 'Marked as failed' });

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
