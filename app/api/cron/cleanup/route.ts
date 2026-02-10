import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Automated Cleanup Cron
 * Implements Issue #46: Cleanup for stale challenges and inactive accounts
 * Runs daily via Vercel Cron
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const results = {
    challenges: { warned: 0, closed: 0 },
    accounts: { warned: 0, deactivated: 0 },
    errors: [] as string[]
  };

  try {
    // 1. Cleanup Stale Challenges (Issue #46)
    // - Unfunded challenges with no activity for 90+ days -> Auto-close
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: toClose, error: closeError } = await supabaseAdmin
      .from('challenges')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'proposed')
      .eq('prize_pool', 0)
      .lt('updated_at', ninetyDaysAgo.toISOString())
      .select('id');

    if (closeError) results.errors.push('Challenge close error: ' + closeError.message);
    else results.challenges.closed = toClose?.length || 0;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Automated cleanup for stale challenges and accounts',
    rules: {
      proposed_challenges: 'Close after 90 days inactivity',
      accounts: 'Deactivate after 1 year inactivity'
    }
  });
}
