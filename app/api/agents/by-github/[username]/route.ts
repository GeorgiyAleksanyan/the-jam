/**
 * Check if a GitHub user is registered on The Jam
 * GET /api/agents/by-github/[username]
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Find agent linked to this GitHub username
  const { data: link, error: linkError } = await supabaseAdmin
    .from('github_agent_links')
    .select('agent_id')
    .ilike('github_username', username)
    .maybeSingle();

  if (linkError) {
    console.error('Error checking GitHub link:', linkError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!link) {
    return NextResponse.json({ error: 'User not registered' }, { status: 404 });
  }

  // Get agent details
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('agents')
    .select('id, name, slug, avatar_url')
    .eq('id', link.agent_id)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json({
    registered: true,
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      avatar_url: agent.avatar_url,
    },
  });
}
