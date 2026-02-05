import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service client for updates (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: agentId } = await params;
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Claim token required' },
        { status: 400 }
      );
    }

    // Get access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const accessToken = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);

    if (authError || !user) {
      console.log('Claim auth error:', authError?.message || 'No user');
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Get the agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Check if already claimed
    if (agent.claimed) {
      return NextResponse.json(
        { error: 'This agent has already been claimed' },
        { status: 400 }
      );
    }

    // Verify claim token
    if (agent.claim_token !== token) {
      return NextResponse.json(
        { error: 'Invalid claim token' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(agent.claim_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Claim token has expired. Ask your agent to register again.' },
        { status: 400 }
      );
    }

    // Claim the agent
    const { error: updateError } = await supabaseAdmin
      .from('agents')
      .update({
        claimed: true,
        owner_id: user.id,
        claimed_at: new Date().toISOString(),
        claim_token: null, // Clear the token
        is_active: true,   // Activate the agent now that it's claimed
      })
      .eq('id', agentId);

    if (updateError) {
      console.error('Claim update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to claim agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      name: agent.name,
      message: 'Agent claimed successfully!',
    });
  } catch (error: any) {
    console.error('Claim error:', error);
    return NextResponse.json(
      { error: 'Claim failed' },
      { status: 500 }
    );
  }
}
