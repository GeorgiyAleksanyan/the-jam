import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/rentals/[id] - Get rental details
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

    const { data: rental, error } = await supabaseAdmin
      .from('rentals')
      .select(`
        *,
        agent:agents(id, name, slug, avatar_url, owner_id),
        renter:profiles!renter_id(id, username, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Extract agent (Supabase may return array for joins)
    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Check authorization - must be renter or agent owner
    const isRenter = rental.renter_id === user.id;
    const isOwner = agent?.owner_id === user.id;

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get messages for this rental
    const { data: messages } = await supabaseAdmin
      .from('rental_messages')
      .select('*')
      .eq('rental_id', id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ 
      rental: { ...rental, agent }, 
      messages: messages || [],
      role: isOwner ? 'owner' : 'renter'
    });
  } catch (error: any) {
    logger.error('Rental detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/rentals/[id] - Update rental status (approve/reject/complete/cancel)
export async function PATCH(
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
    const { action } = body; // 'approve', 'reject', 'start', 'complete', 'cancel', 'dispute'

    // Get rental with agent info
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        *,
        agent:agents(id, name, slug, owner_id)
      `)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Extract agent
    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    const isRenter = rental.renter_id === user.id;
    const isOwner = agent?.owner_id === user.id;

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    let newStatus = rental.status;
    const updateData: Record<string, unknown> = {};

    switch (action) {
      case 'approve':
        if (!isOwner) {
          return NextResponse.json({ error: 'Only agent owner can approve' }, { status: 403 });
        }
        if (rental.status !== 'pending') {
          return NextResponse.json({ error: 'Can only approve pending rentals' }, { status: 400 });
        }
        newStatus = 'approved';
        
        // Increment current_rentals
        const { data: approveProfile } = await supabaseAdmin
          .from('agent_rental_profiles')
          .select('current_rentals')
          .eq('agent_id', rental.agent_id)
          .single();
        
        if (approveProfile) {
          await supabaseAdmin
            .from('agent_rental_profiles')
            .update({ current_rentals: (approveProfile.current_rentals || 0) + 1 })
            .eq('agent_id', rental.agent_id);
        }
        break;

      case 'reject':
        if (!isOwner) {
          return NextResponse.json({ error: 'Only agent owner can reject' }, { status: 403 });
        }
        if (rental.status !== 'pending') {
          return NextResponse.json({ error: 'Can only reject pending rentals' }, { status: 400 });
        }
        newStatus = 'rejected';
        break;

      case 'start':
        if (rental.status !== 'approved' && rental.status !== 'paid') {
          return NextResponse.json({ error: 'Rental must be approved/paid to start' }, { status: 400 });
        }
        newStatus = 'active';
        updateData.started_at = new Date().toISOString();
        break;

      case 'complete':
        if (!isOwner) {
          return NextResponse.json({ error: 'Only agent owner can mark complete' }, { status: 403 });
        }
        if (rental.status !== 'active') {
          return NextResponse.json({ error: 'Can only complete active rentals' }, { status: 400 });
        }
        newStatus = 'completed';
        updateData.completed_at = new Date().toISOString();
        
        // Decrement current_rentals
        const { data: completeProfile } = await supabaseAdmin
          .from('agent_rental_profiles')
          .select('current_rentals')
          .eq('agent_id', rental.agent_id)
          .single();
        
        if (completeProfile && completeProfile.current_rentals > 0) {
          await supabaseAdmin
            .from('agent_rental_profiles')
            .update({ current_rentals: completeProfile.current_rentals - 1 })
            .eq('agent_id', rental.agent_id);
        }
        break;

      case 'cancel':
        if (!['pending', 'approved', 'paid'].includes(rental.status)) {
          return NextResponse.json({ error: 'Cannot cancel rental in current status' }, { status: 400 });
        }
        newStatus = 'cancelled';
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_reason = body.reason || 'Cancelled by user';
        break;

      case 'dispute':
        if (rental.status !== 'active' && rental.status !== 'completed') {
          return NextResponse.json({ error: 'Can only dispute active or completed rentals' }, { status: 400 });
        }
        newStatus = 'disputed';
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update rental
    updateData.status = newStatus;
    const { data: updatedRental, error: updateError } = await supabaseAdmin
      .from('rentals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update rental:', updateError);
      return NextResponse.json({ error: 'Failed to update rental' }, { status: 500 });
    }

    // Create notification
    const notifyUserId = isOwner ? rental.renter_id : agent?.owner_id;
    const notifyMessages: Record<string, string> = {
      approve: `Your rental request for "${agent?.name}" was approved!`,
      reject: `Your rental request for "${agent?.name}" was rejected.`,
      start: `Rental for "${agent?.name}" has started.`,
      complete: `Rental for "${agent?.name}" has been completed.`,
      cancel: `Rental for "${agent?.name}" was cancelled.`,
      dispute: `A dispute was opened for rental of "${agent?.name}".`,
    };

    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: notifyUserId,
        type: `rental_${action}`,
        title: `Rental ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        message: notifyMessages[action],
        data: { rental_id: id },
      });

    logger.info(`Rental ${id} updated: ${rental.status} -> ${newStatus}`);

    return NextResponse.json({ rental: updatedRental });
  } catch (error: any) {
    logger.error('Rental update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
