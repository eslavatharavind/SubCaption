'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { AuthMascot, MascotMood } from './AuthMascot';
import { Logo } from '@/components/ui/Logo';

interface AuthLayoutProps {
  mood: MascotMood;
  bubble: string;
  panelTitle: string;
  panelBody: string;
  children: ReactNode;
}

function Bubble({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div
      className={`auth-bubble relative rounded-xl border border-white/10 bg-[#151A21] text-[#E8ECF2] shadow-lg ${
        compact ? 'px-3 py-2 text-[13px] leading-snug' : 'px-4 py-3 text-[15px] leading-snug'
      }`}
      role="status"
      aria-live="polite"
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 border-b border-l border-white/10 bg-[#151A21] ${
          compact ? '-left-1.5' : '-left-1.5'
        }`}
        aria-hidden="true"
      />
      <span className="relative">{text}</span>
      {!compact && (
        <span className="auth-nudge ml-1.5 text-primary-400" aria-hidden="true">
          &rarr;
        </span>
      )}
    </div>
  );
}

export function AuthLayout({ mood, bubble, panelTitle, panelBody, children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#0B0D10] text-[#E8ECF2] md:flex">
      <Link
        href="/"
        className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#9AA4B2] transition-colors hover:bg-white/[0.05] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 sm:left-5 sm:top-5"
      >
        <span aria-hidden="true">&larr;</span> Back to Home
      </Link>

      {/* Desktop/tablet side panel */}
      <aside className="relative hidden overflow-hidden border-r border-white/[0.06] bg-[#0E1116] md:flex md:w-[46%] lg:w-1/2 flex-col justify-between px-10 pb-10 pt-24 lg:px-14">
        <div className="landing-dots pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative max-w-md auth-rise">
          <div className="flex items-center">
            <Logo size="lg" priority />
          </div>
          <h1 className="mt-8 text-3xl font-semibold leading-tight tracking-tight text-[#F5F7FA] lg:text-[2.4rem]">
            {panelTitle}
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#9AA4B2]">{panelBody}</p>
        </div>

        <div className="relative flex items-end gap-4">
          <AuthMascot mood={mood} className="h-40 w-36 shrink-0 lg:h-44 lg:w-40" />
          <div className="mb-16 max-w-[240px]">
            <Bubble text={bubble} />
          </div>
        </div>

        {/* Caption-timeline detail */}
        <div className="relative" aria-hidden="true">
          <div className="landing-ticks h-2.5" />
          <div className="mt-2 flex gap-1.5">
            <span className="h-1.5 w-16 rounded-full bg-white/10" />
            <span className="h-1.5 w-24 rounded-full bg-primary-500/40" />
            <span className="h-1.5 w-12 rounded-full bg-white/10" />
            <span className="h-1.5 w-20 rounded-full bg-white/10" />
          </div>
        </div>
      </aside>

      {/* Form column */}
      <main className="flex flex-1 items-center justify-center px-5 pb-10 pt-20 sm:px-8 md:py-16">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand header */}
          <div className="mb-6 flex items-center justify-center md:hidden">
            <Logo size="md" priority />
          </div>
          {/* Compact mascot for small screens */}
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <AuthMascot mood={mood} className="h-[72px] w-[66px] shrink-0" />
            <Bubble text={bubble} compact />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
