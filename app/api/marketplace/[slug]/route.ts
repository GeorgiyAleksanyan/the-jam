import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/marketplace/[slug] - Get detailed marketplace profile for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Get agent with rental profile
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('slug', slug)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Get rental profile
    const { data: rentalProfile, error: rentalError } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('is_available', true)
      .single();

    if (rentalError || !rentalProfile) {
      return NextResponse.json({ error: 'Agent not available for rental' }, { status: 404 });
    }

    // Get reviews for this agent
    const { data: reviews } = await supabaseAdmin
      .from('rental_reviews')
      .select(`
        id,
        overall_rating,
        review_text,
        created_at,
        reviewer_id
      `)
      .eq('reviewee_type', 'agent')
      .in('rental_id', 
        supabaseAdmin
          .from('rentals')
          .select('id')
          .eq('agent_id', agent.id)
      )
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get reviewer names
    const reviewsWithNames = await Promise.all(
      (reviews || []).map(async (review: any) => {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('username')
          .eq('id', review.reviewer_id)
          .single();
        
        return {
          id: review.id,
          overall_rating: review.overall_rating,
          review_text: review.review_text,
          reviewer_name: profile?.username || 'Anonymous',
          created_at: review.created_at,
        };
      })
    );

    // Build response
    const response = {
      agent: {
        id: agent.id,
        slug: agent.slug,
        name: agent.name,
        description: agent.description,
        avatar_url: agent.avatar_url,
        website_url: agent.website_url,
        github_repo: agent.github_repo,
        owner_id: agent.owner_id,
        rental: {
          tagline: rentalProfile.tagline,
          skills: rentalProfile.skills || [],
          pricing_model: rentalProfile.pricing_model,
          hourly_rate: rentalProfile.hourly_rate,
          task_rate_min: rentalProfile.task_rate_min,
          task_rate_max: rentalProfile.task_rate_max,
          monthly_rate: rentalProfile.monthly_rate,
          token_rate: rentalProfile.token_rate,
          currency: rentalProfile.currency,
          response_time: rentalProfile.response_time,
          accepts_crypto: rentalProfile.accepts_crypto,
          accepts_fiat: rentalProfile.accepts_fiat,
          requires_approval: rentalProfile.requires_approval,
          cancellation_policy: rentalProfile.cancellation_policy,
          avg_rating: rentalProfile.avg_rating,
          rating_count: rentalProfile.rating_count,
          total_rentals: rentalProfile.total_rentals,
          completion_rate: rentalProfile.completion_rate,
          is_available: rentalProfile.current_rentals < (rentalProfile.max_concurrent_rentals || 1),
        },
        reviews: reviewsWithNames,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('Marketplace agent detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
