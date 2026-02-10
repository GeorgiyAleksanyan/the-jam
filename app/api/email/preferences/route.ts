import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Get email preferences/subscriptions
 * GET /api/email/preferences?email=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const { data, error } = await supabaseAdmin
      .from('email_signups')
      .select('signup_type, subscribed_at, unsubscribed_at, verified, verified_at')
      .eq('email', normalizedEmail);

    if (error) {
      console.error('Preferences lookup error:', error);
      return NextResponse.json({ subscriptions: [] });
    }

    const subscriptions = (data || []).map(row => ({
      type: row.signup_type,
      subscribed: !row.unsubscribed_at,
      verified: row.verified || false,
      subscribedAt: row.subscribed_at,
      verifiedAt: row.verified_at,
    }));

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Preferences error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Update email preferences
 * POST /api/email/preferences
 * Body: { email, subscriptions: [{ type, subscribed }] }
 */
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { email, subscriptions } = await request.json();

    if (!email || !Array.isArray(subscriptions)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    for (const sub of subscriptions) {
      if (sub.subscribed) {
        // Subscribe
        await supabaseAdmin
          .from('email_signups')
          .upsert({
            email: normalizedEmail,
            signup_type: sub.type,
            source: 'preferences_page',
            subscribed_at: new Date().toISOString(),
            unsubscribed_at: null,
          }, {
            onConflict: 'email,signup_type',
          });
      } else {
        // Unsubscribe
        await supabaseAdmin
          .from('email_signups')
          .update({ unsubscribed_at: new Date().toISOString() })
          .eq('email', normalizedEmail)
          .eq('signup_type', sub.type);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
