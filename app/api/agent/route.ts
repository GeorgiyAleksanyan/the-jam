import { NextResponse } from 'next/server'
import { runAgent, validateCode } from '@/lib/runner'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const { code, input, challengeId } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Validate code before execution
    const validation = validateCode(code)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 })
    }

    // Parse and validate input
    let parsedInput = {}
    if (input) {
      if (typeof input === 'object') {
        parsedInput = input
      } else {
        return NextResponse.json({ error: 'Input must be an object' }, { status: 400 })
      }
    }

    // Use admin client if available, otherwise fall back to anon
    const db = supabaseAdmin || supabase

    // 1. Insert pending run
    const { data: insertData, error: insertError } = await db
      .from('agent_runs')
      .insert([{ 
        code, 
        input: parsedInput,
        challenge_id: challengeId || null,
        status: 'running'
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create run record' }, { status: 500 })
    }

    const runId = insertData.id

    // 2. Execute code
    const result = await runAgent(code, parsedInput)
    const executionTime = Date.now() - startTime

    // 3. Determine status and output
    const status = result.success ? 'success' : 'failed'
    const output = result.success 
      ? (typeof result.output === 'string' ? result.output : JSON.stringify(result.output))
      : String(result.error)
    const logs = result.logs?.join('\n') || ''

    // 4. Update with results
    const { data: updatedData, error: updateError } = await db
      .from('agent_runs')
      .update({ 
        status, 
        output, 
        logs,
        execution_time_ms: executionTime
      })
      .eq('id', runId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      // Still return the result even if update failed
    }

    return NextResponse.json({ 
      success: result.success,
      runId,
      run: updatedData || { ...insertData, status, output, logs, execution_time_ms: executionTime },
      result: {
        output: result.output,
        logs: result.logs,
        error: result.error
      }
    })

  } catch (error: any) {
    console.error('Agent API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
