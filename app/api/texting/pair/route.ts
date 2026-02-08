import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCarrier, getGatewayEmail, RATE_LIMITS, getSupportedCarriers } from '@/lib/carriers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/texting/pair - Initiate phone pairing
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Validate agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('api_key', apiKey)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, carrier } = body;

    if (!phone || !carrier) {
      return NextResponse.json(
        { error: 'Missing required fields: phone, carrier' },
        { status: 400 }
      );
    }

    // Normalize carrier
    const normalizedCarrier = normalizeCarrier(carrier);
    if (!normalizedCarrier) {
      return NextResponse.json(
        { 
          error: `Unknown carrier: ${carrier}`,
          supported: getSupportedCarriers()
        },
        { status: 400 }
      );
    }

    // Get gateway email
    const gatewayEmail = getGatewayEmail(phone, normalizedCarrier);
    if (!gatewayEmail) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Expected 10-digit US number.' },
        { status: 400 }
      );
    }

    // Normalize phone
    const phoneNormalized = phone.replace(/\D/g, '').slice(-10);

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check for existing pairing
    const { data: existing } = await supabase
      .from('phone_pairings')
      .select('id')
      .eq('agent_id', agent.id)
      .single();

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from('phone_pairings')
        .update({
          phone,
          phone_normalized: phoneNormalized,
          carrier: normalizedCarrier,
          gateway_email: gatewayEmail,
          verified: false,
          verification_code: verificationCode,
          verification_expires_at: expiresAt.toISOString(),
          paused: false,
          pause_reason: null,
        })
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update pairing' }, { status: 500 });
      }
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from('phone_pairings')
        .insert({
          agent_id: agent.id,
          phone,
          phone_normalized: phoneNormalized,
          carrier: normalizedCarrier,
          gateway_email: gatewayEmail,
          verification_code: verificationCode,
          verification_expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        return NextResponse.json({ error: 'Failed to create pairing' }, { status: 500 });
      }
    }

    // Return instructions for sending verification
    // Agent should use gog to send the verification SMS
    return NextResponse.json({
      success: true,
      message: 'Pairing initiated. Send verification code via SMS.',
      gateway_email: gatewayEmail,
      verification_code: verificationCode,
      expires_at: expiresAt.toISOString(),
      instructions: `Send this SMS using gog:\n\ngog gmail send --to "${gatewayEmail}" --subject "" --body "Your verification code is: ${verificationCode}"`,
    });
  } catch (error) {
    console.error('Pair error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/texting/pair - Get current pairing status
 */
export async function GET(request: NextRequest) {
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

    const { data: pairing } = await supabase
      .from('phone_pairings')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    if (!pairing) {
      return NextResponse.json({ paired: false });
    }

    return NextResponse.json({
      paired: pairing.verified,
      phone: pairing.phone,
      carrier: pairing.carrier,
      gateway_email: pairing.gateway_email,
      last_outbound: pairing.last_outbound_at,
      last_inbound: pairing.last_inbound_at,
      messages_today: pairing.messages_today,
      paused: pairing.paused,
      pause_reason: pairing.pause_reason,
      rate_limits: RATE_LIMITS,
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/texting/pair - Remove pairing
 */
export async function DELETE(request: NextRequest) {
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

    const { error } = await supabase
      .from('phone_pairings')
      .delete()
      .eq('agent_id', agent.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete pairing' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Pairing removed' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
