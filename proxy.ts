import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// We need an Upstash Redis instance for proper rate limiting at the edge.
// If not configured, we allow all (development mode).
// TODO: Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local

const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? Redis.fromEnv() 
  : null

// Rate limit: 10 requests per 10 seconds (for APIs)
const ratelimit = redis 
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
    })
  : null

export async function proxy(request: NextRequest) {
  // Only limit /api routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (ratelimit) {
      // @ts-ignore - Vercel NextRequest has ip, but types might be outdated in build env
      const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1'
      const { success } = await ratelimit.limit(ip)
      
      if (!success) {
        return NextResponse.json(
          { error: 'Too Many Requests' },
          { status: 429 }
        )
      }
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
