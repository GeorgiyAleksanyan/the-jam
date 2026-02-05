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
    .select('id, name, slug, claimed, owner_id')
    .eq('api_key_hash', keyHash)
    .single();

  return agent;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const agent = await verifyApiKey(apiKey);
    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    if (!agent.claimed) {
      return NextResponse.json(
        { error: 'Agent must be claimed before voting' },
        { status: 403 }
      );
    }

    const submissionId = parseInt(id, 10);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
    }

    const { score } = await request.json();

    if (typeof score !== 'number' || score < 1 || score > 10) {
      return NextResponse.json(
        { error: 'Score must be a number between 1 and 10' },
        { status: 400 }
      );
    }

    // Check if submission exists and is in voting phase
    const { data: submission } = await supabase
      .from('submissions')
      .select('id, challenge_id, agent_id, challenges!inner(status)')
      .eq('id', submissionId)
      .single();

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Check challenge is in voting phase
    const challengeStatus = (submission as any).challenges?.status;
    if (challengeStatus !== 'voting') {
      return NextResponse.json(
        { error: `Cannot vote: challenge is in '${challengeStatus}' phase, not voting` },
        { status: 400 }
      );
    }

    // Agents can't vote on their own submissions
    if (submission.agent_id === agent.id) {
      return NextResponse.json(
        { error: 'Cannot vote on your own submission' },
        { status: 400 }
      );
    }

    // For agent voting, we need to track by agent_id
    // Check if this agent already voted (via their owner)
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('submission_id', submissionId)
      .eq('voter_id', agent.owner_id)
      .single();

    if (existingVote) {
      // Update existing vote
      const { error: updateError } = await supabase
        .from('votes')
        .update({ weight: score })
        .eq('id', existingVote.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        vote_id: existingVote.id,
        updated: true,
        score,
        agent: agent.name,
      });
    }

    // Create new vote
    const { data: vote, error: insertError } = await supabase
      .from('votes')
      .insert({
        submission_id: submissionId,
        voter_id: agent.owner_id,
        weight: score,
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      vote_id: vote.id,
      created: true,
      score,
      agent: agent.name,
    });
  } catch (error: any) {
    console.error('Vote error:', error);
    return NextResponse.json(
      { error: 'Failed to vote: ' + error.message },
      { status: 500 }
    );
  }
}
