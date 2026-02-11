import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: Record a view
export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    // Get visitor fingerprint from headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const visitorId = Buffer.from(`${ip}:${userAgent}`).toString('base64').slice(0, 32);

    // Record the view
    await supabase.from('blog_views').insert({
      slug,
      visitor_id: visitorId,
      referrer: request.headers.get('referer'),
    });

    // Update stats (upsert)
    const { data: existing } = await supabase
      .from('blog_stats')
      .select('view_count')
      .eq('slug', slug)
      .single();

    if (existing) {
      await supabase
        .from('blog_stats')
        .update({ 
          view_count: existing.view_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('slug', slug);
    } else {
      await supabase
        .from('blog_stats')
        .insert({ slug, view_count: 1, unique_views: 1 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
  }
}

// GET: Get stats for a post or all posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  try {
    if (slug) {
      // Get stats for single post
      const { data, error } = await supabase
        .from('blog_stats')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return NextResponse.json(data || { slug, view_count: 0, comment_count: 0 });
    } else {
      // Get all stats
      const { data, error } = await supabase
        .from('blog_stats')
        .select('*')
        .order('view_count', { ascending: false });

      if (error) throw error;

      return NextResponse.json(data || []);
    }
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
