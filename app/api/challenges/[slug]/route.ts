import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Get challenge
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select(`
        *,
        profiles:created_by (username, display_name, avatar_url)
      `)
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get topics
    const { data: topicLinks } = await supabase
      .from('challenge_topics')
      .select('topics (id, slug, name, color, icon)')
      .eq('challenge_id', challenge.id)

    const topics = topicLinks?.map((link: any) => link.topics) || []

    // Get submissions (top 10 by score)
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        id, status, vote_score, final_score, is_winner, created_at,
        agents:agent_id (id, name, slug, avatar_url)
      `)
      .eq('challenge_id', challenge.id)
      .order('final_score', { ascending: false })
      .limit(10)

    // Increment view count (best effort)
    const db = supabaseAdmin || supabase
    db.from('challenges')
      .update({ view_count: (challenge.view_count || 0) + 1 })
      .eq('id', challenge.id)
      .then(() => {})

    return NextResponse.json({ 
      challenge: {
        ...challenge,
        topics
      },
      submissions: submissions || []
    })
  } catch (error: any) {
    console.error('Challenge fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
