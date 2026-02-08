import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RATE_LIMITS } from '@/lib/carriers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/texting/send - Send a text message
 * 
 * This endpoint validates rate limits and records the message.
 * The actual sending is done by the agent using `gog gmail send`.
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
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Get pairing
    const { data: pairing, error: pairingError } = await supabase
      .from('phone_pairings')
      .select('*')
      .eq('agent_id', agent.id)
      .single();

    if (pairingError || !pairing) {
      return NextResponse.json({ error: 'No phone paired. Use /api/texting/pair first.' }, { status: 404 });
    }

    if (!pairing.verified) {
      return NextResponse.json({ error: 'Phone not verified. Complete verification first.' }, { status: 400 });
    }

    if (pairing.paused) {
      return NextResponse.json({ 
        error: `Texting paused: ${pairing.pause_reason}`,
        paused: true 
      }, { status: 429 });
    }

    // Reset counters if needed
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let messagesThisHour = pairing.messages_this_hour;
    let messagesToday = pairing.messages_today;

    // Reset hourly counter
    if (new Date(pairing.messages_hour_reset_at) < hourAgo) {
      messagesThisHour = 0;
    }

    // Reset daily counter
    if (pairing.messages_today_reset_at !== today) {
      messagesToday = 0;
    }

    // Check rate limits
    if (messagesThisHour >= RATE_LIMITS.MESSAGES_PER_HOUR) {
      return NextResponse.json({
        error: 'Hourly message limit reached. Try again in an hour.',
        limit: RATE_LIMITS.MESSAGES_PER_HOUR,
        current: messagesThisHour,
      }, { status: 429 });
    }

    if (messagesToday >= RATE_LIMITS.MESSAGES_PER_DAY) {
      return NextResponse.json({
        error: 'Daily message limit reached. Try again tomorrow.',
        limit: RATE_LIMITS.MESSAGES_PER_DAY,
        current: messagesToday,
      }, { status: 429 });
    }

    // Check for recent inbound (anti-spam)
    const { data: recentInbound } = await supabase
      .from('text_messages')
      .select('id')
      .eq('pairing_id', pairing.id)
      .eq('direction', 'inbound')
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    const hasRecentReply = recentInbound && recentInbound.length > 0;

    // If no recent reply and already sent several messages, pause
    if (!hasRecentReply && messagesToday >= RATE_LIMITS.MAX_UNREAD_BEFORE_PAUSE) {
      await supabase
        .from('phone_pairings')
        .update({
          paused: true,
          pause_reason: 'No reply received. Paused to avoid spam.',
        })
        .eq('id', pairing.id);

      return NextResponse.json({
        error: 'No reply from recipient. Pausing to avoid spam. Will resume when they reply.',
        paused: true,
      }, { status: 429 });
    }

    // Message length warning
    const charCount = message.length;
    const warning = charCount > RATE_LIMITS.MAX_MESSAGE_LENGTH
      ? `Message exceeds ${RATE_LIMITS.MAX_MESSAGE_LENGTH} chars. May be split into multiple SMS.`
      : null;

    // Record the outbound message
    const { error: messageError } = await supabase
      .from('text_messages')
      .insert({
        pairing_id: pairing.id,
        direction: 'outbound',
        content: message,
        char_count: charCount,
      });

    if (messageError) {
      console.error('Failed to record message:', messageError);
    }

    // Update counters
    await supabase
      .from('phone_pairings')
      .update({
        messages_this_hour: messagesThisHour + 1,
        messages_hour_reset_at: messagesThisHour === 0 ? now.toISOString() : pairing.messages_hour_reset_at,
        messages_today: messagesToday + 1,
        messages_today_reset_at: today,
        last_outbound_at: now.toISOString(),
      })
      .eq('id', pairing.id);

    return NextResponse.json({
      success: true,
      gateway_email: pairing.gateway_email,
      message_length: charCount,
      warning,
      remaining: {
        hourly: RATE_LIMITS.MESSAGES_PER_HOUR - messagesThisHour - 1,
        daily: RATE_LIMITS.MESSAGES_PER_DAY - messagesToday - 1,
      },
      instructions: `Send using gog:\n\ngog gmail send --to "${pairing.gateway_email}" --subject "" --body "${message.replace(/"/g, '\\"')}"`,
    });
  } catch (error) {
    console.error('Send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
