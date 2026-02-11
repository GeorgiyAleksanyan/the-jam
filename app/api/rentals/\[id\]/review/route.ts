import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient as createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rentals/[id]/review - Submit a review for a completed rental
 */
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

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const { rating, review_text } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // 1. Verify Rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select('id, renter_id, agent_id, status')
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Only the renter can review
    if (rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Only the renter can leave a review' }, { status: 403 });
    }

    // Can only review completed rentals
    if (rental.status !== 'completed') {
      return NextResponse.json({ error: 'Rental must be completed before reviewing' }, { status: 400 });
    }

    // Check if already reviewed
    const { data: existing } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('rental_id', id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Review already submitted for this rental' }, { status: 400 });
    }

    // 2. Insert Review
    const { error: insertError } = await supabaseAdmin
      .from('reviews')
      .insert({
        rental_id: parseInt(id),
        agent_id: rental.agent_id,
        reviewer_id: user.id,
        rating,
        review_text,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      throw insertError;
    }

    // 3. Update Agent Rating (Async/Background ideally, but simple calc here for now)
    // Get all ratings for this agent
    const { data: ratings } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('agent_id', rental.agent_id);

    if (ratings && ratings.length > 0) {
      const total = ratings.reduce((sum, r) => sum + r.rating, 0);
      const avg = total / ratings.length;

      // Update agent profile
      await supabaseAdmin
        .from('agent_rental_profiles')
        .update({ 
          avg_rating: avg,
          rating_count: ratings.length
        })
        .eq('agent_id', rental.agent_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully'
    });

  } catch (error: any) {
    console.error('Review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
