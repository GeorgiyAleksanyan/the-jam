import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Verify agent API key and return agent info
async function verifyApiKey(apiKey: string) {
  if (!apiKey || !apiKey.startsWith('jam_sk_')) {
    return null;
  }

  // Hash the API key to compare with stored hash
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const db = supabaseAdmin || supabase;
  const { data: agent, error } = await db
    .from('agents')
    .select('id, user_id, name, slug')
    .eq('api_key_hash', apiKeyHash)
    .single();

  if (error || !agent) {
    return null;
  }

  return agent;
}

// GET - List challenges
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const difficulty = searchParams.get('difficulty')
    const _topic = searchParams.get('topic')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    let query = supabase
      .from('challenges')
      .select(`
        id, slug, title, short_description, description, difficulty, status,
        prize_pool, funding_threshold, upvote_threshold, upvotes, submission_count, view_count,
        starts_at, ends_at, created_at
      `)
      .order('prize_pool', { ascending: false })
      .limit(limit)

    // Filter by status (default to all active/pending states)
    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.in('status', ['proposed', 'funding', 'open', 'active', 'voting'])
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    const { data, error } = await query

    if (error) {
      console.error('Challenges fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ challenges: data, count: data?.length || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create challenge
export async function POST(request: Request) {
  try {
    const db = supabaseAdmin || supabase;
    let userId: string | null = null;

    // Try API key auth first (for agents)
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('X-API-Key');
    
    if (apiKey) {
      const agent = await verifyApiKey(apiKey);
      if (agent) {
        userId = agent.user_id;
      }
    }

    // Fall back to cookie auth (for web UI)
    if (!userId) {
      const cookieStore = await cookies()
      const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                )
              } catch {}
            },
          },
        }
      )

      const { data: { user }, error: authError } = await authClient.auth.getUser()
      
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      slug,
      short_description,
      description,
      difficulty,
      default_code,
      default_input,
      prize_pool,
      funding_threshold,
      upvote_threshold,
      ends_at,
      topic_ids
    } = body

    // Validate required fields
    if (!title || !slug || !description) {
      return NextResponse.json({ error: 'Title, slug, and description are required' }, { status: 400 })
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must be lowercase alphanumeric with hyphens only' }, { status: 400 })
    }


    // Check if slug is taken
    const { data: existing } = await db
      .from('challenges')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 })
    }

    // Calculate initial status based on thresholds
    const prizeAmount = prize_pool || 0;
    const fundingThresh = funding_threshold ?? prizeAmount;
    const upvoteThresh = upvote_threshold ?? 20;
    
    let initialStatus = 'proposed';
    if (prizeAmount > 0) {
      // Funded challenge
      if (fundingThresh <= 0 || prizeAmount >= fundingThresh) {
        initialStatus = 'open';
      } else {
        initialStatus = 'funding';
      }
    }
    // Free challenges start as 'proposed' and need upvotes

    // Insert challenge
    const { data: challenge, error: insertError } = await db
      .from('challenges')
      .insert({
      created_by: userId,
        title,
        slug,
        short_description: short_description || null,
        description,
        difficulty: difficulty || 'easy',
        default_code: default_code || null,
        default_input: default_input || {},
        prize_pool: prizeAmount,
        funding_threshold: fundingThresh,
        upvote_threshold: upvoteThresh,
        ends_at: ends_at || null,
        status: initialStatus
      })
      .select()
      .single()

    if (insertError) {
      console.error('Challenge insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Link topics if provided
    if (topic_ids && topic_ids.length > 0) {
      const topicLinks = topic_ids.map((topic_id: number) => ({
        challenge_id: challenge.id,
        topic_id
      }))
      
      await db.from('challenge_topics').insert(topicLinks)
    }

    return NextResponse.json({ challenge }, { status: 201 })
  } catch (error: any) {
    console.error('Challenge creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
