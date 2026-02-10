import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, generateUnsubscribeEmail } from '@/lib/email';
import { syncSubscriberToSheets } from '@/lib/sheets-sync';

export const dynamic = 'force-dynamic';

/**
 * Unsubscribe via token (one-click from email)
 * GET /api/email/unsubscribe?token=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const type = searchParams.get('type');

  if (!supabaseAdmin) {
    return NextResponse.redirect(new URL('/email-preferences?error=server_error', request.url));
  }

  try {
    let targetEmail = email;
    let targetType = type;

    // If token provided, look up the email/type
    if (token) {
      const { data: tokenData } = await supabaseAdmin
        .from('email_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (tokenData) {
        targetEmail = tokenData.email;
        targetType = tokenData.type;
      }
    }

    if (!targetEmail) {
      return NextResponse.redirect(new URL('/email-preferences?error=invalid_request', request.url));
    }

    // Unsubscribe
    if (targetType) {
      // Unsubscribe from specific type
      await supabaseAdmin
        .from('email_signups')
        .update({ 
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('email', targetEmail.toLowerCase())
        .eq('signup_type', targetType);
    } else {
      // Unsubscribe from all
      await supabaseAdmin
        .from('email_signups')
        .update({ 
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('email', targetEmail.toLowerCase());
    }

    // Sync to Google Sheets
    syncSubscriberToSheets('unsubscribe', {
      email: targetEmail.toLowerCase(),
      type: targetType || 'all',
    }).catch(err => console.error('Sheets unsubscribe sync failed:', err));

    // Send confirmation email
    const emailContent = generateUnsubscribeEmail(targetEmail);
    sendEmail({
      to: targetEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    }).catch(err => console.error('Unsubscribe confirmation email failed:', err));

    // Delete token if used
    if (token) {
      await supabaseAdmin
        .from('email_tokens')
        .delete()
        .eq('token', token);
    }

    // Redirect to confirmation
    return NextResponse.redirect(new URL('/email-preferences?unsubscribed=true', request.url));
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.redirect(new URL('/email-preferences?error=server_error', request.url));
  }
}

/**
 * Unsubscribe via POST (from preferences page)
 * POST /api/email/unsubscribe
 * Body: { email, type?, unsubscribeAll? }
 */
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { email, type, unsubscribeAll } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (unsubscribeAll || !type) {
      // Unsubscribe from all
      await supabaseAdmin
        .from('email_signups')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('email', normalizedEmail);
    } else {
      // Unsubscribe from specific type
      await supabaseAdmin
        .from('email_signups')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('email', normalizedEmail)
        .eq('signup_type', type);
    }

    // Sync to Sheets
    syncSubscriberToSheets('unsubscribe', {
      email: normalizedEmail,
      type: unsubscribeAll ? 'all' : type,
    }).catch(err => console.error('Sheets sync failed:', err));

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
