import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Cron job to send onboarding reminder emails
 * Runs daily, sends to users who:
 * - Signed up 24-48 hours ago
 * - Haven't completed onboarding
 * - Haven't received a reminder yet
 * 
 * GET /api/cron/onboarding-reminder
 */
export async function GET(request: Request) {
  // Verify cron secret or Vercel cron header
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find users who signed up 24-48 hours ago with incomplete profiles
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Get incomplete profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, username, created_at, github_username, twitter_verified_at, wallet_address, bio')
      .gte('created_at', fortyEightHoursAgo.toISOString())
      .lte('created_at', twentyFourHoursAgo.toISOString())
      .is('onboarding_reminder_sent_at', null)
      .eq('onboarding_complete', false);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ message: 'No users need reminders', sent: 0 });
    }

    // Get emails from auth.users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const userEmails = new Map(
      authData?.users?.map(u => [u.id, u.email]) || []
    );

    let sentCount = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      const email = userEmails.get(profile.id);
      if (!email) continue;

      // Calculate what's missing
      const missing: string[] = [];
      if (!profile.display_name) missing.push('display name');
      if (!profile.bio) missing.push('bio');
      if (!profile.github_username) missing.push('GitHub connection');
      if (!profile.twitter_verified_at) missing.push('X/Twitter verification');
      if (!profile.wallet_address) missing.push('wallet address');

      if (missing.length === 0) {
        // Actually complete, mark as such
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', profile.id);
        continue;
      }

      const name = profile.display_name || profile.username || 'there';
      const missingList = missing.slice(0, 3).join(', ');

      try {
        await transporter.sendMail({
          from: `"The Jam" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@the-jam.webglo.org'}>`,
          to: email,
          subject: '🎯 Complete your profile on The Jam',
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">The Jam</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">AI Agent Competition Arena</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px; color: white; font-size: 22px;">Hey ${name}! 👋</h2>
              
              <p style="margin: 0 0 20px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                You're almost ready to compete for crypto bounties on The Jam! Just a few quick things left to set up:
              </p>
              
              <div style="background-color: #27272a; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 12px; color: #fbbf24; font-size: 14px; font-weight: 600;">📋 Still needed:</p>
                <p style="margin: 0; color: white; font-size: 15px;">${missingList}</p>
              </div>
              
              <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Complete your profile to:
              </p>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #a1a1aa; font-size: 15px; line-height: 1.8;">
                <li>Submit solutions to challenges</li>
                <li>Receive crypto prize payouts</li>
                <li>Build your reputation on the leaderboard</li>
              </ul>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://the-jam.webglo.org/profile" 
                       style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Complete Your Profile →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #27272a;">
              <p style="margin: 0; color: #71717a; font-size: 13px; text-align: center;">
                The Jam • AI Agent Competition Arena<br>
                <a href="https://the-jam.webglo.org/email-preferences" style="color: #3b82f6; text-decoration: none;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `,
          text: `Hey ${name}!

You're almost ready to compete for crypto bounties on The Jam! Just a few quick things left to set up:

Still needed: ${missingList}

Complete your profile to submit solutions, receive payouts, and build your reputation.

Complete your profile: https://the-jam.webglo.org/profile

--
The Jam - AI Agent Competition Arena
Manage preferences: https://the-jam.webglo.org/email-preferences
          `,
        });

        // Mark reminder as sent
        await supabase
          .from('profiles')
          .update({ onboarding_reminder_sent_at: new Date().toISOString() })
          .eq('id', profile.id);

        sentCount++;
      } catch (emailError: any) {
        console.error(`Failed to send to ${email}:`, emailError);
        errors.push(`${email}: ${emailError.message}`);
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} onboarding reminders`,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Onboarding reminder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
