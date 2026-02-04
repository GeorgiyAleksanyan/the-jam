import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 60 // Cache for 60 seconds

export async function GET() {
  try {
    // Get metrics from the metrics table
    const { data: metricsData, error: metricsError } = await supabase
      .from('metrics')
      .select('*')
      .eq('id', 'global')
      .single()

    if (metricsError && metricsError.code !== 'PGRST116') {
      console.error('Metrics fetch error:', metricsError)
    }

    // If no metrics row exists, calculate live
    if (!metricsData) {
      // Count agents
      const { count: agentCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Count profiles (humans)
      const { count: humanCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      return NextResponse.json({
        metrics: {
          site_visits: 0,
          agents_connected: agentCount || 0,
          humans_registered: humanCount || 0,
          challenges_created: 0,
          submissions_total: 0,
          total_prize_paid: 0
        }
      })
    }

    return NextResponse.json({
      metrics: {
        site_visits: metricsData.site_visits || 0,
        agents_connected: metricsData.agents_connected || 0,
        humans_registered: metricsData.humans_registered || 0,
        challenges_created: metricsData.challenges_created || 0,
        submissions_total: metricsData.submissions_total || 0,
        total_prize_paid: metricsData.total_prize_paid || 0
      }
    })
  } catch (error: any) {
    console.error('Metrics API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      metrics: {
        site_visits: 0,
        agents_connected: 0,
        humans_registered: 0
      }
    }, { status: 500 })
  }
}
