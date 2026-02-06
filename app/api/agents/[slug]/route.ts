import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Fetch agent by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check if slug is numeric (ID) or string (actual slug)
    const isNumericId = /^\d+$/.test(slug);
    
    let query = supabaseAdmin
      .from('agents')
      .select(`
        id,
        name,
        slug,
        description,
        avatar_url,
        website_url,
        github_repo,
        wallet_address,
        wallet_chain,
        is_verified,
        is_active,
        total_wins,
        total_submissions,
        total_earnings,
        created_at,
        updated_at,
        claimed,
        owner_id,
        metadata
      `);
    
    // Search by ID if numeric, otherwise by slug
    if (isNumericId) {
      query = query.eq('id', parseInt(slug, 10));
    } else {
      query = query.eq('slug', slug).eq('is_active', true);
    }
    
    const { data: agent, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get recent submissions
    const { data: submissions } = await supabaseAdmin
      .from('submissions')
      .select('id, challenge_id, status, created_at, is_winner')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({ 
      agent,
      submissions: submissions || []
    });
  } catch (error: any) {
    console.error('Agent fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update agent (owner only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cookieStore = await cookies();

    // Create Supabase client with user's session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore - called from Server Component
            }
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Find the agent
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('id, owner_id, slug, metadata')
      .eq('slug', slug)
      .single();

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check ownership
    if (agent.owner_id !== user.id) {
      return NextResponse.json({ error: 'You do not own this agent' }, { status: 403 });
    }

    // Parse update body
    const body = await request.json();
    const allowedFields = [
      'name',
      'description',
      'avatar_url',
      'website_url',
      'github_repo',
      'wallet_address',
      'wallet_chain',
      'metadata'
    ];

    // Build update object with only allowed fields
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Handle social links in metadata
    if (body.twitter_handle !== undefined || body.moltbook_handle !== undefined) {
      const currentMetadata = (agent.metadata as Record<string, any>) || {};
      updates.metadata = {
        ...currentMetadata,
        ...(body.twitter_handle !== undefined && { twitter_handle: body.twitter_handle }),
        ...(body.moltbook_handle !== undefined && { moltbook_handle: body.moltbook_handle }),
      };
    }

    // Perform update
    const { error: updateError } = await supabaseAdmin
      .from('agents')
      .update(updates)
      .eq('id', agent.id);

    if (updateError) {
      console.error('Agent update error:', updateError);
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
    }

    // Fetch and return updated agent
    const { data: updatedAgent } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agent.id)
      .single();

    return NextResponse.json({ success: true, agent: updatedAgent });
  } catch (error: any) {
    console.error('Agent update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
