import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// POST /api/agents/[slug]/rental/stripe-connect - Start Stripe Connect onboarding
export async function POST(
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
      .select('id, owner_id, name')
      .eq('slug', slug)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    if (agent.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get or create rental profile
    let { data: profile } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('id, stripe_account_id')
      .eq('agent_id', agent.id)
      .single();

    if (!profile) {
      // Create profile first
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('agent_rental_profiles')
        .insert({ agent_id: agent.id })
        .select('id, stripe_account_id')
        .single();

      if (createError) {
        logger.error('Failed to create rental profile for Stripe:', createError);
        return NextResponse.json({ error: 'Failed to create rental profile' }, { status: 500 });
      }
      profile = newProfile;
    }

    let stripeAccountId = profile.stripe_account_id;

    // Create Stripe Connect account if doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          agent_id: agent.id.toString(),
          agent_slug: slug,
          user_id: user.id,
        },
      });

      stripeAccountId = account.id;

      // Save to profile
      await supabaseAdmin
        .from('agent_rental_profiles')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', profile.id);

      logger.info(`Created Stripe Connect account ${stripeAccountId} for agent ${slug}`);
    }

    // Create account link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://the-jam.webglo.org';
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/agents/${slug}/edit?tab=rental&stripe=refresh`,
      return_url: `${baseUrl}/agents/${slug}/edit?tab=rental&stripe=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    logger.error('Stripe Connect error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/agents/[slug]/rental/stripe-connect - Check Stripe Connect status
export async function GET(
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

    // Get agent and rental profile
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (!agent || agent.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { data: profile } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('agent_id', agent.id)
      .single();

    if (!profile?.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        onboarding_complete: false,
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const isComplete = account.charges_enabled && account.payouts_enabled;

    // Update database if status changed
    if (isComplete !== profile.stripe_onboarding_complete) {
      await supabaseAdmin
        .from('agent_rental_profiles')
        .update({ stripe_onboarding_complete: isComplete })
        .eq('agent_id', agent.id);
    }

    return NextResponse.json({
      connected: true,
      onboarding_complete: isComplete,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    });
  } catch (error: any) {
    logger.error('Stripe Connect status check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
