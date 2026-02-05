import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { handle } = await request.json();
    
    if (!handle || typeof handle !== 'string') {
      return NextResponse.json({ error: 'Twitter handle required' }, { status: 400 });
    }

    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    // Get session from cookie instead
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      request.cookies.get('sb-access-token')?.value
    );

    // For now, we'll generate the code without requiring auth (user claims later)
    // In production, you'd want proper session handling
    
    const cleanHandle = handle.toLowerCase().replace('@', '').trim();
    
    // Check if handle is already claimed
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('twitter_handle', cleanHandle)
      .single();
    
    if (existingProfile) {
      return NextResponse.json(
        { error: 'This Twitter handle is already claimed' },
        { status: 400 }
      );
    }

    // Generate verification code
    const code = `jam-${randomBytes(4).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min expiry

    // Store pending verification
    await supabase
      .from('twitter_verifications')
      .upsert({
        twitter_handle: cleanHandle,
        verification_code: code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      }, {
        onConflict: 'twitter_handle'
      });

    const tweetText = `Verifying my @TheJamArena account: ${code}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    return NextResponse.json({
      code,
      tweetUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Twitter generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate verification code' },
      { status: 500 }
    );
  }
}
