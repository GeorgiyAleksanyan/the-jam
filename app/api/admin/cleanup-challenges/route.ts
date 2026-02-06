import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * One-time cleanup endpoint to fix duplicate challenges and migrate old data.
 * 
 * This endpoint:
 * 1. Finds challenges without github_issue_number
 * 2. Attempts to extract issue number from slug or match by title
 * 3. Removes duplicates (keeping the one with github_issue_number set)
 * 4. Regenerates slugs to match the new consistent format
 * 
 * Run once after deploying the sync fix, then this endpoint can be removed.
 */

// Generate slug - matches sync/webhook
function generateSlug(title: string, issueNumber: number): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/\[challenge\]\s*/i, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 40);
  return `${baseSlug}-${issueNumber}`;
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Optional: Add admin auth check here
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  try {
    const results = {
      duplicates_removed: 0,
      challenges_fixed: 0,
      errors: [] as string[],
    };

    // Get all challenges
    const { data: allChallenges, error } = await supabaseAdmin
      .from('challenges')
      .select('id, slug, title, github_issue_number, source_repo_id, created_at')
      .order('created_at', { ascending: true });

    if (error || !allChallenges) {
      return NextResponse.json({ error: error?.message || 'Failed to fetch challenges' }, { status: 500 });
    }

    // Group by github_issue_number to find duplicates
    const byIssueNumber = new Map<number, typeof allChallenges>();
    const orphans: typeof allChallenges = []; // Challenges without issue number

    for (const challenge of allChallenges) {
      if (challenge.github_issue_number) {
        const existing = byIssueNumber.get(challenge.github_issue_number) || [];
        existing.push(challenge);
        byIssueNumber.set(challenge.github_issue_number, existing);
      } else {
        // Try to extract issue number from slug (format: title-{number})
        const match = challenge.slug.match(/-(\d+)$/);
        if (match) {
          const issueNum = parseInt(match[1]);
          const existing = byIssueNumber.get(issueNum) || [];
          existing.push(challenge);
          byIssueNumber.set(issueNum, existing);
        } else {
          orphans.push(challenge);
        }
      }
    }

    // Remove duplicates - keep the oldest one (first created)
    for (const [issueNum, challenges] of byIssueNumber) {
      if (challenges.length > 1) {
        // Sort by created_at, keep first
        challenges.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const keeper = challenges[0];
        const toDelete = challenges.slice(1);

        // Update the keeper with correct slug and issue number
        const correctSlug = generateSlug(keeper.title, issueNum);
        await supabaseAdmin
          .from('challenges')
          .update({ 
            github_issue_number: issueNum,
            slug: correctSlug,
            updated_at: new Date().toISOString(),
          })
          .eq('id', keeper.id);

        // Delete duplicates
        for (const dup of toDelete) {
          // First move any submissions to the keeper
          await supabaseAdmin
            .from('submissions')
            .update({ challenge_id: keeper.id })
            .eq('challenge_id', dup.id);

          // Delete the duplicate
          await supabaseAdmin
            .from('challenges')
            .delete()
            .eq('id', dup.id);

          results.duplicates_removed++;
        }

        results.challenges_fixed++;
      } else if (challenges.length === 1 && !challenges[0].github_issue_number) {
        // Single challenge missing issue number but we extracted it from slug
        const correctSlug = generateSlug(challenges[0].title, issueNum);
        await supabaseAdmin
          .from('challenges')
          .update({ 
            github_issue_number: issueNum,
            slug: correctSlug,
            updated_at: new Date().toISOString(),
          })
          .eq('id', challenges[0].id);

        results.challenges_fixed++;
      }
    }

    // Handle orphans - challenges we couldn't match to an issue number
    // These might be manually created or very old - leave them but log
    if (orphans.length > 0) {
      results.errors.push(`${orphans.length} orphan challenges without issue numbers: ${orphans.map(o => o.slug).join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      ...results,
      orphans: orphans.map(o => ({ id: o.id, slug: o.slug, title: o.title })),
    });
  } catch (error) {
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
    warning: 'This is a one-time migration endpoint. Run once after deploying sync fixes.',
  });
}
