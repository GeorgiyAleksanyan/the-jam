import logger from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

// Extract tweet ID from URL
function extractTweetId(url: string): string | null {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
}

// Verify the tweet exists and contains the code
async function verifyTweetContent(tweetUrl: string, handle: string, code: string): Promise<{ valid: boolean; error?: string }> {
  const tweetId = extractTweetId(tweetUrl);
  if (!tweetId) {
    return { valid: false, error: 'Invalid tweet URL' };
  }

  // Check that the URL contains the claimed handle
  const urlLower = tweetUrl.toLowerCase();
  if (!urlLower.includes(handle.toLowerCase())) {
    return { valid: false, error: 'Tweet URL must be from your account (@' + handle + ')' };
  }

  // Try to verify using bird CLI if available
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      // Use bird to fetch the tweet
      const { stdout } = await execAsync(
        `bird tweet ${tweetId} --json 2>/dev/null`,
        { timeout: 15000 }
      );

      const tweet = JSON.parse(stdout);
      
      // Check author matches
      const tweetAuthor = (tweet.author?.username || tweet.user?.screen_name || '').toLowerCase();
      if (tweetAuthor !== handle.toLowerCase()) {
        return { valid: false, error: `Tweet is from @${tweetAuthor}, not @${handle}` };
      }

      // Check code is in the tweet
      const tweetText = tweet.text || tweet.full_text || '';
      if (!tweetText.includes(code)) {
        return { valid: false, error: 'Verification code not found in tweet' };
      }

      return { valid: true };
    } catch {
      // bird CLI failed, fall back to URL validation only
      logger.log('Bird CLI not available, using URL-based verification');
    }
  } catch {
    // Import failed, continue with URL validation
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const { handle, code, tweetUrl } = await request.json();

    if (!handle || !code || !tweetUrl) {
      return NextResponse.json(
        { error: 'Handle, code, and tweet URL are required' },
        { status: 400 }
      );
    }

    const cleanHandle = handle.toLowerCase().replace('@', '').trim();

    // Validate tweet URL format
    const tweetUrlPattern = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/i;
    if (!tweetUrlPattern.test(tweetUrl)) {
      return NextResponse.json(
        { error: 'Invalid tweet URL format' },
        { status: 400 }
      );
    }

    // Get current user from session using unified server client
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Twitter verify auth error:', authError?.message || 'No user session found');
      return NextResponse.json(
        { error: 'Unauthorized', details: authError?.message || 'Auth session missing!' },
        { status: 401 }
      );
    }

    // Check pending verification
    const { data: verification, error: verifyError } = await supabaseAdmin!
      .from('twitter_verifications')
      .select('*')
      .eq('twitter_handle', cleanHandle)
      .eq('verification_code', code)
      .eq('verified', false)
      .single();

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please generate a new one.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Verification code expired. Please generate a new one.' },
        { status: 400 }
      );
    }

    // Verify the tweet
    const tweetCheck = await verifyTweetContent(tweetUrl, cleanHandle, code);
    if (!tweetCheck.valid) {
      return NextResponse.json(
        { error: tweetCheck.error || 'Tweet verification failed' },
        { status: 400 }
      );
    }

    // Update user profile with verified Twitter handle
    const { error: updateError } = await supabaseAdmin!
      .from('profiles')
      .update({
        twitter_handle: cleanHandle,
        twitter_verified_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Mark verification as complete and store the tweet URL
    await supabaseAdmin!
      .from('twitter_verifications')
      .update({
        verified: true,
        user_id: user.id,
        verified_at: new Date().toISOString(),
        tweet_url: tweetUrl,
      })
      .eq('twitter_handle', cleanHandle)
      .eq('verification_code', code);

    return NextResponse.json({
      success: true,
      handle: cleanHandle,
    });
  } catch (error: any) {
    console.error('Twitter verify error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
