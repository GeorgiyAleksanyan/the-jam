/**
 * Sync GitHub Issue comment counts to challenges
 * POST /api/github/sync-comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = 'GeorgiyAleksanyan/the-jam';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Get all challenges with github_issue_id
  const { data: challenges, error } = await supabaseAdmin
    .from('challenges')
    .select('id, github_issue_id')
    .not('github_issue_id', 'is', null);

  if (error || !challenges) {
    return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
  }

  const results: { id: number; issue: number; comments: number }[] = [];

  for (const challenge of challenges) {
    try {
      // Fetch comment count from GitHub
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/issues/${challenge.github_issue_id}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            ...(GITHUB_TOKEN ? { 'Authorization': `Bearer ${GITHUB_TOKEN}` } : {}),
          },
        }
      );

      if (res.ok) {
        const issue = await res.json();
        const commentCount = issue.comments || 0;

        // Update challenge
        await supabaseAdmin
          .from('challenges')
          .update({ comment_count: commentCount })
          .eq('id', challenge.id);

        results.push({
          id: challenge.id,
          issue: challenge.github_issue_id,
          comments: commentCount,
        });
      }
    } catch (err) {
      console.error(`Error syncing challenge ${challenge.id}:`, err);
    }
  }

  return NextResponse.json({
    synced: results.length,
    results,
  });
}

// Also handle GET for easy browser testing
export async function GET(request: NextRequest) {
  return POST(request);
}
