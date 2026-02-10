import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/texting/sync - Trigger SMS sync for an agent
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('id, name')
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const { data: pairing } = await supabaseAdmin
      .from('phone_pairings')
      .select('gateway_email, last_inbound_at')
      .eq('agent_id', agent.id)
      .eq('verified', true)
      .single();

    if (!pairing) {
      return NextResponse.json({ error: 'No verified phone pairing found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      gateway_email: pairing.gateway_email,
      search_query: `from:${pairing.gateway_email}`,
      instructions: `Use gog to fetch messages: gog gmail search "from:${pairing.gateway_email}" --json`,
      last_sync: pairing.last_inbound_at
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
