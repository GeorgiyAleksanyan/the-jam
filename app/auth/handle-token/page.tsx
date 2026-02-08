'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HandleTokenPage() {
  const [status, setStatus] = useState('Processing authentication...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let redirected = false;
    
    async function handleToken() {
      try {
        // Check for PKCE flow (code in query string)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
          console.log('HandleToken: Found PKCE code, exchanging for session');
          setStatus('Exchanging authorization code...');
          
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('HandleToken: Code exchange error:', exchangeError);
            setError(exchangeError.message);
            return;
          }
          
          if (data.session && !redirected) {
            redirected = true;
            console.log('HandleToken: PKCE session created, redirecting');
            
            // Store GitHub token if available
            if (data.session.provider_token) {
              await storeGitHubToken(data.session.user.id, data.session.provider_token);
            }
            
            setStatus('Success! Redirecting to dashboard...');
            window.history.replaceState(null, '', '/auth/handle-token');
            window.location.href = '/dashboard';
            return;
          }
        }
        
        // Check for implicit flow (tokens in hash)
        const hash = window.location.hash;
        let providerTokenFromHash: string | null = null;
        
        if (hash && hash.includes('provider_token')) {
          const params = new URLSearchParams(hash.substring(1));
          providerTokenFromHash = params.get('provider_token');
          console.log('HandleToken: Captured provider_token from hash:', !!providerTokenFromHash);
        }
        
        console.log('HandleToken: checking for existing session');
        
        // Wait a moment for Supabase to auto-detect the hash
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if session exists now
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('HandleToken: session check:', !!session, sessionError?.message);
        
        if (session && !redirected) {
          const tokenToStore = session.provider_token || providerTokenFromHash;
          
          if (tokenToStore) {
            console.log('HandleToken: Storing GitHub provider token');
            await storeGitHubToken(session.user.id, tokenToStore);
          }
          
          redirected = true;
          setStatus('Success! Redirecting to dashboard...');
          window.history.replaceState(null, '', '/auth/handle-token');
          window.location.href = '/dashboard';
          return;
        }
        
        // If no session yet but we have a hash with access_token, try to set it manually
        if (hash && hash.includes('access_token')) {
          setStatus('Found access token, setting session...');
          
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
            
            if (data.session && !redirected) {
              const tokenToStore = providerToken || data.session.provider_token || providerTokenFromHash;
              if (tokenToStore) {
                await storeGitHubToken(data.session.user.id, tokenToStore);
              }
              
              redirected = true;
              setStatus('Success! Redirecting to dashboard...');
              window.history.replaceState(null, '', '/auth/handle-token');
              window.location.href = '/dashboard';
              return;
            }
          }
        }
        
        // Still no session after 3 seconds, show error
        setTimeout(() => {
          if (!redirected) {
            setError('Authentication timed out. Please try again.');
          }
        }, 3000);
        
      } catch (e: any) {
        console.error('HandleToken: error:', e);
        if (e.name !== 'AbortError') {
          setError(e.message || 'An error occurred');
        }
      }
    }

    async function storeGitHubToken(userId: string, token: string) {
      try {
        console.log('storeGitHubToken: Calling API for user', userId);
        const res = await fetch('/api/auth/store-github-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ userId, token }),
        });
        const data = await res.json();
        console.log('storeGitHubToken: Response', res.status, data);
        if (!res.ok) {
          console.error('Failed to store GitHub token:', data);
        }
      } catch (err) {
        console.error('Error storing GitHub token:', err);
      }
    }

    handleToken();
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
