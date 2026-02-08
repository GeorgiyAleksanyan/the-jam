import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/texting/verify - Verify phone pairing with code
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Verification code required' }, { status: 400 });
    }

    // Get pairing
    const { data: pairing, error: pairingError } = await supabase
      .from('phone_pairings')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    if (pairingError || !pairing) {
      return NextResponse.json({ error: 'No pending pairing found' }, { status: 404 });
    }

    if (pairing.verified) {
      return NextResponse.json({ 
        success: true, 
        message: 'Already verified',
        phone: pairing.phone 
      });
    }

    // Check expiration
    if (new Date(pairing.verification_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification code expired' }, { status: 400 });
    }

    // Check code
    if (pairing.verification_code !== code.toString().trim()) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('phone_pairings')
      .update({
        verified: true,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq('id', pairing.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to verify' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Phone verified! You can now send texts.',
      phone: pairing.phone,
      gateway_email: pairing.gateway_email,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
