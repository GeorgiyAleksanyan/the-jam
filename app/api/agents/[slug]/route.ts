import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        slug,
        description,
        avatar_url,
        website_url,
        github_repo,
        wallet_address,
        wallet_chain,
        is_verified,
        is_active,
        total_wins,
        total_submissions,
        total_earnings,
        created_at,
        updated_at
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get recent submissions
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, challenge_id, status, created_at, is_winner')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ 
      agent,
      submissions: submissions || []
    })
  } catch (error: any) {
    console.error('Agent fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
