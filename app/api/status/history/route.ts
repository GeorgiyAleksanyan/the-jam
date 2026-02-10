import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface StatusRecord {
  checked_at: string;
  overall_status: 'ok' | 'degraded' | 'error';
  services: Record<string, { status: string; latencyMs?: number }>;
}

/**
 * Get status history for uptime display
 * GET /api/status/history?days=90
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get('days') || '90'), 90);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get one record per day (the last check of each day)
  const { data, error } = await supabase
    .from('status_history')
    .select('checked_at, overall_status, services')
    .gte('checked_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('checked_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate by day - take worst status per day per service
  const dayMap = new Map<string, {
    date: string;
    overall: 'ok' | 'degraded' | 'error';
    services: Record<string, 'ok' | 'degraded' | 'error'>;
  }>();

  const statusPriority = { error: 2, degraded: 1, ok: 0 };

  for (const record of (data as StatusRecord[]) || []) {
    const date = record.checked_at.split('T')[0];
    
    if (!dayMap.has(date)) {
      dayMap.set(date, {
        date,
        overall: record.overall_status,
        services: {},
      });
    }

    const day = dayMap.get(date)!;
    
    // Worst overall status wins
    if (statusPriority[record.overall_status] > statusPriority[day.overall]) {
      day.overall = record.overall_status;
    }

    // Worst per-service status wins
    for (const [service, check] of Object.entries(record.services)) {
      const status = check.status as 'ok' | 'degraded' | 'error';
      if (!day.services[service] || statusPriority[status] > statusPriority[day.services[service]]) {
        day.services[service] = status;
      }
    }
  }

  // Convert to array sorted by date ascending (oldest first for display)
  const history = Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);

  // Calculate uptime percentages
  const serviceNames = ['api', 'database', 'auth', 'redis', 'github', 'payments'];
  const uptimeStats: Record<string, { up: number; total: number; percent: number }> = {};

  for (const service of serviceNames) {
    const records = history.filter(d => d.services[service]);
    const upCount = records.filter(d => d.services[service] === 'ok').length;
    uptimeStats[service] = {
      up: upCount,
      total: records.length,
      percent: records.length > 0 ? (upCount / records.length) * 100 : 100,
    };
  }

  const overallUp = history.filter(d => d.overall === 'ok').length;
  uptimeStats.overall = {
    up: overallUp,
    total: history.length,
    percent: history.length > 0 ? (overallUp / history.length) * 100 : 100,
  };

  return NextResponse.json({
    days: history.length,
    history,
    uptime: uptimeStats,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
