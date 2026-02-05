import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/challenges/[slug]/fund - Add bounty contribution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { amount, tx_hash, chain, note } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be positive' },
        { status: 400 }
      );
    }

    // Find the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, status, github_issue_url')
      .eq('slug', slug)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Determine contributor type (user or agent)
    let contributorType = 'user';
    let userId = null;
    let agentId = null;

    // Check for agent API key
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer jam_sk_')) {
      const apiKey = authHeader.slice(7);
      const keyHash = require('crypto').createHash('sha256').update(apiKey).digest('hex');
      
      const { data: agent } = await supabase
        .from('agents')
        .select('id, name')
        .eq('api_key_hash', keyHash)
        .single();

      if (agent) {
        contributorType = 'agent';
        agentId = agent.id;
      }
    } else if (authHeader?.startsWith('Bearer ')) {
      // Check for user token
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // Create the contribution
    const { data: contribution, error: contribError } = await supabase
      .from('bounty_contributions')
      .insert({
        challenge_id: challenge.id,
        contributor_type: contributorType,
        user_id: userId,
        agent_id: agentId,
        amount,
        tx_hash: tx_hash || null,
        chain: chain || 'ethereum',
        note: note || null,
      })
      .select()
      .single();

    if (contribError) {
      console.error('Error creating contribution:', contribError);
      return NextResponse.json(
        { error: 'Failed to record contribution' },
        { status: 500 }
      );
    }

    // Get updated prize pool
    const { data: updatedChallenge } = await supabase
      .from('challenges')
      .select('prize_pool')
      .eq('id', challenge.id)
      .single();

    // TODO: Post comment to GitHub issue about the contribution
    // This would require GitHub App token - implement later

    return NextResponse.json({
      success: true,
      contribution: {
        id: contribution.id,
        amount: contribution.amount,
        chain: contribution.chain,
        tx_hash: contribution.tx_hash,
      },
      challenge: {
        slug,
        title: challenge.title,
        prize_pool: updatedChallenge?.prize_pool || amount,
        github_issue_url: challenge.github_issue_url,
      },
    });
  } catch (error) {
    console.error('Fund error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// GET /api/challenges/[slug]/fund - Get contribution history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Find the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, prize_pool')
      .eq('slug', slug)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      );
    }

    // Get contributions
    const { data: contributions } = await supabase
      .from('bounty_contributions')
      .select(`
        id, amount, chain, tx_hash, note, created_at,
        contributor_type,
        profiles:user_id (username, display_name),
        agents:agent_id (name, slug)
      `)
      .eq('challenge_id', challenge.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      challenge: {
        slug,
        title: challenge.title,
        prize_pool: challenge.prize_pool,
      },
      contributions: contributions || [],
      total_contributors: contributions?.length || 0,
    });
  } catch (error) {
    console.error('Get contributions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
