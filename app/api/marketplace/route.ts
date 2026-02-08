import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/marketplace - Search and browse rentable agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
    const minPrice = searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : null;
    const maxPrice = searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : null;
    const minRating = searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : null;
    const pricingModel = searchParams.get('pricing_model') || null;
    const responseTime = searchParams.get('response_time') || null;
    const availableNow = searchParams.get('available_now') === 'true';
    const sort = searchParams.get('sort') || 'rating'; // rating, price_low, price_high, rentals
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Base query - join agents with rental profiles
    let query = supabaseAdmin
      .from('agent_rental_profiles')
      .select(`
        *,
        agents!inner (
          id,
          slug,
          name,
          description,
          avatar_url,
          owner_id
        )
      `)
      .eq('is_available', true);

    // Filter by skills (array contains any)
    if (skills.length > 0) {
      query = query.overlaps('skills', skills);
    }

    // Filter by pricing model
    if (pricingModel) {
      query = query.eq('pricing_model', pricingModel);
    }

    // Filter by response time
    if (responseTime) {
      query = query.eq('response_time', responseTime);
    }

    // Filter by minimum rating
    if (minRating !== null) {
      query = query.gte('avg_rating', minRating);
    }

    // Filter by price range (use hourly_rate as primary, fallback to task_rate_min)
    if (maxPrice !== null) {
      query = query.or(`hourly_rate.lte.${maxPrice},task_rate_min.lte.${maxPrice}`);
    }

    if (minPrice !== null) {
      query = query.or(`hourly_rate.gte.${minPrice},task_rate_min.gte.${minPrice}`);
    }

    // Filter by availability (has capacity)
    if (availableNow) {
      query = query.lt('current_rentals', supabaseAdmin.rpc('coalesce', { 
        col: 'max_concurrent_rentals', 
        default_val: 1 
      }));
    }

    // Sorting
    switch (sort) {
      case 'price_low':
        query = query.order('hourly_rate', { ascending: true, nullsFirst: false });
        break;
      case 'price_high':
        query = query.order('hourly_rate', { ascending: false, nullsFirst: true });
        break;
      case 'rentals':
        query = query.order('total_rentals', { ascending: false });
        break;
      case 'rating':
      default:
        query = query.order('avg_rating', { ascending: false, nullsFirst: true });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count: _count } = await query;

    if (error) {
      logger.error('Marketplace query error:', error);
      return NextResponse.json({ error: 'Failed to fetch marketplace' }, { status: 500 });
    }

    // Transform data
    let agents = (data || []).map((profile: any) => ({
      id: profile.agents.id,
      slug: profile.agents.slug,
      name: profile.agents.name,
      description: profile.agents.description,
      avatar_url: profile.agents.avatar_url,
      tagline: profile.tagline,
      skills: profile.skills || [],
      pricing_model: profile.pricing_model,
      hourly_rate: profile.hourly_rate,
      task_rate_min: profile.task_rate_min,
      task_rate_max: profile.task_rate_max,
      monthly_rate: profile.monthly_rate,
      token_rate: profile.token_rate,
      currency: profile.currency,
      accepts_crypto: profile.accepts_crypto,
      accepts_fiat: profile.accepts_fiat,
      response_time: profile.response_time,
      avg_rating: profile.avg_rating,
      rating_count: profile.rating_count,
      total_rentals: profile.total_rentals,
      is_available: profile.current_rentals < (profile.max_concurrent_rentals || 1),
    }));

    // Client-side text search if provided (simple filter for now)
    if (search) {
      const searchLower = search.toLowerCase();
      agents = agents.filter((agent: any) =>
        agent.name.toLowerCase().includes(searchLower) ||
        (agent.description && agent.description.toLowerCase().includes(searchLower)) ||
        (agent.tagline && agent.tagline.toLowerCase().includes(searchLower)) ||
        agent.skills.some((s: string) => s.toLowerCase().includes(searchLower))
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('agent_rental_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true);

    return NextResponse.json({
      agents,
      total: totalCount || agents.length,
      limit,
      offset,
      has_more: offset + limit < (totalCount || 0),
    });
  } catch (error: any) {
    logger.error('Marketplace error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
