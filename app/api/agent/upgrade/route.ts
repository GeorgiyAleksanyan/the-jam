import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rate-limit-middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agent/upgrade - Purchase upgrades for an agent using earned USDC
 * Implements Issue #20: Agent Upgrade Marketplace
 */
export async function POST(request: NextRequest) {
  // 1. Rate Limiting
  const rateLimitResponse = await withRateLimit(request, 'api');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // 2. Verify Agent by API Key
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, name, total_earnings, metadata')
      .eq('api_key_hash', apiKeyHash)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // 3. Parse Upgrade Request
    const body = await request.json();
    const { upgrade_type } = body;

    // Defined upgrade costs
    const UPGRADES: Record<string, number> = {
      'priority_compute': 5.00,
      'verified_badge': 25.00,
      'extended_runtime': 10.00
    };

    if (!upgrade_type || !UPGRADES[upgrade_type]) {
      return NextResponse.json({ 
        error: 'Invalid upgrade type', 
        available: Object.keys(UPGRADES) 
      }, { status: 400 });
    }

    const cost = UPGRADES[upgrade_type];

    // 4. Check Balance
    const spent = (agent.metadata as any)?.total_spent || 0;
    const availableBalance = (agent.total_earnings || 0) - spent;

    if (availableBalance < cost) {
      return NextResponse.json({ 
        error: 'Insufficient balance', 
        required: cost, 
        available: availableBalance 
      }, { status: 403 });
    }

    // 5. Process Purchase
    const newMetadata = {
      ...(agent.metadata as object || {}),
      total_spent: spent + cost,
      upgrades: [...((agent.metadata as any)?.upgrades || []), {
        type: upgrade_type,
        purchased_at: new Date().toISOString(),
        cost
      }]
    };

    const { data: updatedAgent, error: updateError } = await supabaseAdmin
      .from('agents')
      .update({ metadata: newMetadata })
      .eq('id', agent.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `Upgrade '${upgrade_type}' purchased successfully`,
      agent: {
        name: updatedAgent.name,
        available_balance: (updatedAgent.total_earnings || 0) - (updatedAgent.metadata as any).total_spent
      }
    });

  } catch (error: any) {
    console.error('Upgrade error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/agent/upgrade - List available upgrades and prices
 */
export async function GET() {
  return NextResponse.json({
    upgrades: [
      { id: 'priority_compute', name: 'Priority Compute', cost: 5.00, unit: 'USDC', description: 'Faster execution in the submission queue' },
      { id: 'verified_badge', name: 'Verified Badge', cost: 25.00, unit: 'USDC', description: 'Increases trust and visibility in the marketplace' },
      { id: 'extended_runtime', name: 'Extended Runtime', cost: 10.00, unit: 'USDC', description: 'Double the maximum execution time for submissions' }
    ]
  });
}
