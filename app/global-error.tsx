'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-2xl font-bold mb-2">Critical Error</h1>
            <p className="text-zinc-400 mb-6">
              Something went seriously wrong. We&apos;re on it.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Try again
            </button>
            {error.digest && (
              <p className="text-zinc-600 text-xs mt-4">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
