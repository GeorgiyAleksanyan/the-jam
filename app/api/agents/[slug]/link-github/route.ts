import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/agents/[slug]/link-github - Link GitHub username to agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { github_username } = body;

    if (!github_username) {
      return NextResponse.json(
        { error: 'github_username is required' },
        { status: 400 }
      );
    }

    // Clean the username
    const cleanUsername = github_username.replace(/^@/, '').trim().toLowerCase();

    // Find the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, owner_id')
      .eq('slug', slug)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Verify authorization - either agent API key or owner token
    const authHeader = request.headers.get('authorization');
    let authorized = false;

    if (authHeader?.startsWith('Bearer jam_sk_')) {
      // Agent API key
      const apiKey = authHeader.slice(7);
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      const { data: authAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('id', agent.id)
        .eq('api_key_hash', keyHash)
        .single();

      authorized = !!authAgent;
    } else if (authHeader?.startsWith('Bearer ')) {
      // User token - check if they own the agent
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user && agent.owner_id === user.id) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - must be agent owner or use agent API key' },
        { status: 401 }
      );
    }

    // Check if this GitHub username is already linked to another agent
    const { data: existingLink } = await supabase
      .from('github_agent_links')
      .select('agent_id')
      .eq('github_username', cleanUsername)
      .single();

    if (existingLink && existingLink.agent_id !== agent.id) {
      return NextResponse.json(
        { error: 'This GitHub username is already linked to another agent' },
        { status: 409 }
      );
    }

    // Upsert the link
    const { data: link, error: linkError } = await supabase
      .from('github_agent_links')
      .upsert({
        github_username: cleanUsername,
        agent_id: agent.id,
        verified: false, // TODO: Implement verification via OAuth
      }, {
        onConflict: 'github_username',
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error linking GitHub:', linkError);
      return NextResponse.json(
        { error: 'Failed to link GitHub username' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      link: {
        github_username: cleanUsername,
        agent_id: agent.id,
        agent_name: agent.name,
        verified: link.verified,
      },
      message: `GitHub user @${cleanUsername} linked to agent ${agent.name}. PRs from this user will be attributed to the agent.`,
    });
  } catch (error) {
    console.error('Link GitHub error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// GET /api/agents/[slug]/link-github - Get linked GitHub accounts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Find the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get linked accounts
    const { data: links } = await supabase
      .from('github_agent_links')
      .select('github_username, verified, created_at')
      .eq('agent_id', agent.id);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        slug,
      },
      github_accounts: links || [],
    });
  } catch (error) {
    console.error('Get GitHub links error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[slug]/link-github - Unlink GitHub account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const github_username = searchParams.get('github_username');

    if (!github_username) {
      return NextResponse.json(
        { error: 'github_username query param is required' },
        { status: 400 }
      );
    }

    const cleanUsername = github_username.replace(/^@/, '').trim().toLowerCase();

    // Find the agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id, owner_id')
      .eq('slug', slug)
      .single();

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Verify authorization
    const authHeader = request.headers.get('authorization');
    let authorized = false;

    if (authHeader?.startsWith('Bearer jam_sk_')) {
      const apiKey = authHeader.slice(7);
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      
      const { data: authAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('id', agent.id)
        .eq('api_key_hash', keyHash)
        .single();

      authorized = !!authAgent;
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user && agent.owner_id === user.id) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the link
    const { error } = await supabase
      .from('github_agent_links')
      .delete()
      .eq('github_username', cleanUsername)
      .eq('agent_id', agent.id);

    if (error) {
      console.error('Error unlinking GitHub:', error);
      return NextResponse.json(
        { error: 'Failed to unlink' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `GitHub user @${cleanUsername} unlinked from agent`,
    });
  } catch (error) {
    console.error('Unlink GitHub error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
