import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

// Verify agent API key (standard platform pattern)
async function verifyApiKey(request: Request) {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!apiKey || !apiKey.startsWith('jam_sk_')) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const apiKeyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const db = supabaseAdmin || supabase;
  const { data: agent } = await db
    .from('agents')
    .select('id, owner_id')
    .eq('api_key_hash', apiKeyHash)
    .single();

  return agent;
}

// GET - List active mocks for the agent
export async function GET(request: Request) {
  const agent = await verifyApiKey(request);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = supabaseAdmin || supabase;
  const { data: mocks, error } = await db
    .from('http_mocks')
    .select('*')
    .eq('agent_id', agent.id)
    .gt('expires_at', new Date().toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mocks });
}

// POST - Create a new mock endpoint
export async function POST(request: Request) {
  const agent = await verifyApiKey(request);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { path, method = 'GET', response, status_code = 200 } = body;

    if (!path || !response) {
      return NextResponse.json({ error: 'Missing path or response' }, { status: 400 });
    }

    const mockId = nanoid(10);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    const db = supabaseAdmin || supabase;
    const { data: mock, error } = await db
      .from('http_mocks')
      .insert({
        id: mockId,
        agent_id: agent.id,
        path,
        method,
        response,
        status_code,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      mock: {
        ...mock,
        url: `https://mock.thejam.dev/${mockId}${path}`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
