import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TimeEntry {
  id: string;
  start: string;
  end: string | null;
  minutes: number;
  note?: string;
}

// GET /api/rentals/[id]/time - Get time entries
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

    const { data: rental } = await supabaseAdmin
      .from('rentals')
      .select('time_entries, total_minutes, pricing_model, agreed_price')
      .eq('id', id)
      .single();

    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const entries = (rental.time_entries || []) as TimeEntry[];
    const isRunning = entries.some(e => !e.end);
    
    // Calculate current running time
    let totalMinutes = rental.total_minutes || 0;
    if (isRunning) {
      const activeEntry = entries.find(e => !e.end);
      if (activeEntry) {
        const startTime = new Date(activeEntry.start).getTime();
        const now = Date.now();
        const runningMinutes = Math.floor((now - startTime) / 60000);
        totalMinutes += runningMinutes;
      }
    }

    const hourlyRate = rental.agreed_price;
    const cost = (totalMinutes / 60) * hourlyRate;

    return NextResponse.json({
      entries,
      total_minutes: totalMinutes,
      is_running: isRunning,
      hourly_rate: hourlyRate,
      current_cost: Math.round(cost * 100) / 100,
    });
  } catch (error: any) {
    logger.error('Time get error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/rentals/[id]/time - Start/stop/pause timer
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
    const { action, note } = body; // action: 'start' | 'stop' | 'pause'

    if (!['start', 'stop', 'pause'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get rental
    const { data: rental, error: rentalError } = await supabaseAdmin
      .from('rentals')
      .select(`*, agent:agents(id, owner_id)`)
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }

    const agent = Array.isArray(rental.agent) ? rental.agent[0] : rental.agent;

    // Only owner can control timer
    if (agent?.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only agent owner can control timer' }, { status: 403 });
    }

    if (rental.pricing_model !== 'hourly') {
      return NextResponse.json({ error: 'Time tracking only for hourly rentals' }, { status: 400 });
    }

    if (!['active', 'paid'].includes(rental.status)) {
      return NextResponse.json({ error: 'Rental must be active' }, { status: 400 });
    }

    const entries = (rental.time_entries || []) as TimeEntry[];
    const activeEntry = entries.find(e => !e.end);
    const now = new Date().toISOString();

    if (action === 'start') {
      if (activeEntry) {
        return NextResponse.json({ error: 'Timer already running' }, { status: 400 });
      }
      entries.push({
        id: crypto.randomUUID(),
        start: now,
        end: null,
        minutes: 0,
        note,
      });
    } else if (action === 'stop' || action === 'pause') {
      if (!activeEntry) {
        return NextResponse.json({ error: 'Timer not running' }, { status: 400 });
      }
      const startTime = new Date(activeEntry.start).getTime();
      const endTime = Date.now();
      activeEntry.end = now;
      activeEntry.minutes = Math.floor((endTime - startTime) / 60000);
      if (note) activeEntry.note = note;
    }

    // Calculate total minutes
    const totalMinutes = entries.reduce((sum, e) => sum + (e.minutes || 0), 0);

    // Update rental
    const { error: updateError } = await supabaseAdmin
      .from('rentals')
      .update({
        time_entries: entries,
        total_minutes: totalMinutes,
        started_at: rental.started_at || (action === 'start' ? now : null),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update time' }, { status: 500 });
    }

    // Add system message for start/stop
    if (action !== 'pause') {
      await supabaseAdmin
        .from('rental_messages')
        .insert({
          rental_id: parseInt(id),
          sender_id: user.id,
          sender_type: 'agent',
          content: action === 'start' 
            ? '⏱️ Timer started' 
            : `⏱️ Timer stopped (${totalMinutes} min total)`,
          message_type: 'system',
        });
    }

    logger.info(`Timer ${action} for rental ${id}. Total: ${totalMinutes} min`);

    return NextResponse.json({
      entries,
      total_minutes: totalMinutes,
      is_running: action === 'start',
    });
  } catch (error: any) {
    logger.error('Time update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
