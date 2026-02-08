import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rentals/[id]/deliverables - Submit a deliverable
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
    const { title, description, attachments } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 });
    }

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`*, agent:agents(id, owner_id)`)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Only owner can submit deliverables
    if (agent?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only agent owner can submit deliverables' }, { status: 403 });
    }

    // Must be active or paid
    if (!['active', 'paid'].includes(rental.status)) {
      return NextResponse.json({ error: 'Rental must be active to submit deliverables' }, { status: 400 });
    }

    // Create deliverable message
    const { data: message, error: msgError } = await supabaseAdmin
      .from('rental_messages')
      .insert({
        rental_id: parseInt(id),
        sender_id: user.id,
        sender_type: 'agent',
        content: description || `Deliverable: ${title}`,
        message_type: 'deliverable',
        metadata: {
          title,
          description,
          attachments: attachments || [],
          status: 'pending', // pending, approved, rejected
          submitted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (msgError) {
      logger.error('Failed to create deliverable:', msgError);
      return NextResponse.json({ error: 'Failed to submit deliverable' }, { status: 500 });
    }

    // Notify renter
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: rental.renter_id,
        type: 'deliverable_submitted',
        title: 'New Deliverable',
        message: `"${title}" has been submitted for your review.`,
        data: { rental_id: id, message_id: message.id },
      });

    logger.info(`Deliverable submitted for rental ${id}: ${title}`);

    return NextResponse.json({ deliverable: message });
  } catch (error: any) {
    logger.error('Deliverable submit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/rentals/[id]/deliverables - List deliverables
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

    // Get deliverable messages
    const { data: deliverables, error } = await supabaseAdmin
      .from('rental_messages')
      .select('*')
      .eq('rental_id', id)
      .eq('message_type', 'deliverable')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch deliverables' }, { status: 500 });
    }

    return NextResponse.json({ deliverables });
  } catch (error: any) {
    logger.error('Deliverable list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
