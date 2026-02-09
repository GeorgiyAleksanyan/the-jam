/**
 * Recalculate Agent Stats
 * 
 * POST: Recalculate all agent stats from source of truth (submissions, payouts)
 * GET: Get current stats for verification
 * 
 * This ensures stats are always accurate by calculating from actual data
 * rather than relying on increment/decrement operations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Verify admin auth
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-cron-secret');
  
  if (cronSecret === process.env.CRON_SECRET) return true;
  if (authHeader === `Bearer ${process.env.ADMIN_API_KEY}`) return true;
  
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const results = {
    agents_updated: 0,
    challenges_fixed: 0,
    errors: [] as string[],
  };

  try {
    // Get all agents
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('agents')
      .select('id, name, slug, total_wins, total_submissions, total_earnings');

    if (agentsError || !agents) {
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
    }

    for (const agent of agents) {
      try {
        // Count submissions
        const { count: submissionCount } = await supabaseAdmin
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id);

        // Count wins
        const { count: winCount } = await supabaseAdmin
          .from('submissions')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id)
          .eq('is_winner', true);

        // Calculate earnings from paid payouts
        const { data: payouts } = await supabaseAdmin
          .from('pending_payouts')
          .select('amount')
          .eq('agent_id', agent.id)
          .eq('status', 'paid');

        const totalEarnings = payouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // Check if update needed
        const needsUpdate = 
          agent.total_submissions !== submissionCount ||
          agent.total_wins !== winCount ||
          agent.total_earnings !== totalEarnings;

        if (needsUpdate) {
          const { error: updateError } = await supabaseAdmin
            .from('agents')
            .update({
              total_submissions: submissionCount || 0,
              total_wins: winCount || 0,
              total_earnings: totalEarnings,
              updated_at: new Date().toISOString(),
            })
            .eq('id', agent.id);

          if (updateError) {
            results.errors.push(`Agent ${agent.slug}: ${updateError.message}`);
          } else {
            results.agents_updated++;
            console.log(`Updated ${agent.name}: submissions ${agent.total_submissions}→${submissionCount}, wins ${agent.total_wins}→${winCount}, earnings ${agent.total_earnings}→${totalEarnings}`);
          }
        }
      } catch (err) {
        results.errors.push(`Agent ${agent.slug}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Fix challenges with missing winner_agent_id
    const { data: challenges } = await supabaseAdmin
      .from('challenges')
      .select('id, status, winner_agent_id')
      .eq('status', 'closed')
      .is('winner_agent_id', null);

    if (challenges) {
      for (const challenge of challenges) {
        // Check if there's a winning submission
        const { data: winningSubmission } = await supabaseAdmin
          .from('submissions')
          .select('agent_id')
          .eq('challenge_id', challenge.id)
          .eq('is_winner', true)
          .single();

        if (winningSubmission) {
          await supabaseAdmin
            .from('challenges')
            .update({ winner_agent_id: winningSubmission.agent_id })
            .eq('id', challenge.id);
          results.challenges_fixed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (err) {
    console.error('Recalc stats error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      ...results,
    }, { status: 500 });
  }
}

// GET: Preview what would be updated
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const discrepancies = [];

  // Get all agents
  const { data: agents } = await supabaseAdmin
    .from('agents')
    .select('id, name, slug, total_wins, total_submissions, total_earnings');

  if (agents) {
    for (const agent of agents) {
      // Count submissions
      const { count: submissionCount } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id);

      // Count wins
      const { count: winCount } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', agent.id)
        .eq('is_winner', true);

      // Calculate earnings from paid payouts
      const { data: payouts } = await supabaseAdmin
        .from('pending_payouts')
        .select('amount')
        .eq('agent_id', agent.id)
        .eq('status', 'paid');

      const totalEarnings = payouts?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Check for discrepancies
      if (
        agent.total_submissions !== submissionCount ||
        agent.total_wins !== winCount ||
        agent.total_earnings !== totalEarnings
      ) {
        discrepancies.push({
          agent: agent.name,
          slug: agent.slug,
          current: {
            submissions: agent.total_submissions,
            wins: agent.total_wins,
            earnings: agent.total_earnings,
          },
          actual: {
            submissions: submissionCount,
            wins: winCount,
            earnings: totalEarnings,
          },
        });
      }
    }
  }

  return NextResponse.json({
    discrepancies,
    count: discrepancies.length,
  });
}
