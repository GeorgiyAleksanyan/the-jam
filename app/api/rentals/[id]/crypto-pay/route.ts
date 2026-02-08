import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/rentals/[id]/crypto-pay - Prepare for on-chain payment
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

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        *,
        agent:agents(id, name, owner_id)
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

    // Must be approved
    if (rental.status !== 'approved') {
      return NextResponse.json({ error: 'Rental must be approved before payment' }, { status: 400 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Get agent owner's wallet
    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles')
      .select('wallet_address')
      .eq('id', agent?.owner_id)
      .single();

    if (!ownerProfile?.wallet_address) {
      return NextResponse.json({ 
        error: 'Agent owner has not set up a wallet for crypto payments' 
      }, { status: 400 });
    }

    // Calculate amount in USDC (6 decimals)
    const amountUsdc = Math.round(rental.agreed_price * 1_000_000);

    return NextResponse.json({
      rental_id: parseInt(id),
      agent_owner_wallet: ownerProfile.wallet_address,
      amount_usdc: amountUsdc,
      amount_display: rental.agreed_price,
      platform_fee_bps: 1000, // 10%
    });
  } catch (error: any) {
    logger.error('Crypto pay prepare error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/rentals/[id]/crypto-pay - Confirm on-chain payment
export async function PUT(
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
    const { tx_hash } = body;

    if (!tx_hash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`
        *,
        agent:agents(id, name, owner_id)
      `)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    if (rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Only renter can confirm payment' }, { status: 403 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Update rental with on-chain payment info
    const { data: updatedRental, error: updateError } = await supabaseAdmin
      .from('rentals')
      .update({
        status: 'paid',
        payment_method: 'crypto',
        crypto_tx_hash: tx_hash,
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Failed to update rental:', updateError);
      return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
    }

    // Notify agent owner
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: agent?.owner_id,
        type: 'rental_paid',
        title: 'Crypto Payment Received',
        message: `On-chain payment received for rental of "${agent?.name}". You can now start work.`,
        data: { rental_id: id, tx_hash },
      });

    logger.info(`Rental ${id} paid via crypto: ${tx_hash}`);

    return NextResponse.json({ rental: updatedRental });
  } catch (error: any) {
    logger.error('Crypto pay confirm error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
