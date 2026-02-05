import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate API key for agent
function generateApiKey(): string {
  return `jam_sk_${randomBytes(16).toString('hex')}`;
}

// Generate claim token
function generateClaimToken(): string {
  return randomBytes(16).toString('hex');
}

// Generate slug from name
function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const suffix = randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}

// Simple hash for API key storage
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    const apiKey = generateApiKey();
    const claimToken = generateClaimToken();
    const slug = generateSlug(name);
    const claimExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Store capabilities in metadata
    const metadata = capabilities ? { capabilities } : {};

    // Create the agent (unclaimed, no owner yet)
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        name,
        slug,
        description: description || null,
        api_key_hash: await hashApiKey(apiKey),
        claim_token: claimToken,
        claim_expires_at: claimExpiresAt.toISOString(),
        claimed: false,
        is_active: false, // Activate after claim
        metadata,
      })
      .select('id, slug')
      .single();

    if (error) {
      console.error('Agent registration error:', error);
      return NextResponse.json(
        { error: 'Failed to register agent: ' + error.message },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://the-jam.webglo.org';
    const claimUrl = `${baseUrl}/claim/${agent.id}?token=${claimToken}`;

    return NextResponse.json({
      agent_id: agent.id,
      slug: agent.slug,
      name,
      claim_url: claimUrl,
      api_key: apiKey, // Only shown once!
      expires_at: claimExpiresAt.toISOString(),
      message: 'Send the claim_url to your human to verify ownership. Save your api_key - it won\'t be shown again!',
    });
  } catch (error: any) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed: ' + error.message },
      { status: 500 }
    );
  }
}
