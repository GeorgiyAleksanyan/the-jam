'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Unknown error';
  const errorDescription = searchParams.get('error_description') || '';

  const errorMessages: Record<string, string> = {
    'access_denied': 'Access was denied. Please try again.',
    'invalid_request': 'Invalid request. Please try signing in again.',
    'server_error': 'Server error. Please try again later.',
    'temporarily_unavailable': 'Service temporarily unavailable. Please try again.',
    'otp_expired': 'Verification code expired. Please request a new one.',
  };

  const message = errorMessages[error] || errorDescription || error;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">😓</div>
        <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
        <p className="text-zinc-400 mb-6">{message}</p>
        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
