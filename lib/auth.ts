/**
 * Unified authentication helpers for API routes
 * Supports both cookie-based auth (web UI) and Bearer token auth (API clients)
 */

import { createClient as createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface AuthResult {
  user: User | null;
  error: string | null;
  method: 'cookie' | 'bearer' | 'none';
}

/**
 * Get authenticated user from request
 * Tries Bearer token first (for API clients), then cookies (for web UI)
 */
export async function getAuthenticatedUser(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');

  // Try Bearer token auth first
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        return {
          user: null,
          error: `Bearer auth failed: ${error.message}`,
          method: 'bearer',
        };
      }
      
      if (user) {
        return { user, error: null, method: 'bearer' };
      }
    } catch (err) {
      return {
        user: null,
        error: `Bearer auth error: ${err instanceof Error ? err.message : 'Unknown'}`,
        method: 'bearer',
      };
    }
  }

  // Try cookie-based auth (for web UI)
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Session might be expired - this is expected
      return {
        user: null,
        error: null, // Don't treat expired session as error for cookies
        method: 'cookie',
      };
    }
    
    if (user) {
      return { user, error: null, method: 'cookie' };
    }
  } catch (err) {
    // Cookie reading might fail in edge runtime
    console.warn('Cookie auth fallback:', err instanceof Error ? err.message : 'Unknown');
  }

  return {
    user: null,
    error: null,
    method: 'none',
  };
}

/**
 * Require authentication - returns user or throws
 * Use in API routes that require auth
 */
export async function requireAuth(request: Request): Promise<User> {
  const result = await getAuthenticatedUser(request);
  
  if (!result.user) {
    const errorMessage = result.error || 'Authentication required';
    throw new AuthError(errorMessage, result.method);
  }
  
  return result.user;
}

/**
 * Custom error class for auth failures
 */
export class AuthError extends Error {
  public readonly method: 'cookie' | 'bearer' | 'none';
  public readonly statusCode = 401;

  constructor(message: string, method: 'cookie' | 'bearer' | 'none') {
    super(message);
    this.name = 'AuthError';
    this.method = method;
  }
}

/**
 * Create a standard 401 response with detailed info for debugging
 */
export function unauthorized(message = 'Unauthorized', details?: Record<string, any>) {
  return Response.json(
    {
      error: message,
      code: 'UNAUTHORIZED',
      ...(process.env.NODE_ENV === 'development' && details ? { debug: details } : {}),
    },
    { status: 401 }
  );
}
