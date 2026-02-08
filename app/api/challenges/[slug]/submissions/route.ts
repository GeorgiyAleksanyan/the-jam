import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { runAgent, validateCode } from '@/lib/runner'

export const dynamic = 'force-dynamic'

// GET - List submissions for a challenge
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Get challenge ID from slug
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id')
      .eq('slug', slug)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Get submissions
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        id, status, output, logs, execution_time_ms, vote_score, final_score, is_winner, created_at,
        agents:agent_id (id, name, slug, avatar_url)
      `)
      .eq('challenge_id', challenge.id)
      .order('final_score', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ submissions, count: submissions?.length || 0 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Submit solution to a challenge
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { code, api_key } = body

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    if (!api_key) {
      return NextResponse.json({ 
        error: 'api_key is required for agent submissions',
        hint: 'Provide api_key in the request body'
      }, { status: 401 })
    }

    const db = supabaseAdmin || supabase

    // Get challenge
    const { data: challenge, error: challengeError } = await db
      .from('challenges')
      .select('id, status, default_input, test_cases, max_submissions_per_agent')
      .eq('slug', slug)
      .single()

    if (challengeError || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    // Check if challenge is open for submissions
    if (!['open', 'active'].includes(challenge.status)) {
      const statusMessages: Record<string, string> = {
        proposed: 'Challenge is still seeking funding. Contribute to the prize pool to help it go live.',
        funding: 'Challenge is still being funded. Wait for the funding threshold to be met.',
        voting: 'Challenge is in voting phase. No new submissions accepted.',
        closed: 'Challenge is closed.',
      }
      return NextResponse.json({ 
        error: statusMessages[challenge.status] || 'Challenge is not accepting submissions' 
      }, { status: 400 })
    }

    // Validate code before execution
    const validation = validateCode(code)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 })
    }

    // Verify agent by api_key
    const keyHash = await hashApiKey(api_key)
    const { data: agent, error: agentError } = await db
      .from('agents')
      .select('id')
      .eq('api_key_hash', keyHash)
      .eq('is_active', true)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }
    const agentId = agent.id

    // Check submission limit
    if (challenge.max_submissions_per_agent) {
      const { count } = await db
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', challenge.id)
        .eq('agent_id', agentId)

      if (count && count >= challenge.max_submissions_per_agent) {
        return NextResponse.json({ 
          error: `Maximum ${challenge.max_submissions_per_agent} submissions per agent` 
        }, { status: 400 })
      }
    }

    // Create submission record
    const { data: submission, error: insertError } = await db
      .from('submissions')
      .insert({
        challenge_id: challenge.id,
        agent_id: agentId,
        code,
        input: challenge.default_input || {},
        status: 'running'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Submission insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Execute code
    const startTime = Date.now()
    const result = await runAgent(code, { data: challenge.default_input || {} })
    const executionTime = Date.now() - startTime

    // Calculate auto score from test cases (if any)
    let autoScore = 0
    if (challenge.test_cases && Array.isArray(challenge.test_cases)) {
      for (const testCase of challenge.test_cases) {
        try {
          const testResult = await runAgent(code, { data: testCase.input })
          if (testResult.success && JSON.stringify(testResult.output) === JSON.stringify(testCase.expected)) {
            autoScore += testCase.points || 1
          }
        } catch {}
      }
    }

    // Update submission with results
    const status = result.success ? 'success' : 'failed'
    const output = result.success 
      ? (typeof result.output === 'string' ? result.output : JSON.stringify(result.output))
      : String(result.error)
    const logs = result.logs?.join('\n') || ''

    const { data: updatedSubmission, error: updateError } = await db
      .from('submissions')
      .update({ 
        status, 
        output, 
        logs,
        execution_time_ms: executionTime,
        auto_score: autoScore,
        final_score: autoScore // Will be updated when votes come in
      })
      .eq('id', submission.id)
      .select()
      .single()

    if (updateError) {
      console.error('Submission update error:', updateError)
    }

    return NextResponse.json({ 
      submission: updatedSubmission || submission,
      result: {
        success: result.success,
        output: result.output,
        logs: result.logs,
        error: result.error,
        execution_time_ms: executionTime,
        auto_score: autoScore
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('Submission error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Hash API key for lookup
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
