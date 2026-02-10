import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Cleanup endpoint to fix duplicate challenges and migrate old data.
 * 
 * SAFEGUARD: Challenges with prize_pool > 0 (funded) are NEVER deleted or merged.
 * Their DB IDs are used as on-chain escrow IDs, so changing them would orphan funds.
 */

const GITHUB_REST = 'https://api.github.com';

// Generate slug - matches sync/webhook
function generateSlug(title: string, issueNumber: number): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/\[challenge\]\s*/i, '')
    .replace(/[^a-z0-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);
  return `${baseSlug}-${issueNumber}`;
}

// Normalize title for matching
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\[challenge\]\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export async function POST(_request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const results = {
      orphans_matched: 0,
      duplicates_removed: 0,
      challenges_updated: 0,
      funded_protected: 0,
      errors: [] as string[],
      protected_challenges: [] as string[],
    };

    // Fetch GitHub issues to build title -> issue number map
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'thejam-cleanup',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    // Get source repos
    const { data: sourceRepos } = await supabaseAdmin
      .from('source_repos')
      .select('*')
      .eq('is_active', true);

    if (!sourceRepos?.length) {
      return NextResponse.json({ error: 'No active source repos' }, { status: 400 });
    }

    // Build title -> issue mapping from all repos
    const titleToIssue = new Map<string, { number: number; state: string; sourceRepoId: number; title: string }>();

    for (const repo of sourceRepos) {
      // Fetch both open and closed issues
      for (const state of ['open', 'closed']) {
        const response = await fetch(
          `${GITHUB_REST}/repos/${repo.owner}/${repo.name}/issues?labels=${encodeURIComponent(repo.challenge_label)}&state=${state}&per_page=100`,
          { headers }
        );
        if (response.ok) {
          const issues = await response.json();
          for (const issue of issues) {
            const normalizedTitle = normalizeTitle(issue.title);
            titleToIssue.set(normalizedTitle, {
              number: issue.number,
              state: issue.state,
              sourceRepoId: repo.id,
              title: issue.title,
            });
          }
        }
      }
    }

    // Get all challenges INCLUDING prize_pool for protection check
    const { data: allChallenges } = await supabaseAdmin
      .from('challenges')
      .select('id, slug, title, github_issue_number, source_repo_id, created_at, prize_pool')
      .order('created_at', { ascending: true });

    if (!allChallenges) {
      return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });
    }

    // Group challenges by normalized title
    const byTitle = new Map<string, typeof allChallenges>();
    for (const challenge of allChallenges) {
      const normalized = normalizeTitle(challenge.title);
      const existing = byTitle.get(normalized) || [];
      existing.push(challenge);
      byTitle.set(normalized, existing);
    }

    // Process each group
    for (const [normalizedTitle, challenges] of byTitle) {
      const issueInfo = titleToIssue.get(normalizedTitle);
      
      if (!issueInfo) {
        if (challenges.some(c => !c.github_issue_number)) {
          results.errors.push(`No GitHub issue found for: ${challenges[0].title}`);
        }
        continue;
      }

      // SAFEGUARD: Find any funded challenges in this group
      const fundedChallenges = challenges.filter(c => (c.prize_pool || 0) > 0);
      
      // If multiple funded challenges exist for same title, that's a problem - log and skip
      if (fundedChallenges.length > 1) {
        results.errors.push(`Multiple funded challenges for "${challenges[0].title}" - manual intervention required`);
        for (const fc of fundedChallenges) {
          results.protected_challenges.push(`ID ${fc.id}: ${fc.title} (${fc.prize_pool} USDC)`);
        }
        results.funded_protected += fundedChallenges.length;
        continue;
      }

      // Choose keeper: prefer funded > has correct issue number > oldest
      const keeper = fundedChallenges[0] || 
                     challenges.find(c => c.github_issue_number === issueInfo.number) ||
                     challenges[0];

      // If keeper is funded, log protection
      if ((keeper.prize_pool || 0) > 0) {
        results.protected_challenges.push(`ID ${keeper.id}: ${keeper.title} (${keeper.prize_pool} USDC) - kept as keeper`);
        results.funded_protected++;
      }

      const correctSlug = generateSlug(issueInfo.title, issueInfo.number);

      // First, check for slug conflicts - but NEVER delete funded challenges
      const { data: conflicting } = await supabaseAdmin
        .from('challenges')
        .select('id, prize_pool, title')
        .eq('slug', correctSlug)
        .neq('id', keeper.id);

      if (conflicting?.length) {
        for (const conflict of conflicting) {
          // SAFEGUARD: Never delete funded challenges
          if ((conflict.prize_pool || 0) > 0) {
            results.errors.push(`Cannot delete funded challenge ID ${conflict.id} (${conflict.prize_pool} USDC) - slug conflict with keeper`);
            results.protected_challenges.push(`ID ${conflict.id}: ${conflict.title} (${conflict.prize_pool} USDC) - protected from deletion`);
            results.funded_protected++;
            continue;
          }

          // Move submissions first
          await supabaseAdmin
            .from('submissions')
            .update({ challenge_id: keeper.id })
            .eq('challenge_id', conflict.id);
          
          // Delete unfunded conflicting entry
          await supabaseAdmin
            .from('challenges')
            .delete()
            .eq('id', conflict.id);
          
          results.duplicates_removed++;
        }
      }

      // Update the keeper with correct data
      const { error: updateError } = await supabaseAdmin
        .from('challenges')
        .update({
          github_issue_number: issueInfo.number,
          source_repo_id: issueInfo.sourceRepoId,
          slug: correctSlug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', keeper.id);

      if (updateError) {
        results.errors.push(`Failed to update ${keeper.title}: ${updateError.message}`);
        continue;
      }

      if (!keeper.github_issue_number) {
        results.orphans_matched++;
      }
      results.challenges_updated++;

      // Delete remaining duplicates (same normalized title but different entries)
      const toDelete = challenges.filter(c => c.id !== keeper.id);
      for (const dup of toDelete) {
        // SAFEGUARD: Never delete funded challenges
        if ((dup.prize_pool || 0) > 0) {
          results.errors.push(`Cannot delete funded duplicate ID ${dup.id} (${dup.prize_pool} USDC)`);
          results.protected_challenges.push(`ID ${dup.id}: ${dup.title} (${dup.prize_pool} USDC) - protected duplicate`);
          results.funded_protected++;
          continue;
        }

        // Move submissions to keeper
        await supabaseAdmin
          .from('submissions')
          .update({ challenge_id: keeper.id })
          .eq('challenge_id', dup.id);

        // Delete unfunded duplicate
        await supabaseAdmin
          .from('challenges')
          .delete()
          .eq('id', dup.id);

        results.duplicates_removed++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      github_issues_found: titleToIssue.size,
      safeguard_note: 'Challenges with prize_pool > 0 are protected from deletion/merging to preserve escrow ID mapping',
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to cleanup duplicate challenges and fix data integrity',
    warning: 'This is a migration endpoint. Matches challenges to GitHub issues by title.',
    safeguard: 'Challenges with prize_pool > 0 (funded) are NEVER deleted or merged. Their DB IDs are locked.',
  });
}
