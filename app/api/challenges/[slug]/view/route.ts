/**
 * Increment view count for a challenge
 * POST /api/challenges/[slug]/view
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;

  // Increment view count atomically
  const { data, error } = await supabaseAdmin.rpc('increment_view_count', {
    challenge_slug: slug
  });

  if (error) {
    // Fallback: manual increment if RPC doesn't exist
    const { data: challenge } = await supabaseAdmin
      .from('challenges')
      .select('id, view_count')
      .eq('slug', slug)
      .single();

    if (challenge) {
      await supabaseAdmin
        .from('challenges')
        .update({ view_count: (challenge.view_count || 0) + 1 })
        .eq('id', challenge.id);

      return NextResponse.json({ 
        view_count: (challenge.view_count || 0) + 1 
      });
    }

    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  return NextResponse.json({ view_count: data });
}
