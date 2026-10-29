'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui/Spinner';
import { Logo } from '@/components/ui/Logo';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      timer = setTimeout(() => {
        setShowRetry(true);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex flex-col items-center justify-center space-y-4 px-4 text-center">
        <Logo size="lg" priority />
        <Spinner size="md" />
        <p className="text-xs text-brand-muted font-mono">Authenticating session...</p>
        {showRetry && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-brand-muted">Taking longer than usual?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-lg bg-[#151A21] border border-[#262D36] text-xs text-[#E8ECF2] hover:bg-[#1C222B] transition-colors"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="px-3 py-1.5 rounded-lg bg-primary-600 text-xs font-semibold text-white hover:bg-primary-500 transition-colors"
              >
                Go to Log In
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex flex-col items-center justify-center space-y-4 px-4 text-center">
        <Logo size="lg" priority />
        <Spinner size="md" />
        <p className="text-xs text-brand-muted font-mono">Redirecting to sign in...</p>
      </div>
    );
  }

  return <>{children}</>;
}
