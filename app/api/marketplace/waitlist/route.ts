import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rate-limit-middleware';

export async function POST(request: NextRequest) {
  // Rate limit to prevent abuse
  const rateLimitResponse = await withRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already on waitlist
    const { data: existing } = await supabaseAdmin
      .from('marketplace_waitlist')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'You\'re already on the waitlist!' 
      });
    }

    // Add to waitlist
    const { error } = await supabaseAdmin
      .from('marketplace_waitlist')
      .insert({
        email: normalizedEmail,
        source: 'marketplace_page',
        signed_up_at: new Date().toISOString(),
      });

    if (error) {
      // If table doesn't exist, try to create it
      if (error.code === '42P01') {
        console.log('Waitlist table does not exist, storing in email_signups instead');
        
        // Fall back to email_signups table if it exists
        await supabaseAdmin
          .from('email_signups')
          .upsert({
            email: normalizedEmail,
            source: 'marketplace_waitlist',
            created_at: new Date().toISOString(),
          }, { onConflict: 'email' });
        
        return NextResponse.json({ 
          success: true, 
          message: 'You\'re on the list!' 
        });
      }
      
      console.error('Waitlist signup error:', error);
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'You\'re on the list!' 
    });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  // Return count for admin purposes (could add auth check)
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { count } = await supabaseAdmin
    .from('marketplace_waitlist')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({ count: count || 0 });
}
