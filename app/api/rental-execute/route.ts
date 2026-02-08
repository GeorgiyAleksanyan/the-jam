import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Rate limiting in-memory cache (would use Redis in production)
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(keyId: number, rpm: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = `key_${keyId}`;
  const cached = rateLimitCache.get(key);

  if (!cached || cached.resetAt < now) {
    rateLimitCache.set(key, { count: 1, resetAt: now + 60000 });
    return { allowed: true, remaining: rpm - 1 };
  }

  if (cached.count >= rpm) {
    return { allowed: false, remaining: 0 };
  }

  cached.count++;
  return { allowed: true, remaining: rpm - cached.count };
}

// POST /api/rental-execute - Execute a prompt via rental API key
export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.slice(7);
    if (!apiKey.startsWith('jam_rental_sk_')) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 });
    }

    // Hash and lookup
    const keyHash = hashApiKey(apiKey);
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from('rental_api_keys')
      .select(`
        *,
        rental:rentals(
          id, status, agent_id,
          agent:agents(id, name, slug, owner_id)
        )
      `)
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !keyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Check if revoked
    if (keyRecord.revoked_at) {
      return NextResponse.json({ error: 'API key has been revoked' }, { status: 401 });
    }

    // Check if expired
    if (new Date(keyRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'API key has expired' }, { status: 401 });
    }

    // Check rental status
    const rental = keyRecord.rental;
    if (!rental || !['active', 'paid'].includes(rental.status)) {
      return NextResponse.json({ error: 'Rental is not active' }, { status: 400 });
    }

    // Check scope
    if (!keyRecord.scopes.includes('execute')) {
      return NextResponse.json({ error: 'API key lacks execute scope' }, { status: 403 });
    }

    // Check rate limit
    const rateCheck = checkRateLimit(keyRecord.id, keyRecord.rate_limit_rpm);
    if (!rateCheck.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        retry_after: 60,
      }, { 
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    // Check token limit
    if (keyRecord.token_limit && keyRecord.tokens_used >= keyRecord.token_limit) {
      return NextResponse.json({ error: 'Token limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const { prompt, max_tokens: _max_tokens } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // For now, just log and return a mock response
    // In production, this would call the actual agent execution endpoint
    const tokensUsed = Math.ceil(prompt.length / 4); // Rough estimate

    // Update usage
    await supabaseAdmin
      .from('rental_api_keys')
      .update({
        request_count: keyRecord.request_count + 1,
        tokens_used: keyRecord.tokens_used + tokensUsed,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', keyRecord.id);

    // Log the execution as a message
    await supabaseAdmin
      .from('rental_messages')
      .insert({
        rental_id: rental.id,
        sender_id: rental.renter_id || keyRecord.created_by,
        sender_type: 'renter',
        content: `[API] ${prompt.slice(0, 200)}${prompt.length > 200 ? '...' : ''}`,
        message_type: 'api_request',
        metadata: {
          key_id: keyRecord.id,
          tokens: tokensUsed,
        },
      });

    logger.info(`Rental ${rental.id} API execute: ${tokensUsed} tokens`);

    // In production, actually call the agent here
    // For now, return a placeholder
    return NextResponse.json({
      id: crypto.randomUUID(),
      rental_id: rental.id,
      agent: agent?.name,
      prompt: prompt.slice(0, 100),
      response: `[Agent ${agent?.name} would process: "${prompt.slice(0, 50)}..."]`,
      tokens_used: tokensUsed,
      tokens_remaining: keyRecord.token_limit 
        ? keyRecord.token_limit - keyRecord.tokens_used - tokensUsed 
        : null,
      rate_limit_remaining: rateCheck.remaining,
    });
  } catch (error: any) {
    logger.error('Rental execute error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
