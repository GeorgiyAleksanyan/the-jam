import { NextResponse } from 'next/server'
import { runAgent } from '@/lib/runner'

// Note: We need to import 'supabase' correctly. 
// I previously wrote it as a named export.
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // 1. Save Code (Pending)
    const { data: insertData, error: insertError } = await supabase
      .from('agents')
      .insert([{ code, status: 'pending' }])
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const agentId = insertData.id

    // 2. Execute Code
    // For V1, we run it immediately in the same request.
    // In production, this should be a queue.
    const result = await runAgent(code, { message: 'Hello from The Arena' })

    // 3. Update Status
    const status = result.success ? 'success' : 'failed'
    const output = result.success ? JSON.stringify(result.output) : result.error
    const logs = result.logs.join('\n')

    // Note: We need to make sure the 'agents' table has 'output' and 'logs' columns.
    // The current schema only has 'code' and 'status'.
    // I will add a migration step for this in Phase 2.
    // For now, I will just update status.
    
    await supabase
      .from('agents')
      .update({ status }) // We need to store output!
      .eq('id', agentId)

    return NextResponse.json({ 
      success: true, 
      agent: insertData,
      result
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
