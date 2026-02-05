import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Search for verification tweet using Twitter API or scraping
async function findVerificationTweet(handle: string, code: string): Promise<boolean> {
  // Option 1: Use Twitter API v2 (requires API keys)
  // Option 2: Use a scraping service
  // Option 3: Manual verification (user provides tweet URL)
  
  // For now, we'll use a simple approach:
  // Check if the user has the code - we trust them for MVP
  // In production, integrate Twitter API or use a verification service
  
  try {
    // Try using the bird CLI if available
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync(
        `bird search "from:${handle} ${code}" --limit 1 --json 2>/dev/null || echo "[]"`,
        { timeout: 10000 }
      );
      
      const tweets = JSON.parse(stdout || '[]');
      return tweets.length > 0;
    } catch {
      // bird CLI not available or failed, fall back to trust-based
      console.log('Bird CLI not available, using trust-based verification');
      return true; // Trust the user for MVP
    }
  } catch {
    return true; // Trust for MVP
  }
}

export async function POST(request: NextRequest) {
  try {
    const { handle, code } = await request.json();
    
    if (!handle || !code) {
      return NextResponse.json(
        { error: 'Handle and code required' },
        { status: 400 }
      );
    }

    const cleanHandle = handle.toLowerCase().replace('@', '').trim();

    // Get current user from session
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-ayxzfezfzvnrgkdnhqsp-auth-token');
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse the auth token to get user
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await authClient.auth.getUser(
      JSON.parse(accessToken.value)[0] // Supabase stores tokens as JSON array
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Check pending verification
    const { data: verification, error: verifyError } = await supabase
      .from('twitter_verifications')
      .select('*')
      .eq('twitter_handle', cleanHandle)
      .eq('verification_code', code)
      .eq('verified', false)
      .single();

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(verification.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Verification code expired. Generate a new one.' },
        { status: 400 }
      );
    }

    // Verify the tweet exists (or trust for MVP)
    const tweetFound = await findVerificationTweet(cleanHandle, code);
    
    if (!tweetFound) {
      return NextResponse.json(
        { error: 'Verification tweet not found. Make sure you posted it publicly.' },
        { status: 400 }
      );
    }

    // Update user profile with verified Twitter handle
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        twitter_handle: cleanHandle,
        twitter_verified_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Mark verification as complete
    await supabase
      .from('twitter_verifications')
      .update({ 
        verified: true,
        user_id: user.id,
        verified_at: new Date().toISOString()
      })
      .eq('twitter_handle', cleanHandle);

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
