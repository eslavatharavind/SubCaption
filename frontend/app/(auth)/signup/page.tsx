'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { PasswordField } from '@/components/auth/PasswordField';
import { AuthSubmitButton, AuthError, authLabel, stagger } from '@/components/auth/AuthFormParts';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
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
        toast.success('Account created! Please check your email to verify your account.');
        router.push('/login');
      }
    } catch (error: any) {
      const msg = error?.message || 'Failed to create account. Please try again.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const mood = succeeded ? 'happy' : passwordFocused ? 'covering' : 'idle';
  const bubble = succeeded
    ? "You're all set! Check your email to verify."
    : passwordFocused
    ? "Go ahead, I'm not peeking."
    : errorMessage
    ? "Almost there. Let's fix that one thing."
    : 'Hey there! Ready to create amazing captions?';

  return (
    <AuthLayout
      mood={mood}
      bubble={bubble}
      panelTitle="Start adding captions to your videos today."
      panelBody="Create an account to upload videos, generate multilingual captions, apply custom templates, and export high resolution MP4s."
    >
      <div className="auth-rise" style={stagger(0)}>
        <h2 className="text-[1.75rem] font-semibold tracking-tight text-[#F5F7FA]">Create an account</h2>
        <p className="mt-2 text-sm text-[#9AA4B2]">Get started with automated video captions.</p>
      </div>

      <AuthError message={errorMessage} />

      <form className="mt-7 space-y-5" onSubmit={handleSignup}>
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
          <label htmlFor="password" className={authLabel}>
            Password
          </label>
          <PasswordField
            id="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="Minimum 6 characters"
          />
        </div>

        <div className="group auth-rise" style={stagger(3)}>
          <label htmlFor="confirmPassword" className={authLabel}>
            Confirm password
          </label>
          <PasswordField
            id="confirmPassword"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="••••••••"
          />
        </div>

        <div className="auth-rise pt-1" style={stagger(4)}>
          <AuthSubmitButton
            loading={loading}
            succeeded={succeeded}
            idleLabel="Create account"
            loadingLabel="Creating account..."
            successLabel="Account created"
          />
        </div>
      </form>

      <p className="auth-rise mt-8 text-center text-sm text-[#9AA4B2]" style={stagger(5)}>
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary-400 hover:text-primary-300">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
