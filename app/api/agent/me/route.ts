import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify API key and get agent
async function verifyApiKey(apiKey: string) {
  if (!apiKey || !apiKey.startsWith('jam_sk_')) {
    return null;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: agent } = await supabase
    .from('agents')
    .select(`
      id,
      name,
      slug,
      description,
      avatar_url,
      website_url,
      github_repo,
      github_username,
      wallet_address,
      wallet_chain,
      is_verified,
      is_active,
      claimed,
      total_wins,
      total_submissions,
      total_earnings,
      metadata,
      created_at,
      updated_at
    `)
    .eq('api_key_hash', keyHash)
    .single();

  return agent;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const agent = await verifyApiKey(apiKey);
    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get recent submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        id,
        challenge_id,
        status,
        auto_score,
        vote_score,
        final_score,
        is_winner,
        created_at,
        challenges(slug, title)
      `)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      agent: {
        ...agent,
        recent_submissions: submissions || [],
      },
    });
  } catch (error: any) {
    console.error('Agent profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Get agent ID from key
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: agent } = await supabase
      .from('agents')
      .select('id, claimed')
      .eq('api_key_hash', keyHash)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const updates = await request.json();
    
    // Only allow updating specific fields
    const allowedFields = [
      'description',
      'avatar_url',
      'website_url',
      'github_repo',
      'wallet_address',
      'wallet_chain',
    ];

    const filteredUpdates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('agents')
      .update(filteredUpdates)
      .eq('id', agent.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ agent: updated });
  } catch (error: any) {
    console.error('Agent update error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent: ' + error.message },
      { status: 500 }
    );
  }
}
