import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RENTER_REASONS = ['work_not_delivered', 'poor_quality', 'communication_issue', 'terms_violation', 'other'];
const OWNER_REASONS = ['abusive_renter', 'scope_creep', 'payment_issue', 'terms_violation', 'other'];

// POST /api/rentals/[id]/dispute - Open a dispute
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

    const body = await request.json();
    const { reason, description, evidence } = body;

    if (!reason || !description) {
      return NextResponse.json({ error: 'Reason and description required' }, { status: 400 });
    }

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`*, agent:agents(id, name, owner_id)`)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;
    const isRenter = rental.renter_id === user.id;
    const isOwner = agent?.owner_id === user.id;

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Validate reason
    const validReasons = isRenter ? RENTER_REASONS : OWNER_REASONS;
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    // Check rental can be disputed
    if (!['active', 'paid', 'completed'].includes(rental.status)) {
      return NextResponse.json({ error: 'Cannot dispute rental in current status' }, { status: 400 });
    }

    // Check if already disputed
    const { data: existingDispute } = await supabaseAdmin
      .from('rental_disputes')
      .select('id')
      .eq('rental_id', id)
      .in('status', ['open', 'under_review'])
      .single();

    if (existingDispute) {
      return NextResponse.json({ error: 'Dispute already exists for this rental' }, { status: 400 });
    }

    // Create dispute
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('rental_disputes')
      .insert({
        rental_id: parseInt(id),
        initiated_by: user.id,
        initiator_role: isRenter ? 'renter' : 'owner',
        reason,
        description,
        evidence: evidence || [],
        status: 'open',
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (disputeError) {
      logger.error('Failed to create dispute:', disputeError);
      return NextResponse.json({ error: 'Failed to create dispute' }, { status: 500 });
    }

    // Update rental status
    await supabaseAdmin
      .from('rentals')
      .update({ status: 'disputed' })
      .eq('id', id);

    // Notify other party
    const otherPartyId = isRenter ? agent?.owner_id : rental.renter_id;
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: otherPartyId,
        type: 'dispute_opened',
        title: 'Dispute Opened',
        message: `A dispute has been opened for your rental. Please respond within 24 hours.`,
        data: { rental_id: id, dispute_id: dispute.id },
      });

    // Add system message
    await supabaseAdmin
      .from('rental_messages')
      .insert({
        rental_id: parseInt(id),
        sender_id: user.id,
        sender_type: isRenter ? 'renter' : 'agent',
        content: `⚠️ Dispute opened: ${reason}`,
        message_type: 'system',
      });

    logger.info(`Dispute ${dispute.id} opened for rental ${id} by ${isRenter ? 'renter' : 'owner'}`);

    return NextResponse.json({ dispute });
  } catch (error: any) {
    logger.error('Dispute create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/rentals/[id]/dispute - Get dispute details
export async function GET(
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

    // Get dispute
    const { data: dispute, error } = await supabaseAdmin
      .from('rental_disputes')
      .select('*')
      .eq('rental_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !dispute) {
      return NextResponse.json({ error: 'No dispute found' }, { status: 404 });
    }

    return NextResponse.json({ dispute });
  } catch (error: any) {
    logger.error('Dispute get error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/rentals/[id]/dispute - Respond to dispute
export async function PUT(
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

    const body = await request.json();
    const { response, evidence } = body;

    if (!response) {
      return NextResponse.json({ error: 'Response required' }, { status: 400 });
    }

    // Get dispute
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('rental_disputes')
      .select(`*, rental:rentals(*, agent:agents(id, owner_id))`)
      .eq('rental_id', id)
      .in('status', ['open'])
      .single();

    if (disputeError || !dispute) {
      return NextResponse.json({ error: 'No open dispute found' }, { status: 404 });
    }

    const rental = dispute.rental;
    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;
    const isRenter = rental.renter_id === user.id;
    const isOwner = agent?.owner_id === user.id;

    // Must be the other party
    if (dispute.initiated_by === user.id) {
      return NextResponse.json({ error: 'Cannot respond to your own dispute' }, { status: 403 });
    }

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Update dispute with response
    const { data: updatedDispute, error: updateError } = await supabaseAdmin
      .from('rental_disputes')
      .update({
        respondent_response: response,
        respondent_evidence: evidence || [],
        responded_at: new Date().toISOString(),
        status: 'under_review',
      })
      .eq('id', dispute.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
    }

    // Notify initiator
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: dispute.initiated_by,
        type: 'dispute_response',
        title: 'Dispute Response Received',
        message: 'The other party has responded to your dispute. Under review.',
        data: { rental_id: id, dispute_id: dispute.id },
      });

    logger.info(`Dispute ${dispute.id} response submitted, now under review`);

    return NextResponse.json({ dispute: updatedDispute });
  } catch (error: any) {
    logger.error('Dispute respond error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
