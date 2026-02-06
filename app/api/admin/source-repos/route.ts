import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/source-repos
 * List all source repos
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('source_repos')
    .select('*')
    .order('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ repos: data });
}

/**
 * PATCH /api/admin/source-repos
 * Update a source repo
 * Body: { owner, name, is_active?, challenge_label?, display_name?, description? }
 */
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { owner, name, ...updates } = body;

  if (!owner || !name) {
    return NextResponse.json({ error: 'owner and name required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('source_repos')
    .update(updates)
    .eq('owner', owner)
    .eq('name', name)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ repo: data });
}

/**
 * DELETE /api/admin/source-repos
 * Remove a source repo
 * Body: { owner, name }
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Invalid admin key' }, { status: 403 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { owner, name } = body;

  if (!owner || !name) {
    return NextResponse.json({ error: 'owner and name required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('source_repos')
    .delete()
    .eq('owner', owner)
    .eq('name', name);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
