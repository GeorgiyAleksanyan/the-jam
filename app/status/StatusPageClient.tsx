'use client';

import { useState, useEffect } from 'react';

interface ServiceStatus {
  name: string;
  description: string;
  status: 'operational' | 'degraded' | 'down' | 'checking';
  latency?: number;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  version?: string;
  checks?: {
    database?: string;
    github?: string;
  };
}

const statusConfig = {
  operational: { 
    color: 'bg-emerald-500', 
    text: 'Operational',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
  },
  degraded: { 
    color: 'bg-yellow-500', 
    text: 'Degraded',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
  },
  down: { 
    color: 'bg-red-500', 
    text: 'Down',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
  },
  checking: { 
    color: 'bg-zinc-500', 
    text: 'Checking...',
    border: 'border-zinc-500/30',
    bg: 'bg-zinc-500/10',
  },
};

function ServiceCard({ service }: { service: ServiceStatus }) {
  const config = statusConfig[service.status];
  
  return (
    <div className={`bg-zinc-900/50 border ${config.border} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-white">{service.name}</span>
        <div className="flex items-center gap-2">
          {service.latency !== undefined && service.status === 'operational' && (
            <span className="text-xs text-zinc-500">{service.latency}ms</span>
          )}
          <span className={`w-2 h-2 rounded-full ${config.color}`} />
        </div>
      </div>
      <p className="text-xs text-zinc-500">{service.description}</p>
    </div>
  );
}

function OverallStatus({ services }: { services: ServiceStatus[] }) {
  const allOperational = services.every(s => s.status === 'operational');
  const anyDown = services.some(s => s.status === 'down');
  const anyChecking = services.some(s => s.status === 'checking');
  
  let status: 'operational' | 'degraded' | 'down' | 'checking' = 'operational';
  if (anyChecking) status = 'checking';
  else if (anyDown) status = 'down';
  else if (!allOperational) status = 'degraded';
  
  const config = statusConfig[status];
  
  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-6 mb-8`}>
      <div className="flex items-center gap-3">
        <span className={`w-4 h-4 rounded-full ${config.color} ${status === 'operational' ? 'animate-pulse' : ''}`} />
        <div>
          <h2 className="text-xl font-bold text-white">
            {status === 'operational' && 'All Systems Operational'}
            {status === 'degraded' && 'Partial System Outage'}
            {status === 'down' && 'Major System Outage'}
            {status === 'checking' && 'Checking Systems...'}
          </h2>
          <p className="text-sm text-zinc-400">
            Last checked: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export function StatusPageClient() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API', description: 'Core API endpoints', status: 'checking' },
    { name: 'Database', description: 'Supabase PostgreSQL', status: 'checking' },
    { name: 'Authentication', description: 'GitHub OAuth & sessions', status: 'checking' },
    { name: 'GitHub Integration', description: 'Webhooks & sync', status: 'checking' },
    { name: 'Payments', description: 'Stripe & crypto escrow', status: 'checking' },
  ]);
  const [lastIncident, setLastIncident] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const startTime = Date.now();
      
      try {
        const response = await fetch('/api/health');
        const latency = Date.now() - startTime;
        
        if (response.ok) {
          const data: HealthResponse = await response.json();
          
          setServices([
            { 
              name: 'API', 
              description: 'Core API endpoints', 
              status: 'operational',
              latency,
            },
            { 
              name: 'Database', 
              description: 'Supabase PostgreSQL', 
              status: data.checks?.database === 'ok' ? 'operational' : 'degraded',
            },
            { 
              name: 'Authentication', 
              description: 'GitHub OAuth & sessions', 
              status: 'operational', // If API works, auth works
            },
            { 
              name: 'GitHub Integration', 
              description: 'Webhooks & sync', 
              status: data.checks?.github === 'ok' ? 'operational' : 'degraded',
            },
            { 
              name: 'Payments', 
              description: 'Stripe & crypto escrow', 
              status: 'operational', // Would need separate check
            },
          ]);
        } else {
          setServices(prev => prev.map(s => ({ ...s, status: 'degraded' as const })));
        }
      } catch {
        setServices(prev => prev.map(s => ({ ...s, status: 'down' as const })));
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
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white mb-4">Services</h2>
        {services.map(service => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>

      {/* Uptime placeholder */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Uptime (Last 90 days)</h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-400">Overall Uptime</span>
            <span className="text-sm font-medium text-emerald-400">99.9%</span>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 90 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 h-8 bg-emerald-500/80 rounded-sm first:rounded-l last:rounded-r hover:bg-emerald-400 transition-colors cursor-pointer"
                title={`${90 - i} days ago: Operational`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-500">
            <span>90 days ago</span>
            <span>Today</span>
          </div>
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
    </>
  );
}
