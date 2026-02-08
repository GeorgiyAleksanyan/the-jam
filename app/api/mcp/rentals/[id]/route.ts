import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/mcp/rentals/[id] - Get rental status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Validate API key
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, owner_id')
      .eq('api_key', apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get rental
    const { data: rental, error } = await supabaseAdmin
      .from('rentals')
      .select(`
        *,
        agent:agents(id, name, slug, owner_id),
        renter:profiles!rentals_renter_id_fkey(id, username)
      `)
      .eq('id', id)
      .single();

    if (error || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const rentalAgent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Check access (renter's agent or owner's agent)
    const isRenter = rental.renter_id === agent.owner_id;
    const isOwner = rentalAgent?.owner_id === agent.owner_id;

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({
      rental: {
        id: rental.id,
        status: rental.status,
        agent_name: rentalAgent?.name,
        pricing_model: rental.pricing_model,
        agreed_price: rental.agreed_price,
        task_description: rental.task_description,
        created_at: rental.created_at,
        started_at: rental.started_at,
        completed_at: rental.completed_at,
        total_minutes: rental.total_minutes,
        final_amount: rental.final_amount,
      },
      role: isRenter ? 'renter' : 'owner',
    });
  } catch (error: any) {
    logger.error('MCP rental get error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/mcp/rentals/[id] - Take action on rental
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, name, owner_id')
      .eq('api_key', apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const { action, message, deliverable } = body;

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`*, agent:agents(id, name, owner_id)`)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const rentalAgent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;
    const isRenter = rental.renter_id === agent.owner_id;
    const isOwner = rentalAgent?.owner_id === agent.owner_id;

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    switch (action) {
      case 'send_message':
        if (!message) {
          return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }
        await supabaseAdmin
          .from('rental_messages')
          .insert({
            rental_id: parseInt(id),
            sender_id: agent.owner_id,
            sender_type: isRenter ? 'renter' : 'agent',
            content: `[${agent.name}] ${message}`,
            message_type: 'message',
          });
        return NextResponse.json({ success: true, action: 'message_sent' });

      case 'submit_deliverable':
        if (!isOwner) {
          return NextResponse.json({ error: 'Only owner can submit deliverables' }, { status: 403 });
        }
        if (!deliverable?.title) {
          return NextResponse.json({ error: 'Deliverable title required' }, { status: 400 });
        }
        await supabaseAdmin
          .from('rental_messages')
          .insert({
            rental_id: parseInt(id),
            sender_id: agent.owner_id,
            sender_type: 'agent',
            content: deliverable.description || `Deliverable: ${deliverable.title}`,
            message_type: 'deliverable',
            metadata: {
              title: deliverable.title,
              description: deliverable.description,
              attachments: deliverable.attachments || [],
              status: 'pending',
              submitted_at: new Date().toISOString(),
            },
          });
        return NextResponse.json({ success: true, action: 'deliverable_submitted' });

      case 'approve':
      case 'reject':
        if (!isOwner) {
          return NextResponse.json({ error: 'Only owner can approve/reject' }, { status: 403 });
        }
        if (rental.status !== 'pending') {
          return NextResponse.json({ error: 'Rental not pending' }, { status: 400 });
        }
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        await supabaseAdmin
          .from('rentals')
          .update({ status: newStatus })
          .eq('id', id);
        return NextResponse.json({ success: true, action, new_status: newStatus });

      case 'start':
        if (!isOwner) {
          return NextResponse.json({ error: 'Only owner can start' }, { status: 403 });
        }
        if (!['approved', 'paid'].includes(rental.status)) {
          return NextResponse.json({ error: 'Rental must be approved/paid' }, { status: 400 });
        }
        await supabaseAdmin
          .from('rentals')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', id);
        return NextResponse.json({ success: true, action: 'started' });

      case 'complete':
        if (!isRenter) {
          return NextResponse.json({ error: 'Only renter can complete' }, { status: 403 });
        }
        await supabaseAdmin
          .from('rentals')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            final_amount: rental.agreed_price,
          })
          .eq('id', id);
        return NextResponse.json({ success: true, action: 'completed' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    logger.error('MCP rental action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
