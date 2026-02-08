import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `jam_rental_sk_${randomBytes}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// POST /api/rentals/[id]/api-keys - Generate new API key
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, scopes, rate_limit_rpm, token_limit } = body;

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select('*')
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    // Only renter can create API keys
    if (rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Only renter can create API keys' }, { status: 403 });
    }

    // Must be active
    if (!['active', 'paid'].includes(rental.status)) {
      return NextResponse.json({ error: 'Rental must be active' }, { status: 400 });
    }

    // Check key limit (max 5 per rental)
    const { count } = await supabaseAdmin
      .from('rental_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('rental_id', id)
      .is('revoked_at', null);

    if ((count || 0) >= 5) {
      return NextResponse.json({ error: 'Maximum 5 API keys per rental' }, { status: 400 });
    }

    // Generate key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPreview = `${apiKey.slice(0, 20)}...${apiKey.slice(-4)}`;

    // Default scopes
    const allowedScopes = scopes || ['execute', 'read'];
    const validScopes = ['execute', 'read', 'write', 'upload'];
    const filteredScopes = allowedScopes.filter((s: string) => validScopes.includes(s));

    // Expires when rental ends or in 30 days
    const expiresAt = rental.completed_at 
      ? new Date(rental.completed_at) 
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Create key record
    const { data: keyRecord, error: keyError } = await supabaseAdmin
      .from('rental_api_keys')
      .insert({
        rental_id: parseInt(id),
        key_hash: keyHash,
        key_preview: keyPreview,
        name: name || 'API Key',
        scopes: filteredScopes,
        rate_limit_rpm: rate_limit_rpm || 60,
        rate_limit_rpd: 1000,
        token_limit: token_limit || null,
        tokens_used: 0,
        request_count: 0,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (keyError) {
      logger.error('Failed to create API key:', keyError);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    logger.info(`API key created for rental ${id}`);

    return NextResponse.json({
      id: keyRecord.id,
      api_key: apiKey, // Only shown once!
      name: keyRecord.name,
      scopes: keyRecord.scopes,
      rate_limit_rpm: keyRecord.rate_limit_rpm,
      token_limit: keyRecord.token_limit,
      expires_at: keyRecord.expires_at,
      warning: 'Save this API key now. It will not be shown again.',
    });
  } catch (error: any) {
    logger.error('API key create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/rentals/[id]/api-keys - List API keys
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get rental
    const { data: rental } = await supabaseAdmin
      .from('rentals')
      .select('renter_id')
      .eq('id', id)
      .single();

    if (!rental || rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get keys (without full key, just preview)
    const { data: keys, error } = await supabaseAdmin
      .from('rental_api_keys')
      .select('id, name, key_preview, scopes, rate_limit_rpm, token_limit, tokens_used, request_count, last_used_at, expires_at, revoked_at, created_at')
      .eq('rental_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 });
    }

    return NextResponse.json({ keys });
  } catch (error: any) {
    logger.error('API key list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/rentals/[id]/api-keys - Revoke an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');

    if (!keyId) {
      return NextResponse.json({ error: 'keyId required' }, { status: 400 });
    }

    // Get rental
    const { data: rental } = await supabaseAdmin
      .from('rentals')
      .select('renter_id')
      .eq('id', id)
      .single();

    if (!rental || rental.renter_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Revoke key
    const { error } = await supabaseAdmin
      .from('rental_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('rental_id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 });
    }

    logger.info(`API key ${keyId} revoked for rental ${id}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('API key revoke error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
