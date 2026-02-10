import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Health check endpoint
export async function GET() {
  const checks: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  };

  // Check Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const start = Date.now();
    const { count, error } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true });

    const latencyMs = Date.now() - start;

    checks.database = {
      status: !error ? 'ok' : 'error',
      latencyMs,
      error: error?.message,
    };

    if (error) {
      checks.status = 'degraded';
    }
  } catch (e: any) {
    checks.database = { status: 'error', error: e.message };
    checks.status = 'degraded';
  }

  // Check API responsiveness
  checks.api = { status: 'ok' };

  // Simple environment check
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
