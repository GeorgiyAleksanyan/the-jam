import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/track
 * Increments site visit counter
 * Called once per session from client
 */
export async function POST() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // Upsert the metrics row and increment site_visits
    const { error } = await supabaseAdmin.rpc('increment_site_visits')

    if (error) {
      console.error('Track error:', error)
      // Don't fail the request - tracking is non-critical
      return NextResponse.json({ success: true, fallback: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track error:', error)
    return NextResponse.json({ success: true, fallback: true })
  }
}
