'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client component that detects auth hash params and redirects appropriately.
 * Supabase sends tokens in URL hash (e.g., #access_token=...&type=recovery)
 * This component should be included in the root layout.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    // Check for hash params
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    const hashParams = new URLSearchParams(hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');

    // If this is a recovery token and we're not already on the reset page, redirect
    if (type === 'recovery' && accessToken) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth/reset-password') {
        // Preserve the hash params when redirecting
        router.push(`/auth/reset-password${hash}`);
      }
    }
  }, [router]);

  // This component doesn't render anything
  return null;
}
