'use client';

import { CSSProperties } from 'react';

export const authLabel =
  'mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9AA4B2] transition-colors group-focus-within:text-primary-300';

/** Staggered entrance delay for form rows. */
export const stagger = (i: number): CSSProperties => ({ animationDelay: `${120 + i * 70}ms` });

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      key={message}
      role="alert"
      className="auth-error mt-6 flex items-start gap-3 rounded-xl border border-red-800/80 bg-red-950/50 p-4 text-sm text-red-300"
    >
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

interface AuthSubmitButtonProps {
  loading: boolean;
  succeeded: boolean;
  idleLabel: string;
  loadingLabel: string;
  successLabel: string;
}

export function AuthSubmitButton({ loading, succeeded, idleLabel, loadingLabel, successLabel }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || succeeded}
      aria-busy={loading}
      className={`group/btn relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold text-white shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D10] active:scale-[0.985] disabled:cursor-not-allowed ${
        succeeded
          ? 'bg-emerald-600 shadow-emerald-600/20'
          : 'bg-primary-600 shadow-primary-600/20 hover:bg-primary-500 hover:shadow-primary-500/25 disabled:opacity-70'
      }`}
    >
      {succeeded ? (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{successLabel}</span>
        </>
      ) : loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <span>{idleLabel}</span>
          <span className="transition-transform duration-200 group-hover/btn:translate-x-0.5" aria-hidden="true">
            &rarr;
          </span>
        </>
      )}
    </button>
  );
}
