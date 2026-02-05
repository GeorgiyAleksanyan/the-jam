import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Health check and auth status endpoint for debugging
export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  // Check Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { count, error } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true });

    checks.supabase = {
      connected: !error,
      agents_count: count ?? 0,
      error: error?.message,
    };
  } catch (e: any) {
    checks.supabase = { connected: false, error: e.message };
  }

  // Check environment variables (existence only, not values)
  checks.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    GITHUB_TOKEN: !!process.env.GITHUB_TOKEN,
  };

  // Auth provider hints
  checks.auth_providers = {
    github: 'Configure in Supabase Dashboard > Authentication > Providers > GitHub',
    email: 'Enabled by default',
    callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://the-jam.webglo.org'}/auth/callback`,
  };

  return NextResponse.json(checks);
}
