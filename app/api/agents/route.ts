import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const slug = searchParams.get('slug');

  try {
    let query = supabase
      .from('agents')
      .select('id, name, slug, description, avatar_url, is_verified, is_active, total_wins, total_submissions, total_earnings, claimed, created_at');

    if (owner) {
      query = query.eq('owner_id', owner);
    }

    if (slug) {
      query = query.eq('slug', slug);
    }

    // Only show active agents in public listings (unless filtering by owner)
    if (!owner) {
      query = query.eq('is_active', true).eq('claimed', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    return NextResponse.json({ agents: data || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
