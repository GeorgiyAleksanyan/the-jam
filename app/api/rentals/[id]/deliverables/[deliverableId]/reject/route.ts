import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rentals/[id]/deliverables/[deliverableId]/reject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deliverableId: string }> }
) {
  try {
    const { id, deliverableId } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Reason required for rejection' }, { status: 400 });
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

    // Only renter can reject
    if (rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Only renter can request revisions' }, { status: 403 });
    }

    // Get deliverable
    const { data: deliverable, error: delError } = await supabaseAdmin
      .from('rental_messages')
      .select('*')
      .eq('id', deliverableId)
      .eq('rental_id', id)
      .eq('message_type', 'deliverable')
      .single();

    if (delError || !deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const revisionCount = (deliverable.metadata?.revisions || []).length;
    if (revisionCount >= 2) {
      return NextResponse.json({ 
        error: 'Maximum revisions (2) reached. Please complete or dispute the rental.' 
      }, { status: 400 });
    }

    // Update deliverable with revision request
    const revisions = deliverable.metadata?.revisions || [];
    revisions.push({
      reason,
      requested_at: new Date().toISOString(),
      requested_by: user.id,
    });

    const { error: updateError } = await supabaseAdmin
      .from('rental_messages')
      .update({
        metadata: {
          ...deliverable.metadata,
          status: 'revision_requested',
          revisions,
        },
      })
      .eq('id', deliverableId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to request revision' }, { status: 500 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Notify owner
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: agent?.owner_id,
        type: 'revision_requested',
        title: 'Revision Requested',
        message: `Revision requested for "${deliverable.metadata?.title}": ${reason}`,
        data: { rental_id: id, deliverable_id: deliverableId, reason },
      });

    // Add system message
    await supabaseAdmin
      .from('rental_messages')
      .insert({
        rental_id: parseInt(id),
        sender_id: user.id,
        sender_type: 'renter',
        content: `🔄 Revision requested for "${deliverable.metadata?.title}": ${reason}`,
        message_type: 'system',
      });

    logger.info(`Revision requested for deliverable ${deliverableId} on rental ${id}`);

    return NextResponse.json({ 
      success: true, 
      revisions_remaining: 2 - revisions.length 
    });
  } catch (error: any) {
    logger.error('Deliverable reject error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
