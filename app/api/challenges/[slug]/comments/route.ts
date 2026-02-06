/**
 * Challenge Comments API for Agents
 * GET: Fetch comments for a challenge (from GitHub Issues)
 * POST: Add a comment (agents use API key, humans use session)
 * 
 * Agents can use @mentions in comments - they will be rendered as GitHub mentions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_REPO = 'GeorgiyAleksanyan/the-jam';

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
  github_token?: string;
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
      .select('username, display_name, github_access_token')
      .eq('id', user.id)
      .single();
    
    const name = profile?.display_name || profile?.username || 'Anonymous';
    return { 
      type: 'user', 
      id: user.id, 
      name,
      github_token: profile?.github_access_token 
    };
  }

  return null;
}

// GET: Fetch comments for a challenge
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Get challenge to find GitHub issue number
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, title, github_issue_id')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  if (!challenge.github_issue_id) {
    return NextResponse.json({ 
      comments: [], 
      message: 'No GitHub issue linked to this challenge' 
    });
  }

  // Fetch comments from GitHub Issue
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${challenge.github_issue_id}/comments`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch from GitHub');
    }

    const data = await res.json();

    return NextResponse.json({
      challenge_id: challenge.id,
      challenge_title: challenge.title,
      github_issue: challenge.github_issue_id,
      comments: data.map((c: any) => ({
        id: c.id,
        body: c.body,
        html_url: c.html_url,
        created_at: c.created_at,
        author: {
          login: c.user?.login || 'Unknown',
          avatar_url: c.user?.avatar_url,
          html_url: c.user?.html_url,
        },
      })),
    });
  } catch (err: any) {
    console.error('Error fetching comments:', err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST: Add a comment to a challenge's GitHub Issue
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
    return NextResponse.json({ 
      error: 'Unauthorized. Use Bearer token (user session or agent API key)',
      hint: 'For agents: use your API key (jam_sk_...). For users: use Supabase access token.'
    }, { status: 401 });
  }

  // Parse request body
  const { body: commentBody, quote_reply_to } = await request.json();
  if (!commentBody?.trim()) {
    return NextResponse.json({ error: 'Comment body required' }, { status: 400 });
  }

  // Get challenge to find GitHub issue number
  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, title, github_issue_id')
    .eq('slug', slug)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  if (!challenge.github_issue_id) {
    return NextResponse.json({ 
      error: 'No GitHub issue linked to this challenge' 
    }, { status: 400 });
  }

  // Format comment with attribution for agents
  let formattedBody = commentBody;
  
  // If agent, add attribution header
  if (auth.type === 'agent') {
    formattedBody = `🤖 **${auth.name}** (Agent) commented:\n\n${commentBody}`;
  }

  // If quoting a previous comment, add blockquote
  if (quote_reply_to) {
    try {
      // Fetch the original comment to quote
      const quoteRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/issues/comments/${quote_reply_to}`,
        {
          headers: { 'Accept': 'application/vnd.github.v3+json' },
        }
      );
      
      if (quoteRes.ok) {
        const quotedComment = await quoteRes.json();
        const quotedText = quotedComment.body.split('\n').slice(0, 3).map((line: string) => `> ${line}`).join('\n');
        formattedBody = `${quotedText}\n\n@${quotedComment.user.login} ${formattedBody}`;
      }
    } catch (err) {
      console.error('Failed to fetch quoted comment:', err);
    }
  }

  // Determine which token to use
  // - For users: use their GitHub token if available
  // - For agents: use the platform's GitHub token (posts as platform account)
  const githubToken = auth.type === 'user' && auth.github_token 
    ? auth.github_token 
    : process.env.GITHUB_TOKEN;

  if (!githubToken) {
    return NextResponse.json({ 
      error: auth.type === 'user' 
        ? 'GitHub account not linked. Please sign in with GitHub.' 
        : 'GitHub token not configured for agent comments'
    }, { status: 403 });
  }

  // Post comment to GitHub
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${challenge.github_issue_id}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: formattedBody }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error('GitHub API error:', res.status, error);
      return NextResponse.json({ 
        error: 'Failed to post comment to GitHub',
        github_status: res.status,
      }, { status: res.status });
    }

    const comment = await res.json();

    return NextResponse.json({
      success: true,
      message: 'Comment posted to GitHub Issue',
      comment_id: comment.id,
      comment_url: comment.html_url,
      author: auth.name,
      author_type: auth.type,
    });
  } catch (err: any) {
    console.error('Error posting comment:', err);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
