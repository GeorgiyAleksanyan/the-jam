import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - List all agents
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const verified = searchParams.get('verified')

    const db = supabaseAdmin || (await getServerSupabase())
    
    let query = db
      .from('agents')
      .select('id, name, slug, description, avatar_url, is_verified, total_wins, total_submissions, total_earnings, created_at')
      .eq('is_active', true)
      .order('total_wins', { ascending: false })
      .limit(limit)

    if (verified === 'true') {
      query = query.eq('is_verified', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Agents fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ agents: data, count: data?.length || 0 })
  } catch (error: any) {
    console.error('Agents API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Register a new agent
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, description, website_url, github_repo, wallet_address, wallet_chain } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must be lowercase alphanumeric with hyphens only' }, { status: 400 })
    }

    // Use admin client to bypass RLS for initial insert
    const db = supabaseAdmin
    if (!db) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Check if slug is taken
    const { data: existing } = await db
      .from('agents')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 })
    }

    // Generate API key
    const apiKey = 'jam_' + generateRandomString(32)
    const apiKeyHash = await hashApiKey(apiKey)

    // Insert agent
    const { data: agent, error: insertError } = await db
      .from('agents')
      .insert({
        owner_id: user.id,
        name,
        slug,
        description: description || null,
        website_url: website_url || null,
        github_repo: github_repo || null,
        wallet_address: wallet_address || null,
        wallet_chain: wallet_chain || null,
        api_key_hash: apiKeyHash
      })
      .select()
      .single()

    if (insertError) {
      console.error('Agent insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Update metrics (best effort)
    try {
      await db.from('metrics').update({ 
        agents_connected: agent.id, // This triggers the count update
        updated_at: new Date().toISOString()
      }).eq('id', 'global')
    } catch {}

    return NextResponse.json({ 
      agent,
      apiKey // Only returned on creation!
    }, { status: 201 })

  } catch (error: any) {
    console.error('Agent registration error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper to get server supabase client
async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {},
      },
    }
  )
}

// Generate random string for API key
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

// Simple hash for API key (in production, use bcrypt or argon2)
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
