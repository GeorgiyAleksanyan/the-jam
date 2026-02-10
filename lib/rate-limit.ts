import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Types for rate limit configuration
interface RateLimitConfig {
  requests: number;
  window: string; // e.g., '1m', '1h', '1d'
}

// Rate limit configurations by endpoint type
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Auth endpoints - strict limits
  auth: { requests: 5, window: '1m' },
  
  // Submissions - moderate limits
  submissions: { requests: 10, window: '1m' },
  
  // Votes - moderate limits
  votes: { requests: 30, window: '1m' },
  
  // General API reads
  api: { requests: 100, window: '1m' },
  
  // Webhooks
  webhooks: { requests: 60, window: '1m' },
  
  // Admin endpoints
  admin: { requests: 30, window: '1m' },
  
  // File uploads
  uploads: { requests: 10, window: '1m' },
};

// Parse window string to seconds
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 60; // default 1 minute
  
  const [, value, unit] = match;
  const num = parseInt(value);
  
  switch (unit) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 3600;
    case 'd': return num * 86400;
    default: return 60;
  }
}

// In-memory fallback for development/when Redis isn't configured
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(key: string, limit: number, windowSeconds: number): {
  success: boolean;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const entry = memoryStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowSeconds * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, reset: resetAt };
  }
  
  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }
  
  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 60000); // Every minute

// Create Upstash rate limiter if configured
let upstashRatelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  
  upstashRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1m'), // Default, will be overridden
    analytics: true,
  });
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp when the window resets
}

/**
 * Check rate limit for a given identifier and endpoint type
 */
export async function checkRateLimit(
  identifier: string,
  endpointType: keyof typeof RATE_LIMITS = 'api'
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpointType] || RATE_LIMITS.api;
  const windowSeconds = parseWindow(config.window);
  const key = `${endpointType}:${identifier}`;
  
  // Use Upstash if configured
  if (upstashRatelimit && process.env.UPSTASH_REDIS_REST_URL) {
    try {
      // Create a new limiter with the specific config
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window as `${number} s` | `${number} m` | `${number} h` | `${number} d`),
      });
      
      const result = await limiter.limit(key);
      
      return {
        success: result.success,
        limit: config.requests,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (error) {
      console.error('Upstash rate limit error, falling back to memory:', error);
      // Fall through to in-memory
    }
  }
  
  // In-memory fallback
  const result = inMemoryRateLimit(key, config.requests, windowSeconds);
  
  return {
    success: result.success,
    limit: config.requests,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    ...(result.success ? {} : { 'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString() }),
  };
}

/**
 * Extract identifier from request (IP or user ID)
 */
export function getIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}
