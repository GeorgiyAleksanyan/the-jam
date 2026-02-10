import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, generateVerificationEmail } from '@/lib/email';
import { syncSubscriberToSheets } from '@/lib/sheets-sync';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Send verification email
 * POST /api/email/verify
 * Body: { email, type }
 */
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { email, type = 'newsletter' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    const { error: tokenError } = await supabaseAdmin
      .from('email_tokens')
      .upsert({
        email: normalizedEmail,
        type,
        token,
        action: 'verify',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'email,type,action',
      });

    if (tokenError) {
      console.error('Token storage error:', tokenError);
      // Continue anyway - table might not exist yet
    }

    // Send verification email
    const emailContent = generateVerificationEmail(normalizedEmail, token, type);
    const sent = await sendEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Verification email sent' });
  } catch (error) {
    console.error('Verification email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Verify email subscription
 * GET /api/email/verify?token=xxx
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/email-preferences?error=invalid_token', request.url));
  }

  if (!supabaseAdmin) {
    return NextResponse.redirect(new URL('/email-preferences?error=server_error', request.url));
  }

  try {
    // Find token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('email_tokens')
      .select('*')
      .eq('token', token)
      .eq('action', 'verify')
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.redirect(new URL('/email-preferences?error=invalid_token', request.url));
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/email-preferences?error=expired_token', request.url));
    }

    // Mark email as verified
    const { error: updateError } = await supabaseAdmin
      .from('email_signups')
      .update({ 
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('email', tokenData.email)
      .eq('signup_type', tokenData.type);

    if (updateError) {
      console.error('Verification update error:', updateError);
    }

    // Sync to Google Sheets
    syncSubscriberToSheets('verify', {
      email: tokenData.email,
      type: tokenData.type,
    }).catch(err => console.error('Sheets verify sync failed:', err));

    // Delete used token
    await supabaseAdmin
      .from('email_tokens')
      .delete()
      .eq('token', token);

    // Redirect to success page
    return NextResponse.redirect(new URL('/email-preferences?verified=true', request.url));
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.redirect(new URL('/email-preferences?error=server_error', request.url));
  }
}
