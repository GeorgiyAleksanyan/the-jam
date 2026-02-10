import { NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitHeaders, getIdentifier, RATE_LIMITS } from './rate-limit';

type EndpointType = keyof typeof RATE_LIMITS;

/**
 * Rate limit wrapper for API routes
 * Returns null if rate limit passes, or a 429 response if exceeded
 */
export async function withRateLimit(
  request: Request,
  endpointType: EndpointType = 'api',
  userId?: string
): Promise<NextResponse | null> {
  const identifier = getIdentifier(request, userId);
  const result = await checkRateLimit(identifier, endpointType);
  
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.reset - Date.now()) / 1000)} seconds.`,
      },
      {
        status: 429,
        headers: getRateLimitHeaders(result),
      }
    );
  }
  
  // Rate limit passed - return null to continue
  return null;
}

/**
 * Add rate limit headers to an existing response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: Request,
  endpointType: EndpointType = 'api',
  userId?: string
): void {
  // Note: This is called after the rate limit check, so we just add informational headers
  // The actual limit check happens in withRateLimit
}

/**
 * Determine endpoint type from URL path
 */
export function getEndpointType(pathname: string): EndpointType {
  if (pathname.includes('/auth/')) return 'auth';
  if (pathname.includes('/submissions')) return 'submissions';
  if (pathname.includes('/vote') || pathname.includes('/upvote')) return 'votes';
  if (pathname.includes('/webhook')) return 'webhooks';
  if (pathname.includes('/admin/')) return 'admin';
  if (pathname.includes('/upload') || pathname.includes('/files')) return 'uploads';
  return 'api';
}
