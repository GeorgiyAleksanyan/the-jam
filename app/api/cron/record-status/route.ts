import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

interface ServiceCheck {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  error?: string;
}

/**
 * Cron endpoint to record health status
 * Called every 5 minutes by Vercel Cron or external service
 * 
 * GET /api/cron/record-status
 */
export async function GET(request: Request) {
  // Verify cron secret if set
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const services: Record<string, ServiceCheck> = {};
  let overallStatus: 'ok' | 'degraded' | 'error' = 'ok';

  // 1. Check Database
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const start = Date.now();
    const { error } = await supabase.from('challenges').select('id', { head: true });
    services.database = { status: error ? 'error' : 'ok', latencyMs: Date.now() - start };
    if (error) overallStatus = 'degraded';
  } catch (e: any) {
    services.database = { status: 'error', error: e.message };
    overallStatus = 'error';
  }

  // 2. Check Auth
  try {
    const start = Date.now();
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    });
    services.auth = { status: res.ok ? 'ok' : 'degraded', latencyMs: Date.now() - start };
    if (!res.ok) overallStatus = overallStatus === 'ok' ? 'degraded' : overallStatus;
  } catch (e: any) {
    services.auth = { status: 'error', error: e.message };
    overallStatus = 'error';
  }

  // 3. Check Redis
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const start = Date.now();
      await redis.ping();
      services.redis = { status: 'ok', latencyMs: Date.now() - start };
    } catch (e: any) {
      services.redis = { status: 'degraded', error: e.message };
      overallStatus = overallStatus === 'ok' ? 'degraded' : overallStatus;
    }
  }

  // 4. Check GitHub
  try {
    const start = Date.now();
    const res = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'TheJam-StatusCheck',
      },
    });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const remaining = data.resources?.core?.remaining || 0;
      services.github = { status: remaining > 100 ? 'ok' : 'degraded', latencyMs };
    } else {
      services.github = { status: 'degraded', latencyMs };
      overallStatus = overallStatus === 'ok' ? 'degraded' : overallStatus;
    }
  } catch (e: any) {
    services.github = { status: 'error', error: e.message };
    overallStatus = overallStatus === 'ok' ? 'degraded' : overallStatus;
  }

  // 5. Check Stripe
  try {
    const start = Date.now();
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    services.payments = { status: res.ok ? 'ok' : 'degraded', latencyMs: Date.now() - start };
    if (!res.ok) overallStatus = overallStatus === 'ok' ? 'degraded' : overallStatus;
  } catch (e: any) {
    services.payments = { status: 'degraded', error: e.message };
    overallStatus = overallStatus === 'ok' ? 'degraded' : overallStatus;
  }

  // 6. API is always ok if we got here
  services.api = { status: 'ok', latencyMs: 0 };

  // Store in database
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from('status_history').insert({
      overall_status: overallStatus,
      services,
    });

    if (error) {
      console.error('Failed to store status:', error);
      return NextResponse.json({ error: 'Failed to store status', details: error.message }, { status: 500 });
    }
  } catch (e: any) {
    console.error('Failed to store status:', e);
    return NextResponse.json({ error: 'Failed to store status', details: e.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    recorded_at: new Date().toISOString(),
    overall_status: overallStatus,
    services,
  });
}
