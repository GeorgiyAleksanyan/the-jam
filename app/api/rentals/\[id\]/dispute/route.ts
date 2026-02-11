import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient as createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rentals/[id]/dispute - Open a dispute for a rental
 */
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

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const { reason, evidence } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Dispute reason is required' }, { status: 400 });
    }

    // 1. Verify Rental Ownership
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        id, renter_id, status, amount, currency,
        agent:agents(owner_id)
      `)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const agentOwnerId = Array.isArray(rental.agent) ? rental.agent[0]?.owner_id : rental.agent?.owner_id;
    const isRenter = rental.renter_id === user.id;
    const isOwner = agentOwnerId === user.id;

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized to dispute this rental' }, { status: 403 });
    }

    // 2. Validate Status
    // Can only dispute active or completed (before payout finalization) rentals
    if (!['active', 'completed'].includes(rental.status)) {
      return NextResponse.json({ 
        error: `Cannot dispute rental in '${rental.status}' status` 
      }, { status: 400 });
    }

    // 3. Create Dispute Record
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('disputes')
      .insert({
        rental_id: parseInt(id),
        opener_id: user.id,
        opener_role: isRenter ? 'renter' : 'owner',
        reason,
        evidence: evidence || {},
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (disputeError) {
      throw disputeError;
    }

    // 4. Update Rental Status to 'disputed' (Locks funds)
    const { error: updateError } = await supabaseAdmin
      .from('rentals')
      .update({ status: 'disputed' })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    // 5. Notify Admins/Opposite Party (Placeholder logic)
    // await notifyAdmins(dispute.id);

    return NextResponse.json({
      success: true,
      message: 'Dispute opened successfully. Funds are locked pending resolution.',
      dispute
    });

  } catch (error: any) {
    console.error('Dispute error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
