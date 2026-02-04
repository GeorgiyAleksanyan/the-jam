/**
 * Vote on a submission for a challenge
 * GET: List votes for a submission
 * POST: Cast a vote
 * DELETE: Remove your vote
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/challenges/[slug]/votes?submission_id=123
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get('submission_id');

  // Get challenge
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  // Build query
  let query = supabaseAdmin
    .from('votes')
    .select(`
      id,
      submission_id,
      voter_id,
      weight,
      created_at,
      profiles:voter_id (display_name, avatar_url)
    `);

  if (submissionId) {
    // Verify submission belongs to this challenge
    const { data: submission } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('id', submissionId)
      .eq('challenge_id', challenge.id)
      .single();

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    query = query.eq('submission_id', submissionId);
  } else {
    // Get all votes for all submissions on this challenge
    const { data: submissions } = await supabaseAdmin
      .from('submissions')
      .select('id')
      .eq('challenge_id', challenge.id);

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ votes: [], totals: {} });
    }

    const submissionIds = submissions.map(s => s.id);
    query = query.in('submission_id', submissionIds);
  }

  const { data: votes, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate totals per submission
  const totals: Record<string, number> = {};
  for (const vote of votes || []) {
    const sid = String(vote.submission_id);
    totals[sid] = (totals[sid] || 0) + (vote.weight || 1);
  }

  return NextResponse.json({ votes, totals });
}

// POST /api/challenges/[slug]/votes
// Body: { submission_id: number, weight?: number }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { submission_id, weight = 1 } = body;

  if (!submission_id) {
    return NextResponse.json({ error: 'submission_id required' }, { status: 400 });
  }

  if (weight < 1 || weight > 10) {
    return NextResponse.json({ error: 'Weight must be 1-10' }, { status: 400 });
  }

  // Verify challenge and submission
  const { data: challenge } = await supabaseAdmin
    .from('challenges')
    .select('id, status')
    .eq('slug', slug)
    .single();

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select('id, agent_id, agents:agent_id (owner_id)')
    .eq('id', submission_id)
    .eq('challenge_id', challenge.id)
    .single();

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Can't vote on your own submission
  const agent = submission.agents as any;
  if (agent?.owner_id === user.id) {
    return NextResponse.json({ error: 'Cannot vote on your own submission' }, { status: 400 });
  }

  // Upsert vote (one vote per user per submission)
  const { data: vote, error } = await supabaseAdmin
    .from('votes')
    .upsert(
      {
        submission_id,
        voter_id: user.id,
        weight,
      },
      { onConflict: 'submission_id,voter_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update submission vote count
  const { data: voteSum } = await supabaseAdmin
    .from('votes')
    .select('weight')
    .eq('submission_id', submission_id);

  const totalVotes = voteSum?.reduce((acc, v) => acc + (v.weight || 1), 0) || 0;

  await supabaseAdmin
    .from('submissions')
    .update({ votes: totalVotes })
    .eq('id', submission_id);

  return NextResponse.json({ vote, total_votes: totalVotes });
}

// DELETE /api/challenges/[slug]/votes?submission_id=123
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get('submission_id');

  if (!submissionId) {
    return NextResponse.json({ error: 'submission_id required' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delete vote
  const { error } = await supabaseAdmin
    .from('votes')
    .delete()
    .eq('submission_id', submissionId)
    .eq('voter_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update submission vote count
  const { data: voteSum } = await supabaseAdmin
    .from('votes')
    .select('weight')
    .eq('submission_id', submissionId);

  const totalVotes = voteSum?.reduce((acc, v) => acc + (v.weight || 1), 0) || 0;

  await supabaseAdmin
    .from('submissions')
    .update({ votes: totalVotes })
    .eq('id', submissionId);

  return NextResponse.json({ removed: true, total_votes: totalVotes });
}
