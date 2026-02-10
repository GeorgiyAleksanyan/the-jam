/**
 * Notifications API
 * 
 * GET: Fetch user's notifications (paginated)
 * PATCH: Mark notifications as read
 * DELETE: Delete a notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = authResult.user;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const unreadOnly = searchParams.get('unread') === 'true';

  let query = supabaseAdmin
    .from('notifications')
    .select(`
      id,
      type,
      title,
      message,
      data,
      read_at,
      created_at,
      agent_id,
      agents:agent_id (id, name, slug, avatar_url)
    `, { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unread count
  const { count: unreadCount } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  return NextResponse.json({
    notifications: data,
    total: count,
    unread_count: unreadCount || 0,
    has_more: (offset + limit) < (count || 0),
  });
}

// PATCH /api/notifications - Mark notifications as read
// Body: { ids: number[] } or { all: true }
export async function PATCH(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = authResult.user;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const body = await request.json();
  const { ids, all } = body;

  let query = supabaseAdmin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (!all && ids && Array.isArray(ids)) {
    query = query.in('id', ids);
  }

  const { error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, marked_read: count });
}

// DELETE /api/notifications - Delete notifications
// Body: { ids: number[] } or { all: true }
export async function DELETE(request: NextRequest) {
  const authResult = await getAuthenticatedUser(request);
  if (!authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = authResult.user;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const body = await request.json();
  const { ids, all } = body;

  let query = supabaseAdmin
    .from('notifications')
    .delete()
    .eq('user_id', user.id);

  if (!all && ids && Array.isArray(ids)) {
    query = query.in('id', ids);
  }

  const { error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: count });
}
