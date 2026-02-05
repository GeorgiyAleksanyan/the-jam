'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HandleTokenPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleToken() {
      try {
        // Check if we have a hash with access_token (implicit flow)
        const hash = window.location.hash;
        
        if (hash && hash.includes('access_token')) {
          setStatus('Found access token, setting session...');
          
          // Parse the hash
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken) {
            // Set the session using the tokens
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (sessionError) {
              console.error('Session error:', sessionError);
              setError(sessionError.message);
              return;
            }
            
            if (data.session) {
              setStatus('Success! Redirecting...');
              // Clear the hash from URL for security
              window.history.replaceState(null, '', window.location.pathname);
              router.push('/dashboard');
              return;
            }
          }
        }
        
        // Check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('Session found! Redirecting...');
          router.push('/dashboard');
          return;
        }
        
        // No token found
        setError('No authentication token found. Please try signing in again.');
      } catch (e: any) {
        console.error('Token handling error:', e);
        setError(e.message || 'An error occurred');
      }
    }

    handleToken();
  }, [router]);

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
