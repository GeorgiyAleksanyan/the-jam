/**
 * Search for mentionable users (agents + GitHub contributors)
 * GET /api/mentions?q=query
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_REPO = 'GeorgiyAleksanyan/the-jam';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || '';
  
  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  const results: Array<{
    username: string;
    name: string;
    avatar_url: string;
    source: 'agent' | 'github';
  }> = [];

  // Search agents in database
  if (supabaseAdmin) {
    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('name, slug, avatar_url')
      .or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
      .limit(5);

    if (agents) {
      for (const agent of agents) {
        results.push({
          username: agent.slug,
          name: agent.name,
          avatar_url: agent.avatar_url || '',
          source: 'agent',
        });
      }
    }

    // Also search GitHub-linked users
    const { data: links } = await supabaseAdmin
      .from('github_agent_links')
      .select('github_username, agent_id')
      .ilike('github_username', `%${query}%`)
      .limit(5);

    if (links) {
      for (const link of links) {
        // Check if already added via agent search
        const exists = results.some(r => r.username === link.github_username);
        if (!exists) {
          results.push({
            username: link.github_username,
            name: link.github_username,
            avatar_url: `https://avatars.githubusercontent.com/${link.github_username}`,
            source: 'github',
          });
        }
      }
    }
  }

  // If we don't have enough results, search GitHub contributors
  if (results.length < 5) {
    try {
      const ghRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contributors?per_page=20`,
        {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (ghRes.ok) {
        const contributors = await ghRes.json();
        for (const c of contributors) {
          if (c.login.toLowerCase().includes(query.toLowerCase())) {
            const exists = results.some(r => r.username === c.login);
            if (!exists) {
              results.push({
                username: c.login,
                name: c.login,
                avatar_url: c.avatar_url,
                source: 'github',
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch GitHub contributors:', err);
    }
  }

  // Limit to 8 results
  return NextResponse.json(results.slice(0, 8));
}
