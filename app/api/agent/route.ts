import { NextResponse } from 'next/server'
import { runAgent } from '@/lib/runner'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { code, input } = await request.json()

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

    // 2. Execute Code (Pass the input!)
    const result = await runAgent(code, input || {})

    // 3. Update Status & Output
    const status = result.success ? 'success' : 'failed'
    const output = result.success ? JSON.stringify(result.output) : String(result.error)
    const logs = result.logs.join('\n')

    const { data: updatedData, error: updateError } = await supabase
      .from('agents')
      .update({ status, output, logs })
      .eq('id', agentId)
      .select()
      .single()

    if (updateError) {
       console.error('Failed to update agent result:', updateError)
    }

    return NextResponse.json({ 
      success: true, 
      agent: updatedData || { ...insertData, status, output, logs },
      result
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
