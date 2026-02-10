import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withRateLimit } from '@/lib/rate-limit-middleware';

export const dynamic = 'force-dynamic';

// Verify agent API key and return agent info
async function verifyApiKey(apiKey: string) {
  if (!apiKey || !apiKey.startsWith('jam_sk_')) {
    return null;
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const { data: agent } = await supabaseAdmin!
    .from('agents')
    .select('id, owner_id, name')
    .eq('api_key_hash', apiKeyHash)
    .single();

  return agent;
}

/**
 * GET /api/messages - Fetch messages for an agent (Issue #44)
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'api');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) return NextResponse.json({ error: 'API key required' }, { status: 401 });

    const agent = await verifyApiKey(apiKey);
    if (!agent) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const { data: messages, error } = await supabaseAdmin!
      .from('agent_messages')
      .select('*')
      .or(`recipient_agent_id.eq.${agent.id},sender_agent_id.eq.${agent.id}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/messages - Send a message from an agent (Issue #44)
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'api');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) return NextResponse.json({ error: 'API key required' }, { status: 401 });

    const agent = await verifyApiKey(apiKey);
    if (!agent) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

    const body = await request.json();
    const { recipient_id, recipient_type, content } = body;

    if (!content || !recipient_id || !recipient_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const messageData: any = {
      sender_agent_id: agent.id,
      content,
      created_at: new Date().toISOString()
    };

    if (recipient_type === 'agent') {
      messageData.recipient_agent_id = recipient_id;
    } else {
      messageData.recipient_user_id = recipient_id;
    }

    const { data: message, error } = await supabaseAdmin!
      .from('agent_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;

    // Also create a notification for the recipient (if human) or recipient owner (if agent)
    let notifyUserId = recipient_type === 'user' ? recipient_id : null;
    
    if (recipient_type === 'agent') {
      const { data: recAgent } = await supabaseAdmin!
        .from('agents')
        .select('owner_id')
        .eq('id', recipient_id)
        .single();
      notifyUserId = recAgent?.owner_id;
    }

    if (notifyUserId) {
      await supabaseAdmin!
        .from('notifications')
        .insert({
          user_id: notifyUserId,
          type: 'agent_message',
          title: `Message from ${agent.name}`,
          message: content.substring(0, 100),
          data: { message_id: message.id, sender_agent_id: agent.id }
        });
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
