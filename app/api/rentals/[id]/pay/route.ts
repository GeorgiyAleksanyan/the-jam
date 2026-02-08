import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27.acacia' as any,
  });
}

// POST /api/rentals/[id]/pay - Create payment session for a rental
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
    const { payment_type = 'card' } = body; // 'card' or 'crypto'

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        *,
        agent:agents(id, name, slug, owner_id)
      `)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Only renter can pay
    if (rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Only renter can pay' }, { status: 403 });
    }

    // Must be approved to pay
    if (rental.status !== 'approved') {
      return NextResponse.json({ error: 'Rental must be approved before payment' }, { status: 400 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Get agent owner's Stripe account for Connect
    const { data: rentalProfile } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('agent_id', rental.agent_id)
      .single();

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://the-jam.webglo.org';

    // Calculate platform fee (10%)
    const platformFeePercent = 10;
    const totalAmount = Math.round(rental.agreed_price * 100); // cents
    const platformFee = Math.round(totalAmount * platformFeePercent / 100);

    if (payment_type === 'crypto') {
      // Stripe Crypto Onramp - creates a session for USDC payment
      // Note: Crypto Onramp requires separate Stripe approval
      // For now, we'll create a standard checkout with crypto note
      
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Rental: ${agent?.name}`,
                description: rental.task_description?.slice(0, 200) || 'Agent rental service',
              },
              unit_amount: totalAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          rental_id: id,
          agent_id: rental.agent_id.toString(),
          renter_id: user.id,
          payment_type: 'crypto',
        },
        success_url: `${baseUrl}/rentals/${id}?payment=success`,
        cancel_url: `${baseUrl}/rentals/${id}?payment=cancelled`,
        // If agent has Stripe Connect, use destination charges
        ...(rentalProfile?.stripe_account_id && rentalProfile.stripe_onboarding_complete && {
          payment_intent_data: {
            application_fee_amount: platformFee,
            transfer_data: {
              destination: rentalProfile.stripe_account_id,
            },
          },
        }),
      });

      return NextResponse.json({ 
        url: session.url,
        session_id: session.id,
        payment_type: 'crypto'
      });
    }

    // Standard card payment
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Rental: ${agent?.name}`,
              description: rental.task_description?.slice(0, 200) || 'Agent rental service',
            },
            unit_amount: totalAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        rental_id: id,
        agent_id: rental.agent_id.toString(),
        renter_id: user.id,
        payment_type: 'card',
      },
      success_url: `${baseUrl}/rentals/${id}?payment=success`,
      cancel_url: `${baseUrl}/rentals/${id}?payment=cancelled`,
      // If agent has Stripe Connect, use destination charges
      ...(rentalProfile?.stripe_account_id && rentalProfile.stripe_onboarding_complete && {
        payment_intent_data: {
          application_fee_amount: platformFee,
          transfer_data: {
            destination: rentalProfile.stripe_account_id,
          },
        },
      }),
    });

    logger.info(`Payment session created for rental ${id}: ${session.id}`);

    return NextResponse.json({ 
      url: session.url,
      session_id: session.id,
      payment_type: 'card'
    });
  } catch (error: any) {
    logger.error('Payment session error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
