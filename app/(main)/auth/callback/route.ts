import logger from '@/lib/logger'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin, hash: _hash } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors from provider
  if (error) {
    console.error('OAuth error from provider:', { error, errorDescription })
    
    // Check if this is actually a success with implicit flow (token in hash)
    // The URL shows #access_token which means implicit flow
    // We need to handle this client-side, redirect to a page that can read the hash
    if (error === 'no_code') {
      // Redirect to client-side handler that can read hash fragments
      return NextResponse.redirect(new URL('/auth/handle-token', origin))
    }
    
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', error)
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(errorUrl)
  }

  if (!code) {
    console.error('No authorization code provided - may need client-side hash handling')
    // Redirect to client-side handler
    return NextResponse.redirect(new URL('/auth/handle-token', origin))
  }

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              })
            })
          } catch (e) {
            console.error('Cookie set error:', e)
          }
        },
      },
    }
  )

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Session exchange error:', exchangeError)
      const errorUrl = new URL('/auth/error', origin)
      errorUrl.searchParams.set('error', 'session_exchange_failed')
      errorUrl.searchParams.set('error_description', exchangeError.message)
      return NextResponse.redirect(errorUrl)
    }

    if (data.session) {
      logger.log('Session created successfully for user:', data.session.user.email)
      const redirectUrl = new URL(next, origin)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (e) {
    console.error('Unexpected error during auth callback:', e)
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', 'unexpected_error')
    errorUrl.searchParams.set('error_description', 'An unexpected error occurred during authentication')
    return NextResponse.redirect(errorUrl)
  }

  const errorUrl = new URL('/auth/error', origin)
  errorUrl.searchParams.set('error', 'no_session')
  errorUrl.searchParams.set('error_description', 'No session was created')
  return NextResponse.redirect(errorUrl)
}
