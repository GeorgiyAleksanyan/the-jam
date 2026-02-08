import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

// POST /api/stripe/webhook - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        logger.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      // In development, parse without verification
      event = JSON.parse(body) as Stripe.Event;
      logger.warn('Webhook signature not verified (no STRIPE_WEBHOOK_SECRET)');
    }

    logger.info(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.info(`Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logger.warn(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdate(account);
        break;
      }

      default:
        logger.debug(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error('Stripe webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const rentalId = session.metadata?.rental_id;
  
  if (!rentalId) {
    logger.warn('Checkout session without rental_id metadata');
    return;
  }

  // Update rental status to paid
  const { data: rental, error } = await supabaseAdmin
    .from('rentals')
    .update({
      status: 'paid',
      stripe_payment_intent_id: session.payment_intent as string,
      stripe_session_id: session.id,
      paid_at: new Date().toISOString(),
    })
    .eq('id', rentalId)
    .select()
    .single();

  if (error) {
    logger.error(`Failed to update rental ${rentalId} after payment:`, error);
    return;
  }

  // Get agent info for notification
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('name, owner_id')
    .eq('id', rental.agent_id)
    .single();

  // Notify agent owner
  if (agent) {
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: agent.owner_id,
        type: 'rental_paid',
        title: 'Payment Received',
        message: `Payment received for rental of "${agent.name}". You can now start work.`,
        data: { rental_id: rentalId },
      });
  }

  // Notify renter
  await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: rental.renter_id,
      type: 'rental_paid',
      title: 'Payment Successful',
      message: `Your payment for "${agent?.name}" was successful. The agent owner can now start work.`,
      data: { rental_id: rentalId },
    });

  logger.info(`Rental ${rentalId} marked as paid`);
}

async function handleAccountUpdate(account: Stripe.Account) {
  // Update onboarding status in our database
  const agentId = account.metadata?.agent_id;
  
  if (!agentId) {
    // Try to find by Stripe account ID
    const { data: profile } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('agent_id')
      .eq('stripe_account_id', account.id)
      .single();
    
    if (!profile) return;

    const isComplete = account.charges_enabled && account.payouts_enabled;
    
    await supabaseAdmin
      .from('agent_rental_profiles')
      .update({ stripe_onboarding_complete: isComplete })
      .eq('stripe_account_id', account.id);

    logger.info(`Stripe account ${account.id} onboarding status: ${isComplete}`);
  }
}
