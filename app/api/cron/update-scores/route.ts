import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Recalculate challenge hot scores and trending scores
 * Should be called every 15-30 minutes via Vercel Cron
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Calculate hot scores for active challenges
    // Hot score = (upvotes + submissions*3 + comments) / (hours_since_created + 2)^1.5
    const { error: hotError } = await supabaseAdmin.rpc('recalc_challenge_scores');

    if (hotError) {
      // Fallback: do it inline if the function doesn't exist
      console.log('RPC failed, using inline calculation:', hotError.message);
      
      // Get active challenges
      const { data: challenges } = await supabaseAdmin
        .from('challenges')
        .select('id, upvotes, submission_count, comment_count, created_at')
        .in('status', ['open', 'funding', 'active', 'voting', 'proposed']);

      if (challenges) {
        const now = Date.now();
        
        for (const challenge of challenges) {
          const hoursOld = (now - new Date(challenge.created_at).getTime()) / (1000 * 60 * 60);
          const upvotes = challenge.upvotes || 0;
          const submissions = challenge.submission_count || 0;
          const comments = challenge.comment_count || 0;
          
          // Hot score formula
          const hotScore = (upvotes + submissions * 3 + comments) / Math.pow(hoursOld + 2, 1.5);
          
          await supabaseAdmin
            .from('challenges')
            .update({ 
              hot_score: Math.round(hotScore * 10000) / 10000,
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', challenge.id);
        }
      }
    }

    // Calculate trending scores (activity velocity)
    // Compare last 24h activity to previous 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Get recent submission counts
    const { data: recentSubmissions } = await supabaseAdmin
      .from('submissions')
      .select('challenge_id, created_at')
      .gte('created_at', twoDaysAgo);

    const { data: recentUpvotes } = await supabaseAdmin
      .from('upvotes')
      .select('challenge_id, created_at')
      .gte('created_at', twoDaysAgo);

    // Group by challenge and time period
    const activityMap = new Map<number, { last24h: number; prev24h: number }>();

    const processActivity = (items: any[] | null) => {
      if (!items) return;
      for (const item of items) {
        const id = item.challenge_id;
        if (!activityMap.has(id)) {
          activityMap.set(id, { last24h: 0, prev24h: 0 });
        }
        const entry = activityMap.get(id)!;
        if (new Date(item.created_at) >= new Date(oneDayAgo)) {
          entry.last24h++;
        } else {
          entry.prev24h++;
        }
      }
    };

    processActivity(recentSubmissions);
    processActivity(recentUpvotes);

    // Update trending scores
    for (const [challengeId, activity] of activityMap) {
      const trendingScore = activity.prev24h > 0 
        ? (activity.last24h - activity.prev24h) / activity.prev24h
        : activity.last24h; // If no previous activity, just use recent count

      await supabaseAdmin
        .from('challenges')
        .update({ trending_score: Math.round(trendingScore * 10000) / 10000 })
        .eq('id', challengeId);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      challengesUpdated: activityMap.size,
    });
  } catch (error) {
    console.error('Score calculation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// GET - Status check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'update-scores',
    description: 'Recalculates hot and trending scores for challenges',
    schedule: 'Every 15 minutes',
  });
}
