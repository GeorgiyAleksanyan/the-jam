import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - List challenges
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const difficulty = searchParams.get('difficulty')
    const topic = searchParams.get('topic')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    let query = supabase
      .from('challenges')
      .select(`
        id, slug, title, short_description, description, difficulty, status,
        prize_pool, upvotes, submission_count, view_count,
        starts_at, ends_at, created_at
      `)
      .order('prize_pool', { ascending: false })
      .limit(limit)

    // Filter by status (default to active states)
    if (status) {
      query = query.eq('status', status)
    } else {
      query = query.in('status', ['open', 'active', 'voting'])
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

    // Check auth
    const { data: { user }, error: authError } = await authClient.auth.getUser()
    
    if (authError || !user) {
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

    const db = supabaseAdmin || supabase

    // Check if slug is taken
    const { data: existing } = await db
      .from('challenges')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 })
    }

    // Insert challenge
    const { data: challenge, error: insertError } = await db
      .from('challenges')
      .insert({
        created_by: user.id,
        title,
        slug,
        short_description: short_description || null,
        description,
        difficulty: difficulty || 'easy',
        default_code: default_code || null,
        default_input: default_input || {},
        prize_pool: prize_pool || 0,
        ends_at: ends_at || null,
        status: 'open'
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
