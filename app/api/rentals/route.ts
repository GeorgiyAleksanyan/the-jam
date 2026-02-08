import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rentals - Create a new rental request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, pricing_model, task_description, estimated_hours, payment_method } = body;

    if (!agent_id || !pricing_model) {
      return NextResponse.json({ error: 'agent_id and pricing_model required' }, { status: 400 });
    }

    // Get agent and rental profile
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, name, slug, owner_id')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Can't rent your own agent
    if (agent.owner_id === user.id) {
      return NextResponse.json({ error: 'Cannot rent your own agent' }, { status: 400 });
    }

    const { data: rentalProfile, error: profileError } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('*')
      .eq('agent_id', agent_id)
      .single();

    if (profileError || !rentalProfile) {
      return NextResponse.json({ error: 'Agent not available for rental' }, { status: 400 });
    }

    if (!rentalProfile.is_available) {
      return NextResponse.json({ error: 'Agent is not currently available' }, { status: 400 });
    }

    // Check concurrent rental limit
    if (rentalProfile.current_rentals >= (rentalProfile.max_concurrent_rentals || 1)) {
      return NextResponse.json({ error: 'Agent has reached maximum concurrent rentals' }, { status: 400 });
    }

    // Calculate price based on pricing model
    let agreedPrice = 0;
    if (pricing_model === 'hourly' && estimated_hours) {
      agreedPrice = (rentalProfile.hourly_rate || 0) * estimated_hours;
    } else if (pricing_model === 'task') {
      agreedPrice = rentalProfile.task_rate_min || 0;
    } else if (pricing_model === 'subscription') {
      agreedPrice = rentalProfile.monthly_rate || 0;
    }

    // Determine initial status based on approval requirement
    const initialStatus = rentalProfile.requires_approval ? 'pending' : 'approved';

    // Create rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .insert({
        agent_id,
        renter_id: user.id,
        status: initialStatus,
        pricing_model,
        agreed_price: agreedPrice,
        currency: rentalProfile.currency || 'USD',
        payment_method: payment_method || 'crypto',
        task_description,
        estimated_hours,
      })
      .select()
      .single();

    if (rentalError) {
      logger.error('Failed to create rental:', rentalError);
      return NextResponse.json({ error: 'Failed to create rental request' }, { status: 500 });
    }

    // Update current_rentals count if auto-approved
    if (initialStatus === 'approved') {
      await supabaseAdmin
        .from('agent_rental_profiles')
        .update({ current_rentals: rentalProfile.current_rentals + 1 })
        .eq('agent_id', agent_id);
    }

    // Create notification for agent owner
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: agent.owner_id,
        type: 'rental_request',
        title: 'New Rental Request',
        message: `Someone wants to rent your agent "${agent.name}"`,
        data: { rental_id: rental.id, agent_slug: agent.slug },
      });

    logger.info(`Rental request created: ${rental.id} for agent ${agent.slug}`);

    return NextResponse.json({ rental, requires_approval: rentalProfile.requires_approval });
  } catch (error: any) {
    logger.error('Rental creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/rentals - List rentals for current user (as renter or owner)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'renter'; // 'renter' or 'owner'
    const status = searchParams.get('status');

    let query;

    if (role === 'owner') {
      // Get agents owned by user, then their rentals
      const { data: agents } = await supabaseAdmin
        .from('agents')
        .select('id')
        .eq('owner_id', user.id);

      const agentIds = (agents || []).map((a: any) => a.id);

      if (agentIds.length === 0) {
        return NextResponse.json({ rentals: [] });
      }

      query = supabaseAdmin
        .from('rentals')
        .select(`
          *,
          agent:agents(id, name, slug, avatar_url),
          renter:profiles!renter_id(id, username, avatar_url)
        `)
        .in('agent_id', agentIds);
    } else {
      // Rentals where user is the renter
      query = supabaseAdmin
        .from('rentals')
        .select(`
          *,
          agent:agents(id, name, slug, avatar_url, owner_id)
        `)
        .eq('renter_id', user.id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: rentals, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch rentals:', error);
      return NextResponse.json({ error: 'Failed to fetch rentals' }, { status: 500 });
    }

    return NextResponse.json({ rentals: rentals || [] });
  } catch (error: any) {
    logger.error('Rentals list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
