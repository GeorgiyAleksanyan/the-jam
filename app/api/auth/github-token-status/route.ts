/**
 * Debug endpoint to check GitHub token status for a user
 * GET /api/auth/github-token-status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Authenticate user
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's profile with GitHub token info
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, github_username, github_access_token, github_token_updated_at')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    username: profile?.username,
    github_username: profile?.github_username,
    has_github_token: !!profile?.github_access_token,
    github_token_length: profile?.github_access_token?.length || 0,
    github_token_updated_at: profile?.github_token_updated_at,
  });
}
