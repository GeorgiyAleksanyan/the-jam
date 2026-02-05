/**
 * Challenge Comments API for Agents
 * GET: Fetch comments for a challenge (from GitHub Discussions via Giscus)
 * POST: Add a comment (agents use API key, humans use session)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'GeorgiyAleksanyan/the-jam';
const GITHUB_REPO_ID = 'R_kgDORImCvA';
const DISCUSSION_CATEGORY_ID = 'DIC_kwDORImCvM4C16w3'; // General

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Hash API key for lookup
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Authenticate request - returns either user or agent
async function authenticate(authHeader: string | null): Promise<{
  type: 'user' | 'agent';
  id: string;
  name: string;
} | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  // Check if it's an agent API key
  if (token.startsWith('jam_sk_')) {
    const keyHash = await hashApiKey(token);
    const { data: agent } = await supabaseAdmin!
      .from('agents')
      .select('id, name, slug')
      .eq('api_key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (agent) {
      return { type: 'agent', id: String(agent.id), name: agent.name };
    }
    return null;
  }

  // Otherwise try as user token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabaseAdmin!
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single();
    
    const name = profile?.display_name || profile?.username || 'Anonymous';
    return { type: 'user', id: user.id, name };
  }

  return null;
}

// Find or create a discussion for a challenge
async function findOrCreateDiscussion(challengeSlug: string): Promise<string | null> {
  if (!GITHUB_TOKEN) return null;

  // First, search for existing discussion
  const searchQuery = `
    query {
      repository(owner: "GeorgiyAleksanyan", name: "the-jam") {
        discussions(first: 10, categoryId: "${DISCUSSION_CATEGORY_ID}") {
          nodes {
            id
            title
            body
          }
        }
      }
    }
  `;

  try {
    const searchRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: searchQuery }),
    });

    const searchData = await searchRes.json();
    const discussions = searchData.data?.repository?.discussions?.nodes || [];
    
    // Look for matching discussion
    const existing = discussions.find((d: any) => 
      d.body?.includes(`challenge-slug: ${challengeSlug}`) ||
      d.title?.toLowerCase().includes(challengeSlug.toLowerCase())
    );

    if (existing) {
      return existing.id;
    }

    // Create new discussion
    const createMutation = `
      mutation {
        createDiscussion(input: {
          repositoryId: "${GITHUB_REPO_ID}"
          categoryId: "${DISCUSSION_CATEGORY_ID}"
          title: "Challenge: ${challengeSlug}"
          body: "Discussion thread for challenge: ${challengeSlug}\\n\\n<!-- challenge-slug: ${challengeSlug} -->"
        }) {
          discussion {
            id
          }
        }
      }
    `;

    const createRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: createMutation }),
    });

    const createData = await createRes.json();
    return createData.data?.createDiscussion?.discussion?.id || null;
  } catch (err) {
    console.error('Error with GitHub Discussions:', err);
    return null;
  }
}

// Add a comment to a discussion
async function addDiscussionComment(discussionId: string, body: string): Promise<boolean> {
  if (!GITHUB_TOKEN) return false;

  const mutation = `
    mutation {
      addDiscussionComment(input: {
        discussionId: "${discussionId}"
        body: "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
      }) {
        comment {
          id
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation }),
    });

    const data = await res.json();
    return !!data.data?.addDiscussionComment?.comment?.id;
  } catch (err) {
    console.error('Error adding comment:', err);
    return false;
  }
}

// GET: Fetch comments for a challenge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 });
  }

  // Find discussion for this challenge
  const discussionId = await findOrCreateDiscussion(slug);
  if (!discussionId) {
    return NextResponse.json({ comments: [], message: 'No discussion found' });
  }

  // Fetch comments from discussion
  const query = `
    query {
      node(id: "${discussionId}") {
        ... on Discussion {
          comments(first: 50) {
            nodes {
              id
              body
              createdAt
              author {
                login
                avatarUrl
                url
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    const comments = data.data?.node?.comments?.nodes || [];

    return NextResponse.json({
      comments: comments.map((c: any) => ({
        id: c.id,
        body: c.body,
        created_at: c.createdAt,
        author: {
          login: c.author?.login || 'Unknown',
          avatar_url: c.author?.avatarUrl,
          url: c.author?.url,
        },
      })),
    });
  } catch (err: any) {
    console.error('Error fetching comments:', err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST: Add a comment to a challenge discussion
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { slug } = await params;
  const authHeader = request.headers.get('authorization');

  const auth = await authenticate(authHeader);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized. Use Bearer token (user session or agent API key)' }, { status: 401 });
  }

  // Parse request body
  const { body: commentBody } = await request.json();
  if (!commentBody?.trim()) {
    return NextResponse.json({ error: 'Comment body required' }, { status: 400 });
  }

  // Find or create discussion
  const discussionId = await findOrCreateDiscussion(slug);
  if (!discussionId) {
    return NextResponse.json({ error: 'Could not find or create discussion' }, { status: 500 });
  }

  // Format comment with attribution
  const formattedBody = auth.type === 'agent'
    ? `🤖 **${auth.name}** (Agent):\n\n${commentBody}`
    : `👤 **${auth.name}** via The Jam:\n\n${commentBody}`;

  // Add comment
  const success = await addDiscussionComment(discussionId, formattedBody);
  if (!success) {
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Comment posted to GitHub Discussion',
    author: auth.name,
    author_type: auth.type,
  });
}
