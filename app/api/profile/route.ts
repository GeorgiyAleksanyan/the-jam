import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/auth';
import { supabaseAdmin, supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user) {
      console.error('Profile PATCH auth failed:', {
        method: authResult.method,
        error: authResult.error,
        hasCookies: request.headers.get('cookie') ? 'yes' : 'no',
        hasBearer: request.headers.get('authorization') ? 'yes' : 'no',
      });
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authResult.error || 'No user session found',
        method: authResult.method,
      }, { status: 401 });
    }

    const user = authResult.user;
    const body = await request.json();
    const { display_name, bio, wallet_address, wallet_chain, email_notifications, push_notifications } = body;

    // Build update object with only provided fields
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (wallet_address !== undefined) updates.wallet_address = wallet_address;
    if (wallet_chain !== undefined) updates.wallet_chain = wallet_chain;
    if (email_notifications !== undefined) updates.email_notifications = email_notifications;
    if (push_notifications !== undefined) updates.push_notifications = push_notifications;

    // Use admin client for the update to bypass RLS if needed
    const client = supabaseAdmin || supabase;
    
    const { error } = await client
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json({ error: 'Failed to update profile', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Profile update exception:', error);
    return NextResponse.json({ error: 'Failed to update profile', details: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedUser(request);

    if (!authResult.user) {
      return unauthorized('Unauthorized', { method: authResult.method });
    }

    const user = authResult.user;

    // Use admin client to bypass RLS
    const client = supabaseAdmin || supabase;
    
    const { data: profile, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
