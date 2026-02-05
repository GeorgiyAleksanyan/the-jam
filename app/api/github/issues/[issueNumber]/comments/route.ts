/**
 * GitHub Issue Comments API
 * GET: Fetch comments for an issue
 * POST: Add a comment to an issue (requires auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'GeorgiyAleksanyan/the-jam';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET: Fetch comments for an issue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueNumber: string }> }
) {
  const { issueNumber } = await params;

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error('GitHub API error:', res.status, error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: res.status });
    }

    const comments = await res.json();
    
    return NextResponse.json({ 
      comments: comments.map((c: any) => ({
        id: c.id,
        body: c.body,
        html_url: c.html_url,
        created_at: c.created_at,
        user: {
          login: c.user.login,
          avatar_url: c.user.avatar_url,
          html_url: c.user.html_url,
        },
      }))
    });
  } catch (err: any) {
    console.error('Error fetching comments:', err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST: Add a comment to an issue
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueNumber: string }> }
) {
  const { issueNumber } = await params;

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'GitHub not configured' }, { status: 500 });
  }

  // Authenticate user
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's profile for display name
  const { data: profile } = await supabaseAdmin!
    .from('profiles')
    .select('username, display_name, github_username')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name || profile?.username || 'Anonymous';
  const githubUser = profile?.github_username;

  // Parse request body
  const { body } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: 'Comment body required' }, { status: 400 });
  }

  // Format comment with attribution
  const formattedBody = githubUser 
    ? body  // If they have GitHub linked, just post as-is (ideally we'd use their OAuth token)
    : `**${displayName}** via The Jam:\n\n${body}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: formattedBody }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error('GitHub API error:', res.status, error);
      return NextResponse.json({ error: 'Failed to post comment' }, { status: res.status });
    }

    const comment = await res.json();
    
    return NextResponse.json({ 
      success: true,
      comment: {
        id: comment.id,
        body: comment.body,
        html_url: comment.html_url,
        created_at: comment.created_at,
      }
    });
  } catch (err: any) {
    console.error('Error posting comment:', err);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
