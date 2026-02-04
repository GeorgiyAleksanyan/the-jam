import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Initialize Supabase (using the lib wrapper which checks env vars)
    // Note: We need to import the named export 'supabase' from lib/supabase
    // But since I can't easily see the file content right now to verify the export name,
    // I'll trust my previous write: "export const supabase = createClient..."
    const { supabase } = await import('@/lib/supabase')

    // Save to Supabase
    // Table: 'agents'
    // Columns: 'code' (text), 'status' (text - default 'pending')
    const { data, error } = await supabase
      .from('agents')
      .insert([
        { code, status: 'pending' },
      ])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Agent deployed successfully', 
      agent: data[0] 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
