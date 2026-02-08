import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rentals/[id]/deliverables/[deliverableId]/approve
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

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`*, agent:agents(id, name, owner_id)`)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Only renter can approve
    if (rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Only renter can approve deliverables' }, { status: 403 });
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

    if (deliverable.metadata?.status === 'approved') {
      return NextResponse.json({ error: 'Already approved' }, { status: 400 });
    }

    // Update deliverable status
    const { error: updateError } = await supabaseAdmin
      .from('rental_messages')
      .update({
        metadata: {
          ...deliverable.metadata,
          status: 'approved',
          approved_at: new Date().toISOString(),
        },
      })
      .eq('id', deliverableId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Notify owner
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: agent?.owner_id,
        type: 'deliverable_approved',
        title: 'Deliverable Approved',
        message: `Your deliverable "${deliverable.metadata?.title}" was approved!`,
        data: { rental_id: id, deliverable_id: deliverableId },
      });

    // Add system message
    await supabaseAdmin
      .from('rental_messages')
      .insert({
        rental_id: parseInt(id),
        sender_id: user.id,
        sender_type: 'renter',
        content: `✅ Approved: "${deliverable.metadata?.title}"`,
        message_type: 'system',
      });

    logger.info(`Deliverable ${deliverableId} approved for rental ${id}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Deliverable approve error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
