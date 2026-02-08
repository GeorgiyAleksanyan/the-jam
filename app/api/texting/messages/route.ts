import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/texting/messages - Get text message history
 * 
 * Query params:
 * - since: ISO timestamp or duration (1h, 24h, 7d)
 * - limit: max messages (default 50)
 * - direction: inbound | outbound | all (default all)
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get pairing
    const { data: pairing } = await supabase
      .from('phone_pairings')
      .select('id, verified, phone, gateway_email')
      .eq('agent_id', agent.id)
      .single();

    if (!pairing) {
      return NextResponse.json({ error: 'No phone paired' }, { status: 404 });
    }

    const url = new URL(request.url);
    const since = url.searchParams.get('since') || '24h';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const direction = url.searchParams.get('direction') || 'all';

    // Parse since parameter
    let sinceDate: Date;
    if (since.match(/^\d+h$/)) {
      const hours = parseInt(since);
      sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    } else if (since.match(/^\d+d$/)) {
      const days = parseInt(since);
      sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    } else {
      sinceDate = new Date(since);
    }

    // Build query
    let query = supabase
      .from('text_messages')
      .select('*')
      .eq('pairing_id', pairing.id)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (direction !== 'all') {
      query = query.eq('direction', direction);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({
      phone: pairing.phone,
      gateway_email: pairing.gateway_email,
      messages: messages?.map(m => ({
        id: m.id,
        direction: m.direction,
        content: m.content,
        created_at: m.created_at,
      })) || [],
      count: messages?.length || 0,
      since: sinceDate.toISOString(),
    });
  } catch (error) {
    console.error('Messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/texting/messages - Record an inbound message
 * 
 * Called by agent after polling Gmail for replies.
 * Helps track conversation and unpause if needed.
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (!agent) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const { content, gmail_message_id } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }

    // Get pairing
    const { data: pairing } = await supabase
      .from('phone_pairings')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    if (!pairing) {
      return NextResponse.json({ error: 'No phone paired' }, { status: 404 });
    }

    // Check for duplicate (by gmail_message_id)
    if (gmail_message_id) {
      const { data: existing } = await supabase
        .from('text_messages')
        .select('id')
        .eq('gmail_message_id', gmail_message_id)
        .single();

      if (existing) {
        return NextResponse.json({ 
          success: true, 
          duplicate: true,
          message: 'Message already recorded' 
        });
      }
    }

    // Record inbound message
    const { error: insertError } = await supabase
      .from('text_messages')
      .insert({
        pairing_id: pairing.id,
        direction: 'inbound',
        content,
        gmail_message_id,
        char_count: content.length,
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to record message' }, { status: 500 });
    }

    // Update pairing - unpause if was paused, update last_inbound
    await supabase
      .from('phone_pairings')
      .update({
        last_inbound_at: new Date().toISOString(),
        paused: false,
        pause_reason: null,
      })
      .eq('id', pairing.id);

    return NextResponse.json({
      success: true,
      message: 'Inbound message recorded',
      unpaused: pairing.paused, // Was it paused before?
    });
  } catch (error) {
    console.error('Record inbound error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
