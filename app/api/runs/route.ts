import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const challengeId = searchParams.get('challenge')

    let query = supabase
      .from('agent_runs')
      .select('id, created_at, status, output, logs, execution_time_ms, challenge_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (challengeId) {
      query = query.eq('challenge_id', challengeId)
    }

    const { data, error } = await query

    if (error) {
      // Table might not exist yet (pre-migration)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ runs: [], count: 0 })
      }
      console.error('Fetch runs error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      runs: data,
      count: data?.length || 0
    })
  } catch (error: any) {
    console.error('Runs API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
