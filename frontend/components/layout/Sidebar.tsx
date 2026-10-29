'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/ui/Logo';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 00-1 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Create Video',
      href: '/upload',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      name: 'Templates',
      href: '/templates',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col bg-[#11151A] border-r border-[#262D36] transition-all duration-300 z-40 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center border-b border-[#262D36] ${
          collapsed ? 'px-2.5 justify-between' : 'px-4 justify-between'
        }`}
      >
        <Link
          href="/dashboard"
          className="flex items-center shrink-0"
          aria-label="SubCaption Home"
        >
          <Logo
            size={collapsed ? 'sm' : 'md'}
            showText={!collapsed}
            priority
          />
        </Link>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-brand-elevated transition-colors shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-3 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-600/15 text-primary-400 border border-primary-500/30'
                  : 'text-brand-muted hover:text-white hover:bg-brand-card'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <div className="shrink-0">{item.icon}</div>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile at Bottom */}
      <div className="p-3 border-t border-[#262D36]">
        <div
          className={`flex items-center justify-between p-2 rounded-xl bg-[#151A21] border border-[#262D36] ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary-600/20 text-primary-400 border border-primary-500/30 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-[10px] text-brand-subtle truncate">{user?.email}</p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => signOut()}
              className="text-brand-subtle hover:text-red-400 p-1 rounded-lg transition-colors"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
