import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rate-limit-middleware';

export const dynamic = 'force-dynamic';

// Typed upgrade definitions for better maintainability
type UpgradeType = 'priority_compute' | 'verified_badge' | 'extended_runtime';

interface UpgradeConfig {
  cost: number;
  description: string;
  unit: 'USDC';
}

const UPGRADES: Record<UpgradeType, UpgradeConfig> = {
  'priority_compute': { cost: 5.00, description: 'Faster execution in the submission queue', unit: 'USDC' },
  'verified_badge': { cost: 25.00, description: 'Increases trust and visibility in the marketplace', unit: 'USDC' },
  'extended_runtime': { cost: 10.00, description: 'Double the maximum execution time for submissions', unit: 'USDC' }
};

/**
 * POST /api/agent/upgrade - Purchase upgrades using earned USDC
 */
export async function POST(request: NextRequest) {
  // 1. Rate Limiting protection
  const rateLimitResponse = await withRateLimit(request, 'api');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // 2. Authentication & Authorization
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return NextResponse.json({ error: 'System configuration error' }, { status: 500 });
    }

    // Secure API Key Verification (SHA-256)
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
      return NextResponse.json({ error: 'Invalid API key or agent not found' }, { status: 401 });
    }

    // 3. Input Validation
    const body = await request.json();
    const { upgrade_type } = body;

    if (!upgrade_type || !UPGRADES[upgrade_type as UpgradeType]) {
      return NextResponse.json({ 
        error: 'Invalid or missing upgrade_type', 
        available_upgrades: Object.keys(UPGRADES) 
      }, { status: 400 });
    }

    const selectedUpgrade = UPGRADES[upgrade_type as UpgradeType];
    const cost = selectedUpgrade.cost;

    // 4. Financial Logic (Balance Check)
    // We calculate spent amount from the metadata history to ensure data integrity
    const metadata = (agent.metadata as any) || {};
    const purchases = (metadata.upgrades_history as any[]) || [];
    const totalSpent = purchases.reduce((sum, p) => sum + (p.cost || 0), 0);
    
    const availableBalance = (agent.total_earnings || 0) - totalSpent;

    if (availableBalance < cost) {
      return NextResponse.json({ 
        error: 'Insufficient balance', 
        details: {
          required: cost, 
          available: availableBalance,
          total_earnings: agent.total_earnings,
          total_spent: totalSpent
        }
      }, { status: 403 });
    }

    // 5. Transaction Commit (Atomic Metadata Update)
    // We append the new purchase to the history
    const newPurchase = {
      type: upgrade_type,
      purchased_at: new Date().toISOString(),
      cost: cost,
      snapshot_balance_before: availableBalance
    };

    const newMetadata = {
      ...metadata,
      upgrades_history: [...purchases, newPurchase],
      // We can also store active flags for easier lookup
      [`has_${upgrade_type}`]: true
    };

    const { data: updatedAgent, error: updateError } = await supabaseAdmin
      .from('agents')
      .update({ 
        metadata: newMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id)
      .select('name, total_earnings, metadata')
      .single();

    if (updateError) {
      throw updateError;
    }

    // Recalculate new balance for response
    const newTotalSpent = totalSpent + cost;
    const newAvailableBalance = (updatedAgent.total_earnings || 0) - newTotalSpent;

    return NextResponse.json({
      success: true,
      message: `Upgrade '${upgrade_type}' purchased successfully`,
      data: {
        upgrade: selectedUpgrade,
        agent: updatedAgent.name,
        new_balance: newAvailableBalance,
        transaction_id: `tx_${Date.now()}_${agent.id.toString().slice(0, 5)}`
      }
    });

  } catch (error: any) {
    console.error('Upgrade transaction error:', error);
    return NextResponse.json({ 
      error: 'Transaction failed', 
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * GET /api/agent/upgrade - List available upgrades and prices
 */
export async function GET() {
  // Transform the UPGRADES object into a list for the client
  const list = Object.entries(UPGRADES).map(([id, config]) => ({
    id,
    ...config
  }));

  return NextResponse.json({ upgrades: list });
}
