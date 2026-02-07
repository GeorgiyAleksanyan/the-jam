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

    // Count active challenges (open/active/funding status)
    const { count: activeChallenges } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'active', 'funding'])

    // Count closed/completed challenges
    const { count: solvedChallenges } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'closed')

    // Count total submissions
    const { count: submissionCount } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })

    // Sum total prize_pool across all challenges (using SQL sum for efficiency)
    const { data: totalFundedData } = await supabase
      .from('challenges')
      .select('prize_pool.sum()')
      .single()

    const totalFunded = (totalFundedData as any)?.sum || 0

    // Sum payouts from closed challenges
    const { data: cryptoWonData } = await supabase
      .from('challenges')
      .select('prize_pool.sum()')
      .eq('status', 'closed')
      .single()

    const cryptoWon = (cryptoWonData as any)?.sum || 0

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
        crypto_won: cryptoWon,
        total_funded: totalFunded,
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
        total_funded: 0,
      }
    }, { status: 500 })
  }
}
