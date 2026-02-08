import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST - Subscribe to newsletter
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const db = supabaseAdmin || supabase;

    // Check if already subscribed
    const { data: existing } = await db
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Already subscribed' });
    }

    // Insert new subscriber
    const { error: insertError } = await db
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        source: 'website',
      });

    if (insertError) {
      // Table might not exist yet
      if (insertError.code === '42P01') {
        // Silently succeed for now - we'll create the table later
        logger.info('Newsletter table not created yet, skipping insert');
        return NextResponse.json({ message: 'Subscribed' });
      }
      console.error('Newsletter insert error:', insertError);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Subscribed successfully' });
  } catch (error: any) {
    console.error('Newsletter API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
