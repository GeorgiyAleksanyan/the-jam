import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

interface ServiceCheck {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  error?: string;
}

// Health check endpoint
export async function GET() {
  const checks: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {} as Record<string, ServiceCheck>,
  };

  let hasError = false;
  let hasDegraded = false;

  // 1. Check Supabase Database
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const start = Date.now();
    const { error } = await supabase
      .from('challenges')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - start;

    checks.services.database = {
      status: !error ? 'ok' : 'error',
      latencyMs,
      error: error?.message,
    };

    if (error) hasDegraded = true;
  } catch (e: any) {
    checks.services.database = { status: 'error', error: e.message };
    hasError = true;
  }

  // 2. Check Supabase Auth
  try {
    const start = Date.now();
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    });
    const latencyMs = Date.now() - start;

    checks.services.auth = {
      status: response.ok ? 'ok' : 'degraded',
      latencyMs,
    };

    if (!response.ok) hasDegraded = true;
  } catch (e: any) {
    checks.services.auth = { status: 'error', error: e.message };
    hasError = true;
  }

  // 3. Check Upstash Redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const start = Date.now();
      await redis.ping();
      const latencyMs = Date.now() - start;

      checks.services.redis = {
        status: 'ok',
        latencyMs,
      };
    } catch (e: any) {
      checks.services.redis = { status: 'error', error: e.message };
      hasDegraded = true; // Redis is non-critical, just degrades rate limiting
    }
  } else {
    checks.services.redis = { status: 'degraded', error: 'Not configured' };
    hasDegraded = true;
  }

  // 4. Check GitHub API
  try {
    const start = Date.now();
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TheJam-HealthCheck',
      },
    });
    const latencyMs = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      const remaining = data.resources?.core?.remaining || 0;
      
      checks.services.github = {
        status: remaining > 100 ? 'ok' : 'degraded',
        latencyMs,
        rateLimit: {
          remaining,
          limit: data.resources?.core?.limit || 5000,
        },
      };

      if (remaining <= 100) hasDegraded = true;
    } else {
      checks.services.github = { status: 'degraded', latencyMs };
      hasDegraded = true;
    }
  } catch (e: any) {
    checks.services.github = { status: 'error', error: e.message };
    hasDegraded = true;
  }

  // 5. Check Stripe (just connectivity)
  try {
    const start = Date.now();
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    });
    const latencyMs = Date.now() - start;

    checks.services.payments = {
      status: response.ok ? 'ok' : 'degraded',
      latencyMs,
    };

    if (!response.ok) hasDegraded = true;
  } catch (e: any) {
    checks.services.payments = { status: 'error', error: e.message };
    hasDegraded = true;
  }

  // 6. API is always ok if we got here
  checks.services.api = { status: 'ok', latencyMs: 0 };

  // Determine overall status
  if (hasError) {
    checks.status = 'error';
  } else if (hasDegraded) {
    checks.status = 'degraded';
  }

  checks.environment = process.env.NODE_ENV;

  // Return appropriate status code
  const httpStatus = checks.status === 'ok' ? 200 : 503;
  
  return NextResponse.json(checks, { 
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  });
}
