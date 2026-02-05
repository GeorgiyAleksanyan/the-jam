import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const GITHUB_REST = 'https://api.github.com';
const REPO_OWNER = 'GeorgiyAleksanyan';
const REPO_NAME = 'the-jam';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: string;
  labels: { name: string }[];
  created_at: string;
  updated_at: string;
  html_url: string;
  user: { login: string };
}

function parseChallengeMeta(body: string): {
  bounty: number;
  difficulty: string;
  topics: string[];
  deadline: string | null;
  shortDescription: string;
  description: string;
} {
  const lines = body.split('\n');
  let bounty = 0;
  let difficulty = 'easy';
  let topics: string[] = [];
  let deadline: string | null = null;
  let shortDescription = '';
  let inDescription = false;
  let descriptionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Parse metadata fields
    if (trimmed.startsWith('**Bounty:**')) {
      const match = trimmed.match(/\$?([\d.]+)/);
      if (match) bounty = parseFloat(match[1]);
    } else if (trimmed.startsWith('**Difficulty:**')) {
      const d = trimmed.replace('**Difficulty:**', '').trim().toLowerCase();
      if (['easy', 'medium', 'hard', 'legendary'].includes(d)) {
        difficulty = d;
      }
    } else if (trimmed.startsWith('**Topics:**')) {
      const t = trimmed.replace('**Topics:**', '').trim();
      topics = t.split(',').map(s => s.trim()).filter(Boolean);
    } else if (trimmed.startsWith('**Deadline:**')) {
      const d = trimmed.replace('**Deadline:**', '').trim();
      if (d && d !== 'None' && d !== 'TBD') {
        deadline = d;
      }
    } else if (trimmed.startsWith('## Description')) {
      inDescription = true;
    } else if (trimmed.startsWith('## ') && inDescription) {
      inDescription = false;
    } else if (inDescription && trimmed) {
      descriptionLines.push(line);
    }
  }

  const description = descriptionLines.join('\n').trim();
  shortDescription = description.split('\n')[0]?.substring(0, 200) || '';

  return { bounty, difficulty, topics, deadline, shortDescription, description };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[challenge\]\s*/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    // Optional: Add auth check for manual triggers
    // For now, allow unauthenticated sync for simplicity
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'thejam-sync',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch all challenge issues
    const response = await fetch(
      `${GITHUB_REST}/repos/${REPO_OWNER}/${REPO_NAME}/issues?labels=challenge&state=open&per_page=100`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const issues: GitHubIssue[] = await response.json();
    
    const results = {
      synced: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const issue of issues) {
      try {
        const title = issue.title.replace(/^\[Challenge\]\s*/i, '').trim();
        const slug = slugify(issue.title);
        const meta = parseChallengeMeta(issue.body || '');
        
        // Determine status from labels
        let status = 'open';
        for (const label of issue.labels) {
          if (label.name === 'active') status = 'active';
          if (label.name === 'voting') status = 'voting';
          if (label.name === 'completed') status = 'completed';
        }

        // Check if challenge exists (by github_issue_id)
        const { data: existing } = await supabaseAdmin
          .from('challenges')
          .select('id')
          .eq('github_issue_id', issue.number)
          .single();

        const challengeData = {
          title,
          slug,
          short_description: meta.shortDescription,
          description: meta.description || issue.body || '',
          difficulty: meta.difficulty,
          status,
          prize_pool: meta.bounty,
          github_issue_id: issue.number,
          github_issue_url: issue.html_url,
          github_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing
          const { error } = await supabaseAdmin
            .from('challenges')
            .update(challengeData)
            .eq('id', existing.id);

          if (error) throw error;
          results.updated++;
        } else {
          // Insert new - need to handle slug conflicts
          let finalSlug = slug;
          let attempt = 0;
          let inserted = false;

          while (!inserted && attempt < 5) {
            const { error } = await supabaseAdmin
              .from('challenges')
              .insert({
                ...challengeData,
                slug: finalSlug,
                created_at: issue.created_at,
              });

            if (error) {
              if (error.code === '23505' && error.message.includes('slug')) {
                // Slug conflict - add suffix
                attempt++;
                finalSlug = `${slug}-${attempt}`;
              } else {
                throw error;
              }
            } else {
              inserted = true;
              results.synced++;
            }
          }
        }
      } catch (err: any) {
        results.errors.push(`Issue #${issue.number}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      issues_found: issues.length,
      ...results,
    });
  } catch (error: any) {
    console.error('GitHub sync error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to sync GitHub challenge issues to the database',
  });
}
