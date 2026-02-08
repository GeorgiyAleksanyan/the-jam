import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/agents/[slug]/rental - Get rental profile for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Get agent by slug
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get rental profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      logger.error('Failed to fetch rental profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch rental profile' }, { status: 500 });
    }

    return NextResponse.json({
      profile: profile || null,
      agent_id: agent.id,
      owner_id: agent.owner_id,
    });
  } catch (error: any) {
    logger.error('Error in rental profile GET:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/agents/[slug]/rental - Create or update rental profile
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const supabase = await createServerClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent by slug and verify ownership
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this agent' }, { status: 403 });
    }

    const body = await request.json();

    // Validate pricing based on model
    const pricingModel = body.pricing_model;
    if (pricingModel === 'hourly' && !body.hourly_rate) {
      return NextResponse.json({ error: 'Hourly rate required for hourly pricing' }, { status: 400 });
    }
    if (pricingModel === 'subscription' && !body.monthly_rate) {
      return NextResponse.json({ error: 'Monthly rate required for subscription pricing' }, { status: 400 });
    }
    if (pricingModel === 'token' && !body.token_rate) {
      return NextResponse.json({ error: 'Token rate required for token-based pricing' }, { status: 400 });
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('id')
      .eq('agent_id', agent.id)
      .single();

    const profileData = {
      agent_id: agent.id,
      is_available: body.is_available ?? false,
      pricing_model: body.pricing_model,
      hourly_rate: body.hourly_rate,
      task_rate_min: body.task_rate_min,
      task_rate_max: body.task_rate_max,
      monthly_rate: body.monthly_rate,
      token_rate: body.token_rate,
      accepts_crypto: body.accepts_crypto ?? true,
      accepts_fiat: body.accepts_fiat ?? false,
      tagline: body.tagline?.slice(0, 140),
      skills: body.skills || [],
      response_time: body.response_time,
      requires_approval: body.requires_approval ?? true,
      cancellation_policy: body.cancellation_policy || 'moderate',
      max_concurrent_rentals: body.max_concurrent_rentals || 1,
    };

    let result;

    if (existingProfile) {
      // Update
      const { data, error } = await supabaseAdmin
        .from('agent_rental_profiles')
        .update(profileData)
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update rental profile:', error);
        return NextResponse.json({ error: 'Failed to update rental profile' }, { status: 500 });
      }
      result = data;
    } else {
      // Insert
      const { data, error } = await supabaseAdmin
        .from('agent_rental_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create rental profile:', error);
        return NextResponse.json({ error: 'Failed to create rental profile' }, { status: 500 });
      }
      result = data;
    }

    logger.info(`Rental profile ${existingProfile ? 'updated' : 'created'} for agent ${slug}`);

    return NextResponse.json({ profile: result });
  } catch (error: any) {
    logger.error('Error in rental profile PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
