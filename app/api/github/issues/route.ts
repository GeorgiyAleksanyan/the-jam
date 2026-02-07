import { NextRequest, NextResponse } from 'next/server';

// GitHub GraphQL endpoint
const _GITHUB_API = 'https://api.github.com/graphql';
const GITHUB_REST = 'https://api.github.com';
const REPO_OWNER = 'GeorgiyAleksanyan';
const REPO_NAME = 'the-jam';

// Fallback to REST API if no token
async function fetchIssuesREST(options: {
  labels?: string;
  state?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options.labels) params.set('labels', options.labels);
  if (options.state) params.set('state', options.state);
  params.set('per_page', String(options.limit || 10));

  const url = `${GITHUB_REST}/repos/${REPO_OWNER}/${REPO_NAME}/issues?${params}`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'thejam-api',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const issues = await response.json();
  
  return issues.map((issue: any) => ({
    number: issue.number,
    title: issue.title,
    state: issue.state,
    labels: issue.labels.map((l: any) => l.name),
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    html_url: issue.html_url,
    body_preview: issue.body?.substring(0, 500) || '',
    author: issue.user?.login,
    comments: issue.comments,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const labels = searchParams.get('labels') || 'challenge';
    const state = searchParams.get('state') || 'open';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const issues = await fetchIssuesREST({ labels, state, limit });

    return NextResponse.json({ issues });
  } catch (error: any) {
    console.error('GitHub issues fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch issues: ' + error.message },
      { status: 500 }
    );
  }
}
