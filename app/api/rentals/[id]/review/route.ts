import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rentals/[id]/review - Submit a review for a completed rental
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
    const {
      overall_rating,
      review_text,
      communication_rating,
      quality_rating,
      timeliness_rating,
    } = body;

    if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        *,
        agent:agents(id, owner_id, name)
      `)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Must be completed to review
    if (rental.status !== 'completed') {
      return NextResponse.json({ error: 'Can only review completed rentals' }, { status: 400 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;
    const isRenter = rental.renter_id === user.id;
    const isOwner = agent?.owner_id === user.id;

    if (!isRenter && !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Check if already reviewed
    const { data: existingReview } = await supabaseAdmin
      .from('rental_reviews')
      .select('id')
      .eq('rental_id', id)
      .eq('reviewer_id', user.id)
      .single();

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this rental' }, { status: 400 });
    }

    // Determine reviewee type
    const revieweeType = isRenter ? 'agent' : 'renter';

    // Create review
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('rental_reviews')
      .insert({
        rental_id: parseInt(id),
        reviewer_id: user.id,
        reviewee_type: revieweeType,
        overall_rating,
        communication_rating,
        quality_rating,
        timeliness_rating,
        review_text: review_text?.trim() || null,
      })
      .select()
      .single();

    if (reviewError) {
      logger.error('Failed to create review:', reviewError);
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }

    // Update agent rental profile stats if reviewing agent
    if (revieweeType === 'agent') {
      // Get current stats
      const { data: profile } = await supabaseAdmin
        .from('agent_rental_profiles')
        .select('avg_rating, rating_count')
        .eq('agent_id', rental.agent_id)
        .single();

      if (profile) {
        const currentCount = profile.rating_count || 0;
        const currentAvg = profile.avg_rating || 0;
        const newCount = currentCount + 1;
        const newAvg = ((currentAvg * currentCount) + overall_rating) / newCount;

        await supabaseAdmin
          .from('agent_rental_profiles')
          .update({
            avg_rating: Math.round(newAvg * 10) / 10, // Round to 1 decimal
            rating_count: newCount,
          })
          .eq('agent_id', rental.agent_id);
      }
    }

    // Notify the reviewee
    const notifyUserId = isRenter ? agent?.owner_id : rental.renter_id;
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: notifyUserId,
        type: 'review_received',
        title: 'New Review',
        message: `You received a ${overall_rating}-star review for "${agent?.name}"`,
        data: { rental_id: id, review_id: review.id },
      });

    logger.info(`Review submitted for rental ${id} by ${user.id}`);

    return NextResponse.json({ review });
  } catch (error: any) {
    logger.error('Review submit error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/rentals/[id]/review - Get reviews for a rental
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: reviews, error } = await supabaseAdmin
      .from('rental_reviews')
      .select('*')
      .eq('rental_id', id)
      .eq('is_hidden', false);

    if (error) {
      logger.error('Failed to fetch reviews:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json({ reviews: reviews || [] });
  } catch (error: any) {
    logger.error('Reviews fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
