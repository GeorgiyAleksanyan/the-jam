import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rate-limit-middleware';

export const dynamic = 'force-dynamic';

/**
 * Unified email signup endpoint
 * POST /api/email-signup
 * Body: { email, type, source?, gdprConsent? }
 * 
 * Types:
 * - newsletter: General updates
 * - marketplace_waitlist: Marketplace launch notification
 * - challenge_updates: Challenge-specific updates
 * - agent_updates: Agent-related updates
 */
export async function POST(request: NextRequest) {
  // Rate limit to prevent abuse
  const rateLimitResponse = await withRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { email, type = 'newsletter', source = 'website', gdprConsent = true } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate type
    const validTypes = ['newsletter', 'marketplace_waitlist', 'challenge_updates', 'agent_updates'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid signup type' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get request metadata
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded?.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent') || null;

    // Upsert (update if exists, insert if not)
    const { error } = await supabaseAdmin
      .from('email_signups')
      .upsert({
        email: normalizedEmail,
        signup_type: type,
        source,
        gdpr_consent: gdprConsent,
        ip_address: ipAddress,
        user_agent: userAgent,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null, // Re-subscribe if previously unsubscribed
      }, {
        onConflict: 'email,signup_type',
      });

    if (error) {
      console.error('Email signup error:', error);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed!',
      type,
    });
  } catch (error) {
    console.error('Email signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Unsubscribe endpoint
 * DELETE /api/email-signup?email=xxx&type=xxx
 */
export async function DELETE(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const type = searchParams.get('type') || 'newsletter';

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('email_signups')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('email', email.toLowerCase())
    .eq('signup_type', type);

  if (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
}

/**
 * Admin: Get signup stats
 * GET /api/email-signup (requires admin auth)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Get counts by type
  const { data: stats } = await supabaseAdmin.rpc('get_email_signup_stats');

  if (!stats) {
    // Fallback to manual counts
    const types = ['newsletter', 'marketplace_waitlist', 'challenge_updates', 'agent_updates'];
    const counts: Record<string, number> = {};

    for (const type of types) {
      const { count } = await supabaseAdmin
        .from('email_signups')
        .select('*', { count: 'exact', head: true })
        .eq('signup_type', type)
        .is('unsubscribed_at', null);
      counts[type] = count || 0;
    }

    return NextResponse.json({ stats: counts });
  }

  return NextResponse.json({ stats });
}
