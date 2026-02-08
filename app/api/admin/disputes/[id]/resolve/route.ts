import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/disputes/[id]/resolve - Resolve a dispute (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { resolution, renter_refund_percent, admin_notes } = body;

    if (!resolution || renter_refund_percent === undefined) {
      return NextResponse.json({ error: 'Resolution and refund percent required' }, { status: 400 });
    }

    if (renter_refund_percent < 0 || renter_refund_percent > 100) {
      return NextResponse.json({ error: 'Refund percent must be 0-100' }, { status: 400 });
    }

    // Get dispute
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('rental_disputes')
      .select(`*, rental:rentals(*, agent:agents(id, owner_id))`)
      .eq('id', id)
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    if (dispute.status === 'resolved') {
      return NextResponse.json({ error: 'Dispute already resolved' }, { status: 400 });
    }

    const rental = dispute.rental;
    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;
    const totalAmount = rental.agreed_price;
    
    // Calculate payouts
    const renterRefund = (totalAmount * renter_refund_percent) / 100;
    const ownerPayout = totalAmount - renterRefund;

    // Update dispute
    const { data: resolvedDispute, error: updateError } = await supabaseAdmin
      .from('rental_disputes')
      .update({
        status: 'resolved',
        resolution,
        renter_refund_percent,
        renter_refund_amount: renterRefund,
        owner_payout_amount: ownerPayout,
        admin_notes,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 });
    }

    // Update rental status
    await supabaseAdmin
      .from('rentals')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        final_amount: ownerPayout,
      })
      .eq('id', rental.id);

    // Queue payouts if needed
    if (ownerPayout > 0) {
      await supabaseAdmin
        .from('pending_payouts')
        .insert({
          rental_id: rental.id,
          agent_id: agent?.id,
          owner_id: agent?.owner_id,
          amount: ownerPayout,
          currency: rental.currency || 'usd',
          status: 'pending',
          notes: `Dispute resolution: ${renter_refund_percent}% to renter`,
        });
    }

    // Notify both parties
    await supabaseAdmin
      .from('notifications')
      .insert([
        {
          user_id: rental.renter_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved',
          message: `Your dispute has been resolved. Refund: $${renterRefund.toFixed(2)}`,
          data: { rental_id: rental.id, dispute_id: id, refund: renterRefund },
        },
        {
          user_id: agent?.owner_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved',
          message: `The dispute has been resolved. Payout: $${ownerPayout.toFixed(2)}`,
          data: { rental_id: rental.id, dispute_id: id, payout: ownerPayout },
        },
      ]);

    // System message
    await supabaseAdmin
      .from('rental_messages')
      .insert({
        rental_id: rental.id,
        sender_id: user.id,
        sender_type: 'agent',
        content: `✅ Dispute resolved by admin. Renter refund: ${renter_refund_percent}%, Owner payout: ${100 - renter_refund_percent}%`,
        message_type: 'system',
      });

    logger.info(`Dispute ${id} resolved: ${renter_refund_percent}% to renter, ${100 - renter_refund_percent}% to owner`);

    return NextResponse.json({ 
      dispute: resolvedDispute,
      renter_refund: renterRefund,
      owner_payout: ownerPayout,
    });
  } catch (error: any) {
    logger.error('Dispute resolve error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/admin/disputes - List all disputes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('rental_disputes')
      .select(`
        *,
        rental:rentals(id, agreed_price, status, agent:agents(id, name))
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: disputes, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 });
    }

    return NextResponse.json({ disputes });
  } catch (error: any) {
    logger.error('Disputes list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
