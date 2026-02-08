'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function HandleTokenPage() {
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    // Prevent double execution
    if (handledRef.current) return;
    handledRef.current = true;
    
    async function handleToken() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const hash = window.location.hash;
        
        console.log('HandleToken: Starting auth flow', { hasCode: !!code, hasHash: !!hash });
        
        // First, check if we already have a session (code may have been auto-consumed)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          console.log('HandleToken: Already have session, redirecting immediately');
          setStatus('Success! Redirecting...');
          
          // Store provider token if available
          if (existingSession.provider_token) {
            await storeGitHubToken(existingSession.user.id, existingSession.provider_token);
          }
          
          window.location.href = '/dashboard';
          return;
        }
        
        // Handle PKCE flow (code in query string)
        if (code) {
          console.log('HandleToken: Exchanging PKCE code');
          setStatus('Exchanging authorization code...');
          
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            // Check if it's "code already used" - session might already exist
            if (exchangeError.message.includes('already') || exchangeError.message.includes('expired')) {
              console.log('HandleToken: Code already used, checking for session');
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                console.log('HandleToken: Found session after code error, redirecting');
                window.location.href = '/dashboard';
                return;
              }
            }
            console.error('HandleToken: Code exchange error:', exchangeError);
            setError(exchangeError.message);
            return;
          }
          
          if (data.session) {
            console.log('HandleToken: PKCE session created');
            
            if (data.session.provider_token) {
              await storeGitHubToken(data.session.user.id, data.session.provider_token);
            }
            
            setStatus('Success! Redirecting...');
            window.location.href = '/dashboard';
            return;
          }
        }
        
        // Handle implicit flow (tokens in hash)
        if (hash && hash.includes('access_token')) {
          console.log('HandleToken: Processing hash tokens');
          setStatus('Processing authentication tokens...');
          
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const providerToken = params.get('provider_token');
          
          if (accessToken) {
            const { data, error: sessionSetError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionSetError) {
              console.error('HandleToken: setSession error:', sessionSetError);
              setError(sessionSetError.message);
              return;
            }
            
            if (data.session) {
              if (providerToken || data.session.provider_token) {
                await storeGitHubToken(data.session.user.id, providerToken || data.session.provider_token!);
              }
              
              setStatus('Success! Redirecting...');
              window.location.href = '/dashboard';
              return;
            }
          }
        }
        
        // Wait and check one more time (Supabase might be processing)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession) {
          console.log('HandleToken: Found session on retry');
          window.location.href = '/dashboard';
          return;
        }
        
        // No session found
        console.log('HandleToken: No session found, showing error');
        setError('Authentication failed. Please try again.');
        
      } catch (e: any) {
        console.error('HandleToken: Unexpected error:', e);
        setError(e.message || 'An unexpected error occurred');
      }
    }

    async function storeGitHubToken(userId: string, token: string) {
      try {
        console.log('storeGitHubToken: Storing token for user', userId);
        const res = await fetch('/api/auth/store-github-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, token }),
        });
        if (!res.ok) {
          console.error('Failed to store GitHub token:', await res.text());
        }
      } catch (err) {
        console.error('Error storing GitHub token:', err);
      }
    }

    // Subscribe to auth changes - if we get SIGNED_IN, redirect immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('HandleToken: Auth state changed:', event, !!session);
      if (event === 'SIGNED_IN' && session) {
        console.log('HandleToken: SIGNED_IN event, redirecting');
        window.location.href = '/dashboard';
      }
    });

    handleToken();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">😓</div>
          <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <a
            href="/auth/signin"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-zinc-400">{status}</p>
      </div>
    </div>
  );
}
