'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthSubmitButton, AuthError, authLabel, stagger } from '@/components/auth/AuthFormParts';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error(error.message);
        return;
      }

      if (data.user) {
        setSucceeded(true);
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      const msg = error?.message || 'Failed to login. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const mood = succeeded ? 'happy' : passwordFocused ? 'covering' : 'idle';
  const bubble = succeeded
    ? 'Welcome back! Taking you to your dashboard.'
    : passwordFocused
    ? "Go ahead, I'm not peeking."
    : errorMessage
    ? "Hmm, that didn't work. Let's try again."
    : 'Hey there! Ready to create amazing captions?';

  return (
    <AuthLayout
      mood={mood}
      bubble={bubble}
      panelTitle="Create engaging captions in Telugu, Hindi & English."
      panelBody="Automatic word-level timestamps, customizable templates, and professional styling built specifically for creators."
    >
      <div className="auth-rise" style={stagger(0)}>
        <h2 className="text-[1.75rem] font-semibold tracking-tight text-[#F5F7FA]">Welcome back</h2>
        <p className="mt-2 text-sm text-[#9AA4B2]">Enter your credentials to access your creator dashboard.</p>
      </div>

      <AuthError message={errorMessage} />

      <form className="mt-7 space-y-5" onSubmit={handleLogin}>
        <div className="group auth-rise" style={stagger(1)}>
          <label htmlFor="email" className={authLabel}>
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base w-full"
            placeholder="you@creator.com"
          />
        </div>

        <div className="group auth-rise" style={stagger(2)}>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className={`${authLabel} mb-0`}>
              Password
            </label>
            <a href="#" className="rounded text-xs font-medium text-primary-400 hover:text-primary-300">
              Forgot password?
            </a>
          </div>
          <PasswordField
            id="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="••••••••"
          />
        </div>

        <div className="auth-rise pt-1" style={stagger(3)}>
          <AuthSubmitButton loading={loading} succeeded={succeeded} idleLabel="Sign in" loadingLabel="Signing in..." successLabel="Signed in" />
        </div>
      </form>

      <div className="auth-rise" style={stagger(4)}>
        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/[0.08]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0B0D10] px-3 text-[#7C8696]">Secure Supabase Authentication</span>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#9AA4B2]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-primary-400 hover:text-primary-300">
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
