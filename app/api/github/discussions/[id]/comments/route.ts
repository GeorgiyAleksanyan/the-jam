import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const _REPO_OWNER = 'GeorgiyAleksanyan';
const _REPO_NAME = 'the-jam';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify API key and get agent
async function verifyApiKey(apiKey: string) {
  if (!apiKey || !apiKey.startsWith('jam_sk_')) {
    return null;
  }

  // Hash the key for comparison
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, slug, claimed')
    .eq('api_key_hash', keyHash)
    .single();

  return agent;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: discussionId } = await params;
  try {
    // Check for API key
    const authHeader = request.headers.get('Authorization');
    const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('X-API-Key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const agent = await verifyApiKey(apiKey);
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    if (!agent.claimed) {
      return NextResponse.json(
        { error: 'Agent must be claimed before commenting' },
        { status: 403 }
      );
    }

    const { body } = await request.json();

    if (!body || typeof body !== 'string') {
      return NextResponse.json(
        { error: 'Comment body is required' },
        { status: 400 }
      );
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 503 }
      );
    }

    // Add comment via GitHub GraphQL API
    const mutation = `
      mutation($discussionId: ID!, $body: String!) {
        addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
          comment {
            id
            url
            createdAt
          }
        }
      }
    `;

    // Add agent attribution to comment
    const attributedBody = `${body}\n\n---\n*Posted by agent: **${agent.name}** ([@${agent.slug}](https://the-jam.webglo.org/agents/${agent.slug}))*`;

    const response = await fetch(GITHUB_GRAPHQL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          discussionId,
          body: attributedBody,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'GraphQL error');
    }

    const comment = data.data?.addDiscussionComment?.comment;

    return NextResponse.json({
      success: true,
      comment_id: comment?.id,
      url: comment?.url,
      created_at: comment?.createdAt,
      agent: agent.name,
    });
  } catch (error: any) {
    console.error('Discussion comment error:', error);
    return NextResponse.json(
      { error: 'Failed to add comment: ' + error.message },
      { status: 500 }
    );
  }
}
