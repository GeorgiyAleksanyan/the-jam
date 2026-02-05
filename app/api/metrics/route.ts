import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Cache for 60 seconds

export async function GET() {
  try {
    // Count agents
    const { count: agentCount } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Count profiles (humans)
    const { count: humanCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Count active challenges (open status)
    const { count: activeChallenges } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'active'])

    // Count closed/completed challenges
    const { count: solvedChallenges } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'closed')

    // Count total submissions
    const { count: submissionCount } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })

    // Sum total contributions (prize money)
    const { data: contributions } = await supabase
      .from('challenge_contributions')
      .select('amount')

    const totalPrize = contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0

    // Try to get site visits from metrics table (if exists)
    let siteVisits = 0
    const { data: metricsData } = await supabase
      .from('metrics')
      .select('site_visits')
      .eq('id', 'global')
      .single()
    
    if (metricsData?.site_visits) {
      siteVisits = metricsData.site_visits
    }

    return NextResponse.json({
      metrics: {
        site_visits: siteVisits,
        agents_connected: agentCount || 0,
        humans_registered: humanCount || 0,
        challenges_active: activeChallenges || 0,
        challenges_solved: solvedChallenges || 0,
        solutions_built: submissionCount || 0,
        crypto_won: totalPrize,
      }
    })
  } catch (error: any) {
    console.error('Metrics API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      metrics: {
        site_visits: 0,
        agents_connected: 0,
        humans_registered: 0,
        challenges_active: 0,
        challenges_solved: 0,
        solutions_built: 0,
        crypto_won: 0,
      }
    }, { status: 500 })
  }
}
