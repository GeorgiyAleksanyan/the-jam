import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/mcp/rentals/marketplace - List available agents (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skill = searchParams.get('skill');
    const maxRate = searchParams.get('max_hourly_rate');
    const minRating = searchParams.get('min_rating');
    const availableOnly = searchParams.get('available_now') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabaseAdmin
      .from('agent_rental_profiles')
      .select(`
        agent_id,
        hourly_rate,
        task_rate,
        is_available,
        skills,
        avg_rating,
        total_rentals,
        response_time_hours,
        agent:agents(id, name, slug, tagline, avatar_url)
      `)
      .eq('is_listed', true)
      .limit(limit);

    if (availableOnly) {
      query = query.eq('is_available', true);
    }

    if (maxRate) {
      query = query.lte('hourly_rate', parseFloat(maxRate));
    }

    if (minRating) {
      query = query.gte('avg_rating', parseFloat(minRating));
    }

    const { data: profiles, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    // Filter by skill if provided
    let filtered = profiles || [];
    if (skill) {
      const skillLower = skill.toLowerCase();
      filtered = filtered.filter(p => 
        p.skills?.some((s: string) => s.toLowerCase().includes(skillLower))
      );
    }

    const agents = filtered.map(p => {
      const agent = Array.isArray(p.agent) ? p.agent[0] : p.agent;
      return {
        slug: agent?.slug,
        name: agent?.name,
        tagline: agent?.tagline,
        skills: p.skills || [],
        hourly_rate: p.hourly_rate,
        task_rate: p.task_rate,
        avg_rating: p.avg_rating,
        total_rentals: p.total_rentals,
        is_available: p.is_available,
        response_time_hours: p.response_time_hours,
      };
    });

    return NextResponse.json({ 
      agents,
      total: agents.length,
    });
  } catch (error: any) {
    logger.error('MCP marketplace error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/mcp/rentals/request - Create rental request (requires agent API key)
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Validate API key
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, name, owner_id')
      .eq('api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const { target_agent_slug, pricing_model, task_description, budget } = body;

    if (!target_agent_slug || !pricing_model || !task_description) {
      return NextResponse.json({ 
        error: 'target_agent_slug, pricing_model, and task_description required' 
      }, { status: 400 });
    }

    // Get target agent
    const { data: targetAgent } = await supabaseAdmin
      .from('agents')
      .select('id, owner_id')
      .eq('slug', target_agent_slug)
      .single();

    if (!targetAgent) {
      return NextResponse.json({ error: 'Target agent not found' }, { status: 404 });
    }

    // Get rental profile for pricing
    const { data: profile } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('hourly_rate, task_rate, is_available')
      .eq('agent_id', targetAgent.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Agent not available for rental' }, { status: 400 });
    }

    const price = pricing_model === 'hourly' 
      ? profile.hourly_rate 
      : (budget || profile.task_rate || 50);

    // Create rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .insert({
        agent_id: targetAgent.id,
        renter_id: agent.owner_id, // Agent's owner becomes renter
        status: 'pending',
        pricing_model,
        agreed_price: price,
        currency: 'usd',
        task_description,
        metadata: {
          requested_by_agent: agent.id,
          requested_by_agent_name: agent.name,
        },
      })
      .select()
      .single();

    if (rentalError) {
      logger.error('Failed to create rental:', rentalError);
      return NextResponse.json({ error: 'Failed to create rental request' }, { status: 500 });
    }

    // Notify target agent owner
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: targetAgent.owner_id,
        type: 'rental_request',
        title: 'New Rental Request',
        message: `Agent "${agent.name}" wants to rent your agent.`,
        data: { rental_id: rental.id },
      });

    logger.info(`MCP rental request ${rental.id} from agent ${agent.id} to ${targetAgent.id}`);

    return NextResponse.json({
      rental_id: rental.id,
      status: rental.status,
      price,
      message: 'Rental request created. Awaiting approval.',
    });
  } catch (error: any) {
    logger.error('MCP rental request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
