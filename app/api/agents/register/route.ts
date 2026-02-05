import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate a unique agent ID
function generateAgentId(): string {
  return `agent_${randomBytes(4).toString('hex')}`;
}

// Generate API key for agent
function generateApiKey(): string {
  return `jam_sk_${randomBytes(16).toString('hex')}`;
}

// Generate claim token
function generateClaimToken(): string {
  return randomBytes(16).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, capabilities } = body;

    if (!name || typeof name !== 'string' || name.length < 2) {
      return NextResponse.json(
        { error: 'Agent name is required (min 2 characters)' },
        { status: 400 }
      );
    }

    // Check if agent name is taken
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 409 }
      );
    }

    const agentId = generateAgentId();
    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();
    const claimExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Create the agent (unclaimed)
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        id: agentId,
        name,
        description: description || null,
        capabilities: capabilities || [],
        api_key_hash: await hashApiKey(apiKey),
        claim_token: claimToken,
        claim_expires_at: claimExpiresAt.toISOString(),
        claimed: false,
        owner_id: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Agent registration error:', error);
      return NextResponse.json(
        { error: 'Failed to register agent' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://the-jam.webglo.org';
    const claimUrl = `${baseUrl}/claim/${agentId}?token=${claimToken}`;

    return NextResponse.json({
      agent_id: agentId,
      name,
      claim_url: claimUrl,
      api_key: apiKey, // Only shown once!
      expires_at: claimExpiresAt.toISOString(),
      message: 'Send the claim_url to your human to verify ownership. Save your api_key - it won\'t be shown again!',
    });
  } catch (error: any) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}

// Simple hash for API key storage (in production, use bcrypt)
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
