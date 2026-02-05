'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
        console.log('HandleToken: hash present:', !!hash, hash?.substring(0, 50));
        
        if (!hash || !hash.includes('access_token')) {
          // Maybe session already exists from Supabase auto-detection
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('HandleToken: Session already exists, redirecting');
            window.location.href = '/dashboard';
            return;
          }
          setError('No authentication token found. Please try signing in again.');
          return;
        }

        setStatus('Found access token, setting session...');
        
        // Parse the hash
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        console.log('HandleToken: tokens found:', !!accessToken, !!refreshToken);
        
        if (!accessToken) {
          setError('Invalid token format');
          return;
        }

        // Set the session using the SHARED supabase client
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        if (sessionError) {
          console.error('HandleToken: Session error:', sessionError);
          setError(sessionError.message);
          return;
        }
        
        if (data.session) {
          console.log('HandleToken: Session set successfully');
          setStatus('Success! Redirecting to dashboard...');
          // Clear the hash from URL for security
          window.history.replaceState(null, '', '/auth/handle-token');
          // Use window.location for a full page reload to ensure session is picked up
          window.location.href = '/dashboard';
          return;
        }

        setError('Failed to create session');
      } catch (e: any) {
        console.error('HandleToken: error:', e);
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
