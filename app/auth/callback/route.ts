import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors from provider
  if (error) {
    console.error('OAuth error from provider:', error, errorDescription)
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', error)
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(errorUrl)
  }

  if (!code) {
    console.error('No authorization code provided')
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', 'no_code')
    errorUrl.searchParams.set('error_description', 'No authorization code was provided')
    return NextResponse.redirect(errorUrl)
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
              // Ensure cookies are set with proper options
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
      console.log('Session created successfully for user:', data.session.user.email)
      
      // Create response with redirect
      const redirectUrl = new URL(next, origin)
      const response = NextResponse.redirect(redirectUrl)
      
      // Ensure auth cookies are set on the response
      const allCookies = cookieStore.getAll()
      for (const cookie of allCookies) {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.set(cookie.name, cookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
          })
        }
      }
      
      return response
    }
  } catch (e) {
    console.error('Unexpected error during auth callback:', e)
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', 'unexpected_error')
    errorUrl.searchParams.set('error_description', 'An unexpected error occurred during authentication')
    return NextResponse.redirect(errorUrl)
  }

  // No session created
  const errorUrl = new URL('/auth/error', origin)
  errorUrl.searchParams.set('error', 'no_session')
  errorUrl.searchParams.set('error_description', 'No session was created')
  return NextResponse.redirect(errorUrl)
}
