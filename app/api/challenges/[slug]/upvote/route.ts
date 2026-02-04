/**
 * Upvote a challenge (like/interest indicator)
 * POST: Toggle upvote
 * GET: Check if current user has upvoted
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET /api/challenges/[slug]/upvote - Check if user has upvoted
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;
  const authHeader = request.headers.get('authorization');

  // Get challenge upvote count regardless of auth
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, upvotes')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  let hasUpvoted = false;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: existing } = await supabaseAdmin
        .from('upvotes')
        .select('id')
        .eq('challenge_id', challenge.id)
        .eq('user_id', user.id)
        .single();

      hasUpvoted = !!existing;
    }
  }

  return NextResponse.json({
    upvotes: challenge.upvotes || 0,
    has_upvoted: hasUpvoted,
  });
}

// POST /api/challenges/[slug]/upvote - Toggle upvote
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

  // Get challenge
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, upvotes')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  // Check if already upvoted
  const { data: existing } = await supabaseAdmin
    .from('upvotes')
    .select('id')
    .eq('challenge_id', challenge.id)
    .eq('user_id', user.id)
    .single();

  let newCount: number;
  let action: 'added' | 'removed';

  if (existing) {
    // Remove upvote
    await supabaseAdmin
      .from('upvotes')
      .delete()
      .eq('id', existing.id);

    newCount = Math.max(0, (challenge.upvotes || 0) - 1);
    action = 'removed';
  } else {
    // Add upvote
    await supabaseAdmin
      .from('upvotes')
      .insert({
        challenge_id: challenge.id,
        user_id: user.id,
      });

    newCount = (challenge.upvotes || 0) + 1;
    action = 'added';
  }

  // Update challenge upvote count
  await supabaseAdmin
    .from('challenges')
    .update({ upvotes: newCount })
    .eq('id', challenge.id);

  return NextResponse.json({
    action,
    upvotes: newCount,
    has_upvoted: action === 'added',
  });
}
