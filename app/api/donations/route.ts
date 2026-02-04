/**
 * Platform Donations API
 * GET: List recent donations (donation wall)
 * POST: Record a donation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/donations - List recent donations
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  // Get confirmed donations
  const { data: donations, error } = await supabaseAdmin
    .from('donations')
    .select(`
      id,
      created_at,
      amount,
      token,
      chain,
      message,
      is_anonymous,
      donor_name,
      profiles:donor_id (display_name, username, avatar_url),
      agents:donor_agent (name, slug, avatar_url)
    `)
    .eq('tx_confirmed', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate totals
  const { data: totals } = await supabaseAdmin
    .from('donations')
    .select('amount')
    .eq('tx_confirmed', true);

  const totalDonated = totals?.reduce((acc, d) => acc + parseFloat(d.amount), 0) || 0;
  const donorCount = new Set(donations?.map(d => d.profiles || d.agents || 'anon')).size;

  // Format for display
  const formattedDonations = donations?.map(d => {
    const profile = d.profiles as any;
    const agent = d.agents as any;
    return {
      id: d.id,
      created_at: d.created_at,
      amount: d.amount,
      token: d.token,
      chain: d.chain,
      message: d.message,
      donor: d.is_anonymous ? {
        name: 'Anonymous',
        avatar: null,
      } : {
        name: d.donor_name || profile?.display_name || profile?.username || agent?.name || 'Supporter',
        avatar: profile?.avatar_url || agent?.avatar_url,
        slug: agent?.slug,
      },
    };
  });

  return NextResponse.json({
    donations: formattedDonations,
    total_donated: totalDonated,
    donor_count: donorCount,
  });
}

// POST /api/donations - Record a donation
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');

  // Auth is optional for donations
  let userId: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  }

  const body = await request.json();
  const { 
    amount, 
    token = 'USDC', 
    chain, 
    wallet_address, 
    tx_hash, 
    message,
    donor_name,
    is_anonymous = false,
  } = body;

  // Validate
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
  }
  if (!chain || !['solana', 'base', 'ethereum'].includes(chain)) {
    return NextResponse.json({ error: 'Valid chain required' }, { status: 400 });
  }
  if (!tx_hash) {
    return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
  }

  // Check for duplicate tx
  const { data: existing } = await supabaseAdmin
    .from('donations')
    .select('id')
    .eq('tx_hash', tx_hash)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Transaction already recorded' }, { status: 409 });
  }

  // Insert donation
  const { data: donation, error } = await supabaseAdmin
    .from('donations')
    .insert({
      donor_id: userId,
      amount,
      token,
      chain,
      wallet_address,
      tx_hash,
      tx_confirmed: true, // In production, verify on-chain
      message: message?.substring(0, 500),
      donor_name: donor_name?.substring(0, 100),
      is_anonymous,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update metrics
  await supabaseAdmin.rpc('increment_metric', {
    metric_name: 'total_donations',
    increment_by: amount,
  });

  return NextResponse.json({ donation, success: true });
}
