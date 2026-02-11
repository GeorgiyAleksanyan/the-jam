import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, description, email, url, userAgent, agentId } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Get user from session if available
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Store feedback in database
    const { data: feedback, error: dbError } = await supabase
      .from('feedback')
      .insert({
        type: type || 'general',
        title,
        description,
        email: email || null,
        url: url || null,
        user_agent: userAgent || null,
        user_id: userId,
        agent_id: agentId || null,
        status: 'new',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Feedback DB error:', dbError);
      // If table doesn't exist yet, still send email
    }

    // Send notification email
    const typeEmoji: Record<string, string> = {
      bug: '🐛',
      feature: '💡',
      general: '💬',
      agent: '🤖',
    };
    
    const emoji = typeEmoji[type] || '📬';

    try {
      await transporter.sendMail({
        from: `"The Jam Feedback" <${process.env.EMAIL_FROM_ADDRESS || 'noreply@the-jam.webglo.org'}>`,
        to: process.env.FEEDBACK_EMAIL || 'support@the-jam.webglo.org',
        replyTo: email || undefined,
        subject: `${emoji} [${type?.toUpperCase() || 'FEEDBACK'}] ${title}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #e4e4e7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border-radius: 12px; overflow: hidden;">
    <div style="padding: 20px 24px; border-bottom: 1px solid #27272a;">
      <h1 style="margin: 0; font-size: 18px; color: white;">${typeEmoji} New ${type || 'Feedback'}: ${title}</h1>
    </div>
    
    <div style="padding: 24px;">
      <div style="background-color: #27272a; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${description}</p>
      </div>
      
      <table style="width: 100%; font-size: 14px; color: #a1a1aa;">
        <tr>
          <td style="padding: 4px 0;"><strong>From:</strong></td>
          <td>${email || userId || 'Anonymous'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;"><strong>Page:</strong></td>
          <td>${url || 'N/A'}</td>
        </tr>
        ${agentId ? `<tr>
          <td style="padding: 4px 0;"><strong>Agent ID:</strong></td>
          <td>${agentId}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 4px 0;"><strong>User Agent:</strong></td>
          <td style="font-size: 12px; word-break: break-all;">${userAgent || 'N/A'}</td>
        </tr>
        ${feedback?.id ? `<tr>
          <td style="padding: 4px 0;"><strong>Ticket ID:</strong></td>
          <td>#${feedback.id}</td>
        </tr>` : ''}
      </table>
    </div>
  </div>
</body>
</html>
        `,
        text: `
New ${type || 'Feedback'}: ${title}

${description}

---
From: ${email || userId || 'Anonymous'}
Page: ${url || 'N/A'}
${agentId ? `Agent ID: ${agentId}` : ''}
User Agent: ${userAgent || 'N/A'}
${feedback?.id ? `Ticket ID: #${feedback.id}` : ''}
        `.trim(),
      });
    } catch (emailError) {
      console.error('Failed to send feedback email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      id: feedback?.id,
      message: 'Feedback submitted successfully',
    });
  } catch (error: any) {
    console.error('Feedback error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

// Get feedback (admin only)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if admin (you'd implement proper admin check here)
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
