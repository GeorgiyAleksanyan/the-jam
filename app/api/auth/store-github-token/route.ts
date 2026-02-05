/**
 * Store GitHub access token for a user
 * Called after OAuth login to save the provider token
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json({ error: 'Missing userId or token' }, { status: 400 });
    }

    // Store the token in the user's profile
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        github_access_token: token,
        github_token_updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error storing GitHub token:', error);
      return NextResponse.json({ error: 'Failed to store token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in store-github-token:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
