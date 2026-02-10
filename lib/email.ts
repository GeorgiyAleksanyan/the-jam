/**
 * Email Service using Gmail SMTP
 * 
 * Setup:
 * 1. Go to Google Admin Console → Security → API Controls → App Access Control
 * 2. Or use App Passwords: https://myaccount.google.com/apppasswords
 * 3. Set environment variables:
 *    - GMAIL_USER: your-email@webglo.org
 *    - GMAIL_APP_PASSWORD: your-app-password (16 chars, no spaces)
 *    - EMAIL_FROM_NAME: The Jam
 */

import nodemailer from 'nodemailer';

// Lazy-initialized transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  
  if (!user || !pass) {
    console.warn('Gmail credentials not configured');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  
  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transport = getTransporter();
  
  if (!transport) {
    console.error('Email transport not configured');
    return false;
  }
  
  const fromName = process.env.EMAIL_FROM_NAME || 'The Jam';
  const fromEmail = process.env.GMAIL_USER;
  
  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });
    
    console.log(`Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Generate verification email HTML
 */
export function generateVerificationEmail(email: string, token: string, type: string): { subject: string; html: string } {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://the-jam.webglo.org'}/api/email/verify?token=${token}`;
  const preferencesUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://the-jam.webglo.org'}/email-preferences?email=${encodeURIComponent(email)}`;
  
  const typeNames: Record<string, string> = {
    newsletter: 'newsletter',
    marketplace_waitlist: 'marketplace waitlist',
    challenge_updates: 'challenge updates',
    agent_updates: 'agent updates',
  };
  
  const typeName = typeNames[type] || type;
  
  return {
    subject: 'Confirm your subscription to The Jam',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your subscription</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; border-radius: 12px; padding: 40px; border: 1px solid #27272a;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://the-jam.webglo.org/logo.png" alt="The Jam" style="width: 60px; height: 60px;">
      <h1 style="font-size: 24px; margin: 20px 0 10px;">Confirm your subscription</h1>
    </div>
    
    <p style="color: #a1a1aa; line-height: 1.6;">
      You're subscribing to <strong style="color: #ffffff;">${typeName}</strong> from The Jam, 
      the competitive arena for AI agents.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Confirm Subscription
      </a>
    </div>
    
    <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
      If you didn't request this, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #27272a; margin: 30px 0;">
    
    <p style="color: #52525b; font-size: 12px; text-align: center;">
      <a href="${preferencesUrl}" style="color: #52525b;">Manage preferences</a> · 
      <a href="https://the-jam.webglo.org" style="color: #52525b;">The Jam</a>
    </p>
  </div>
</body>
</html>
    `,
  };
}

/**
 * Generate unsubscribe confirmation email HTML
 */
export function generateUnsubscribeEmail(email: string): { subject: string; html: string } {
  const resubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://the-jam.webglo.org'}`;
  
  return {
    subject: 'You\'ve been unsubscribed from The Jam',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; border-radius: 12px; padding: 40px; border: 1px solid #27272a;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://the-jam.webglo.org/logo.png" alt="The Jam" style="width: 60px; height: 60px;">
      <h1 style="font-size: 24px; margin: 20px 0 10px;">You've been unsubscribed</h1>
    </div>
    
    <p style="color: #a1a1aa; line-height: 1.6;">
      You will no longer receive emails from The Jam. We're sorry to see you go!
    </p>
    
    <p style="color: #a1a1aa; line-height: 1.6;">
      Changed your mind? You can always resubscribe from our website.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resubscribeUrl}" style="display: inline-block; background-color: #27272a; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Visit The Jam
      </a>
    </div>
    
    <hr style="border: none; border-top: 1px solid #27272a; margin: 30px 0;">
    
    <p style="color: #52525b; font-size: 12px; text-align: center;">
      <a href="https://the-jam.webglo.org" style="color: #52525b;">The Jam</a> · AI Agent Arena
    </p>
  </div>
</body>
</html>
    `,
  };
}

/**
 * Generate a newsletter/announcement email
 */
export function generateNewsletterEmail(
  subject: string,
  preheader: string,
  content: string,
  unsubscribeToken: string
): { subject: string; html: string } {
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://the-jam.webglo.org'}/api/email/unsubscribe?token=${unsubscribeToken}`;
  const preferencesUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://the-jam.webglo.org'}/email-preferences?token=${unsubscribeToken}`;
  
  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 40px 20px;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; padding: 40px; border: 1px solid #27272a;">
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="https://the-jam.webglo.org">
        <img src="https://the-jam.webglo.org/logo.png" alt="The Jam" style="width: 50px; height: 50px;">
      </a>
    </div>
    
    <div style="color: #e4e4e7; line-height: 1.7;">
      ${content}
    </div>
    
    <hr style="border: none; border-top: 1px solid #27272a; margin: 40px 0 20px;">
    
    <p style="color: #52525b; font-size: 12px; text-align: center; line-height: 1.6;">
      You're receiving this because you subscribed to The Jam updates.<br>
      <a href="${preferencesUrl}" style="color: #52525b;">Manage preferences</a> · 
      <a href="${unsubscribeUrl}" style="color: #52525b;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
    `,
  };
}
