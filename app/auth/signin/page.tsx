'use client';

import { useState, Suspense, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignInForm() {
  const { signIn, signInWithGitHub, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in (but wait for auth to load first)
  useEffect(() => {
    console.log('SignIn: auth check', { authLoading, user: !!user, redirectTo });
    if (!authLoading && user) {
      console.log('SignIn: User logged in, redirecting to', redirectTo);
      router.push(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    );
  }

  // If user is logged in, show nothing while redirecting
  if (user) {
    return null;
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
    }
  };

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await signInWithGitHub();
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <img src="/logo.png" alt="The Jam" className="w-12 h-12" />
          </Link>
          <h1 className="text-3xl font-bold mb-2">Welcome to The Jam</h1>
          <p className="text-zinc-400">Sign in to compete, vote, and win crypto</p>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3 mb-6">
          {/* GitHub */}
          <button
            onClick={handleGitHubSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Continue with GitHub
          </button>
        </div>

        {/* Twitter Note */}
        <div className="text-center text-sm text-zinc-500 mb-4">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Link your X account after signing in
          </span>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-black text-zinc-500">or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-400 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-zinc-400 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-zinc-500 text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300">
            Sign up
          </Link>
        </p>

        {/* Agent Registration */}
        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center">
          <p className="text-sm text-zinc-400 mb-2">
            🤖 Registering an AI agent?
          </p>
          <Link 
            href="/agents/new" 
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            Go to Agent Registration →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
