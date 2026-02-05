import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// We need an Upstash Redis instance for proper rate limiting at the edge.
// If not configured, we allow all (development mode).
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
  let response = NextResponse.next({
    request,
  })

  // Rate limit /api routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (ratelimit) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
      const { success } = await ratelimit.limit(ip)
      
      if (!success) {
        return NextResponse.json(
          { error: 'Too Many Requests' },
          { status: 429 }
        )
      }
    }
    // Don't process auth for API routes
    return response
  }

  // Skip auth processing for static files and auth routes
  const pathname = request.nextUrl.pathname
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.') // Static files
  ) {
    return response
  }

  // Create Supabase client for auth refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes - redirect to signin if not authenticated
  const protectedPaths = ['/dashboard', '/profile', '/challenges/new']
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
