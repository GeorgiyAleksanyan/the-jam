import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// POST /api/rentals/[id]/complete - Complete the rental
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

    // Get rental with agent and profile info
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        *,
        agent:agents(id, name, owner_id),
        renter:profiles!rentals_renter_id_fkey(id, username)
      `)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Only renter can complete
    if (rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Only renter can complete the rental' }, { status: 403 });
    }

    // Must be in completable state
    if (!['active', 'paid'].includes(rental.status)) {
      return NextResponse.json({ 
        error: `Cannot complete rental in "${rental.status}" status` 
      }, { status: 400 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Calculate final amount for hourly rentals
    let finalAmount = rental.agreed_price;
    if (rental.pricing_model === 'hourly' && rental.time_entries) {
      const totalMinutes = (rental.time_entries as any[]).reduce((sum, entry) => {
        return sum + (entry.minutes || 0);
      }, 0);
      const hourlyRate = rental.agreed_price; // stored as hourly rate
      finalAmount = (totalMinutes / 60) * hourlyRate;
    }

    // Update rental status
    const { data: updatedRental, error: updateError } = await supabaseAdmin
      .from('rentals')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        final_amount: finalAmount,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to complete rental:', updateError);
      return NextResponse.json({ error: 'Failed to complete rental' }, { status: 500 });
    }

    // Trigger payout if Stripe payment
    if (rental.payment_method === 'stripe' && rental.stripe_payment_intent_id) {
      await triggerStripePayout(rental, agent, finalAmount);
    }

    // Update agent stats
    await supabaseAdmin.rpc('increment_rental_count', { agent_id: agent?.id });

    // Notify owner
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: agent?.owner_id,
        type: 'rental_completed',
        title: 'Rental Completed! 🎉',
        message: `Your rental with "${rental.renter?.username || 'a user'}" is complete. Payout processing.`,
        data: { rental_id: id, amount: finalAmount },
      });

    // Add system message
    await supabaseAdmin
      .from('rental_messages')
      .insert({
        rental_id: parseInt(id),
        sender_id: user.id,
        sender_type: 'renter',
        content: `🎉 Rental completed! Thank you for using The Jam marketplace.`,
        message_type: 'system',
      });

    logger.info(`Rental ${id} completed. Final amount: $${finalAmount}`);

    return NextResponse.json({ 
      rental: updatedRental,
      message: 'Rental completed successfully',
      review_url: `/rentals/${id}/review`,
    });
  } catch (error: any) {
    logger.error('Complete rental error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function triggerStripePayout(
  rental: any, 
  agent: any, 
  amount: number
) {
  const stripe = getStripe();
  if (!stripe) {
    logger.warn('Stripe not configured, skipping payout');
    return;
  }

  try {
    // Get owner's Stripe Connect account
    const { data: profile } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('stripe_account_id, stripe_payouts_enabled')
      .eq('agent_id', agent.id)
      .single();

    if (!profile?.stripe_account_id || !profile?.stripe_payouts_enabled) {
      logger.warn(`Agent ${agent.id} not set up for Stripe payouts`);
      // Queue for manual payout
      await supabaseAdmin
        .from('pending_payouts')
        .insert({
          rental_id: rental.id,
          agent_id: agent.id,
          owner_id: agent.owner_id,
          amount,
          currency: rental.currency || 'usd',
          status: 'pending_setup',
          notes: 'Stripe Connect not set up',
        });
      return;
    }

    // Calculate platform fee (10%)
    const platformFee = Math.round(amount * 0.10 * 100); // in cents
    const payoutAmount = Math.round(amount * 100) - platformFee;

    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: payoutAmount,
      currency: rental.currency || 'usd',
      destination: profile.stripe_account_id,
      metadata: {
        rental_id: rental.id.toString(),
        agent_id: agent.id.toString(),
      },
    });

    // Record payout
    await supabaseAdmin
      .from('pending_payouts')
      .insert({
        rental_id: rental.id,
        agent_id: agent.id,
        owner_id: agent.owner_id,
        amount,
        currency: rental.currency || 'usd',
        status: 'completed',
        stripe_transfer_id: transfer.id,
        completed_at: new Date().toISOString(),
      });

    logger.info(`Payout of $${payoutAmount / 100} sent to agent ${agent.id}`);
  } catch (error: any) {
    logger.error('Stripe payout failed:', error);
    // Queue for retry
    await supabaseAdmin
      .from('pending_payouts')
      .insert({
        rental_id: rental.id,
        agent_id: agent.id,
        owner_id: agent.owner_id,
        amount,
        currency: rental.currency || 'usd',
        status: 'failed',
        error_message: error.message,
      });
  }
}
