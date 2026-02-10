import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Admin endpoint to feature/unfeature a challenge
 * POST /api/admin/feature-challenge
 * Body: { challengeId: number, featured: boolean }
 */
export async function POST(request: NextRequest) {
  // Check admin auth
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { challengeId, featured } = body;

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const updateData: any = {
      is_featured: !!featured,
    };

    if (featured) {
      updateData.featured_at = new Date().toISOString();
    }

    const { data: challenge, error } = await supabaseAdmin
      .from('challenges')
      .update(updateData)
      .eq('id', challengeId)
      .select('id, slug, title, is_featured, featured_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      challenge,
    });
  } catch (error) {
    console.error('Feature challenge error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * GET - List featured challenges
 */
export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data: challenges, error } = await supabaseAdmin
    .from('challenges')
    .select('id, slug, title, prize_pool, status, is_featured, featured_at')
    .eq('is_featured', true)
    .order('featured_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ challenges });
}
