'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Create a fresh client to avoid race conditions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false, // We handle it manually
    }
  }
);

export default function HandleTokenPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (processedRef.current) return;
    processedRef.current = true;

    async function handleToken() {
      try {
        const hash = window.location.hash;
        
        if (!hash || !hash.includes('access_token')) {
          setError('No authentication token found. Please try signing in again.');
          return;
        }

        setStatus('Found access token, setting session...');
        
        // Parse the hash
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (!accessToken) {
          setError('Invalid token format');
          return;
        }

        // Set the session
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
          setStatus('Success! Redirecting to dashboard...');
          // Clear the hash from URL for security
          window.history.replaceState(null, '', '/auth/handle-token');
          // Use window.location for a full page reload to ensure session is picked up
          window.location.href = '/dashboard';
          return;
        }

        setError('Failed to create session');
      } catch (e: any) {
        console.error('Token handling error:', e);
        // Ignore AbortError - it's from component unmounting
        if (e.name === 'AbortError') {
          return;
        }
        setError(e.message || 'An error occurred');
      }
    }

    // Small delay to let React settle
    const timer = setTimeout(handleToken, 100);
    return () => clearTimeout(timer);
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
