'use client';

import { useState, useEffect } from 'react';

interface ServiceCheck {
  status: 'ok' | 'degraded' | 'error';
  latencyMs?: number;
  error?: string;
  rateLimit?: { remaining: number; limit: number };
}

interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
  services: Record<string, ServiceCheck>;
}

interface HistoryDay {
  date: string;
  overall: 'ok' | 'degraded' | 'error';
  services: Record<string, 'ok' | 'degraded' | 'error'>;
}

interface HistoryResponse {
  days: number;
  history: HistoryDay[];
  uptime: Record<string, { up: number; total: number; percent: number }>;
}

interface ServiceConfig {
  key: string;
  name: string;
  description: string;
  external?: boolean;
  externalUrl?: string;
}

const SERVICES: ServiceConfig[] = [
  { key: 'api', name: 'API', description: 'Core API endpoints & application server' },
  { key: 'database', name: 'Database', description: 'Supabase PostgreSQL database' },
  { key: 'auth', name: 'Authentication', description: 'User authentication & sessions' },
  { key: 'redis', name: 'Rate Limiting', description: 'Upstash Redis for rate limiting', external: true, externalUrl: 'https://status.upstash.com' },
  { key: 'github', name: 'GitHub', description: 'GitHub API for challenges & PRs', external: true, externalUrl: 'https://www.githubstatus.com' },
  { key: 'payments', name: 'Payments', description: 'Stripe payment processing', external: true, externalUrl: 'https://status.stripe.com' },
];

const statusConfig = {
  operational: { 
    color: 'bg-emerald-500', 
    text: 'Operational',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    barColor: 'bg-emerald-500',
  },
  degraded: { 
    color: 'bg-yellow-500', 
    text: 'Degraded',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
    barColor: 'bg-yellow-500',
  },
  down: { 
    color: 'bg-red-500', 
    text: 'Down',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    barColor: 'bg-red-500',
  },
  checking: { 
    color: 'bg-zinc-500', 
    text: 'Checking...',
    border: 'border-zinc-500/30',
    bg: 'bg-zinc-500/10',
    barColor: 'bg-zinc-600',
  },
};

type StatusType = keyof typeof statusConfig;

interface ServiceStatus {
  key: string;
  name: string;
  description: string;
  status: StatusType;
  latency?: number;
  external?: boolean;
  externalUrl?: string;
  uptimeHistory: StatusType[]; // Last 90 days
}

function UptimeBar({ history, label }: { history: StatusType[]; label: string }) {
  const upCount = history.filter(s => s === 'operational').length;
  const uptimePercent = history.length > 0 ? ((upCount / history.length) * 100).toFixed(2) : '100.00';
  
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500">{label}</span>
        <span className="text-xs font-medium text-emerald-400">{uptimePercent}%</span>
      </div>
      <div className="flex gap-px">
        {history.map((status, i) => {
          const config = statusConfig[status];
          const daysAgo = history.length - i;
          return (
            <div 
              key={i} 
              className={`flex-1 h-6 ${config.barColor} rounded-sm hover:opacity-80 transition-opacity cursor-pointer min-w-[2px]`}
              title={`${daysAgo} day${daysAgo > 1 ? 's' : ''} ago: ${config.text}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
        <span>{history.length} days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const config = statusConfig[service.status];
  
  return (
    <div className={`bg-zinc-900/50 border ${config.border} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{service.name}</span>
          {service.external && service.externalUrl && (
            <a 
              href={service.externalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-300"
              title="View external status"
            >
              ↗
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {service.latency !== undefined && service.status === 'operational' && (
            <span className="text-xs text-zinc-500">{service.latency}ms</span>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${config.color}`} />
            <span className={`text-xs ${service.status === 'operational' ? 'text-emerald-400' : service.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`}>
              {config.text}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mb-2">{service.description}</p>
      <UptimeBar history={service.uptimeHistory} label="90-day uptime" />
    </div>
  );
}

function OverallStatus({ services }: { services: ServiceStatus[] }) {
  const allOperational = services.every(s => s.status === 'operational');
  const anyDown = services.some(s => s.status === 'down');
  const anyChecking = services.some(s => s.status === 'checking');
  
  let status: StatusType = 'operational';
  if (anyChecking) status = 'checking';
  else if (anyDown) status = 'down';
  else if (!allOperational) status = 'degraded';
  
  const config = statusConfig[status];
  
  // Calculate overall uptime
  const allHistory = services.flatMap(s => s.uptimeHistory);
  const upCount = allHistory.filter(s => s === 'operational').length;
  const uptimePercent = allHistory.length > 0 ? ((upCount / allHistory.length) * 100).toFixed(2) : '100.00';
  
  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-6 mb-8`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-4 h-4 rounded-full ${config.color} ${status === 'operational' ? 'animate-pulse' : ''}`} />
          <div>
            <h2 className="text-xl font-bold text-white">
              {status === 'operational' && 'All Systems Operational'}
              {status === 'degraded' && 'Partial System Degradation'}
              {status === 'down' && 'Major System Outage'}
              {status === 'checking' && 'Checking Systems...'}
            </h2>
            <p className="text-sm text-zinc-400">
              Last checked: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-400">{uptimePercent}%</div>
          <div className="text-xs text-zinc-500">Overall uptime</div>
        </div>
      </div>
    </div>
  );
}

// Removed generateUptimeHistory - now using real data from API

export function StatusPageClient() {
  const [services, setServices] = useState<ServiceStatus[]>(
    SERVICES.map(s => ({
      ...s,
      status: 'checking' as StatusType,
      uptimeHistory: Array(90).fill('operational' as StatusType),
    }))
  );
  const [_lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [_historyLoaded, setHistoryLoaded] = useState(false);

  // Fetch historical uptime data
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/status/history?days=90');
        if (response.ok) {
          const data: HistoryResponse = await response.json();
          
          // Update services with real uptime history
          setServices(prev => prev.map(service => {
            const history: StatusType[] = data.history.map(day => {
              const status = day.services[service.key];
              if (status === 'error') return 'down';
              if (status === 'degraded') return 'degraded';
              return 'operational';
            });
            
            // Pad with 'operational' if we don't have 90 days yet
            while (history.length < 90) {
              history.unshift('operational');
            }
            
            return { ...service, uptimeHistory: history };
          }));
          
          setHistoryLoaded(true);
        }
      } catch (e) {
        console.error('Failed to fetch history:', e);
      }
    };

    fetchHistory();
  }, []);

  // Check current health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health');
        
        if (response.ok) {
          const data: HealthResponse = await response.json();
          
          setServices(prev => prev.map(serviceConfig => {
            const check = data.services[serviceConfig.key];
            let status: StatusType = 'operational';
            
            if (!check) {
              status = 'checking';
            } else if (check.status === 'error') {
              status = 'down';
            } else if (check.status === 'degraded') {
              status = 'degraded';
            }
            
            // Preserve existing uptime history
            const existing = prev.find(p => p.key === serviceConfig.key);
            
            return {
              ...serviceConfig,
              status,
              latency: check?.latencyMs,
              uptimeHistory: existing?.uptimeHistory || Array(90).fill('operational'),
            };
          }));
        } else {
          setServices(prev => prev.map(s => ({ 
            ...s, 
            status: 'degraded' as StatusType,
          })));
        }
        
        setLastUpdated(new Date());
      } catch {
        setServices(prev => prev.map(s => ({ 
          ...s, 
          status: 'down' as StatusType,
        })));
        setLastUpdated(new Date());
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Refresh every 30s
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <OverallStatus services={services} />
      
      {/* Services Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Services</h2>
          <span className="text-xs text-zinc-500">
            Auto-refreshes every 30s
          </span>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {services.map(service => (
            <ServiceCard key={service.key} service={service} />
          ))}
        </div>
      </div>

      {/* External Services */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">External Status Pages</h2>
        <div className="flex flex-wrap gap-3">
          <a 
            href="https://status.supabase.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            Supabase Status ↗
          </a>
          <a 
            href="https://status.upstash.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            Upstash Status ↗
          </a>
          <a 
            href="https://www.githubstatus.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            GitHub Status ↗
          </a>
          <a 
            href="https://status.stripe.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            Stripe Status ↗
          </a>
          <a 
            href="https://www.vercel-status.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            Vercel Status ↗
          </a>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Incidents</h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">✨</div>
          <p className="text-zinc-400">No incidents reported</p>
          <p className="text-xs text-zinc-500 mt-1">All systems have been running smoothly</p>
        </div>
      </div>

      {/* Subscribe for updates */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Get Notified</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Subscribe to receive email notifications when service status changes.
        </p>
        <a 
          href="/email-preferences"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
        >
          Subscribe to Updates
        </a>
      </div>
    </>
  );
}
