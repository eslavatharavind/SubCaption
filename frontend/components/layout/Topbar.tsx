'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/ui/Logo';

interface TopbarProps {
  title?: string;
}

export default function Topbar({ title }: TopbarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Deriving title if not explicitly passed
  const getPageTitle = () => {
    if (title) return title;
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/upload')) return 'Create Video';
    if (pathname.startsWith('/templates')) return 'Template Gallery';
    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/editor') || pathname.startsWith('/project')) return 'Caption Editor';
    return 'SubCaption';
  };

  const isDashboard = title === 'Dashboard' || pathname.startsWith('/dashboard');

  return (
    <header className="h-16 bg-[#11151A]/90 backdrop-blur border-b border-[#262D36] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-brand-muted hover:text-white hover:bg-brand-elevated shrink-0"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Mobile Brand Logo: compact icon visible only on mobile viewports when drawer is closed */}
        {!mobileMenuOpen && (
          <Link
            href="/dashboard"
            className="md:hidden flex items-center shrink-0"
            aria-label="SubCaption Home"
          >
            <Logo size="sm" showText={false} priority />
          </Link>
        )}

        {!isDashboard && getPageTitle() && (
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight truncate">
            {getPageTitle()}
          </h1>
        )}
      </div>

      {/* Right: Profile */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* User Pill */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center text-xs font-bold">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-xs text-brand-muted font-medium hidden md:inline truncate max-w-[120px]">
            {user?.email}
          </span>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 h-[100dvh] bg-black/70 backdrop-blur-sm z-50 md:hidden flex flex-col">
          <div className="bg-[#11151A] border-b border-[#262D36] p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between">
            <div className="flex items-center">
              <Logo size="md" />
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 flex items-center justify-center text-2xl rounded-xl text-brand-muted hover:text-white"
              aria-label="Close menu"
            >
              &times;
            </button>
          </div>

          <nav className="p-4 space-y-2 bg-[#11151A] flex-1 overflow-y-auto">
            {[
              { name: 'Dashboard', href: '/dashboard' },
              { name: 'Create Video', href: '/upload' },
              { name: 'Templates', href: '/templates' },
              { name: 'Settings', href: '/settings' },
            ].map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block p-3 rounded-xl text-sm font-semibold ${
                    isActive ? 'bg-brand-card text-white' : 'hover:bg-brand-card text-brand-muted hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-[#11151A] border-t border-[#262D36]">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="w-full py-2.5 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm font-semibold"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
