/**
 * GitHub Issue Comments API
 * GET: Fetch comments for an issue (public)
 * POST: Add a comment to an issue (uses user's GitHub token)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_REPO = 'GeorgiyAleksanyan/the-jam';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET: Fetch comments for an issue (public, no auth needed)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueNumber: string }> }
) {
  const { issueNumber } = await params;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        next: { revalidate: 30 },
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
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { issueNumber } = await params;

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

  // Get user's profile with GitHub token
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('username, display_name, github_username, github_access_token')
    .eq('id', user.id)
    .single();

  // Check if user has GitHub linked
  if (!profile?.github_access_token) {
    return NextResponse.json({ 
      error: 'GitHub account not linked',
      code: 'GITHUB_NOT_LINKED',
      message: 'Please sign in with GitHub to comment, or link your GitHub account in settings.'
    }, { status: 403 });
  }

  // Parse request body
  const { body } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: 'Comment body required' }, { status: 400 });
  }

  try {
    // Post comment using user's GitHub token
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${profile.github_access_token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error('GitHub API error:', res.status, error);
      
      // If token is invalid, clear it
      if (res.status === 401) {
        await supabaseAdmin
          .from('profiles')
          .update({ github_access_token: null })
          .eq('id', user.id);
        
        return NextResponse.json({ 
          error: 'GitHub token expired',
          code: 'GITHUB_TOKEN_EXPIRED',
          message: 'Please sign in with GitHub again to refresh your access.'
        }, { status: 401 });
      }
      
      // Return the actual GitHub error for debugging
      return NextResponse.json({ 
        error: 'Failed to post comment', 
        github_status: res.status,
        github_error: error 
      }, { status: res.status });
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
