import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rentals/[id]/messages - Send a message in a rental
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
    const { content, message_type = 'text' } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    // Get rental and verify access
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        id, renter_id, status,
        agent:agents(id, owner_id, name)
      `)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Extract agent (Supabase may return array for joins)
    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;
    const isRenter = rental.renter_id === user.id;
    const isOwner = agent?.owner_id === user.id;

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Create message
    const { data: message, error: msgError } = await supabaseAdmin
      .from('rental_messages')
      .insert({
        rental_id: parseInt(id),
        sender_id: user.id,
        sender_type: isOwner ? 'agent' : 'renter',
        content: content.trim(),
        message_type,
      })
      .select()
      .single();

    if (msgError) {
      logger.error('Failed to send message:', msgError);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    // Notify the other party
    const notifyUserId = isOwner ? rental.renter_id : agent?.owner_id;
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: notifyUserId,
        type: 'rental_message',
        title: 'New Message',
        message: `New message in rental for "${agent?.name}"`,
        data: { rental_id: id },
      });

    return NextResponse.json({ message });
  } catch (error: any) {
    logger.error('Message send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/rentals/[id]/messages - Get messages for a rental
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

    // Get rental and verify access
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        id, renter_id,
        agent:agents(owner_id)
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

    const { data: messages, error } = await supabaseAdmin
      .from('rental_messages')
      .select('*')
      .eq('rental_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch messages:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Mark messages as read
    await supabaseAdmin
      .from('rental_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('rental_id', id)
      .neq('sender_id', user.id)
      .is('read_at', null);

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    logger.error('Messages fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
