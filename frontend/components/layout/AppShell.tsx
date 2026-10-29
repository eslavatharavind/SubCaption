'use client';

import { useState, ReactNode } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppShellProps {
  children: ReactNode;
  title?: string;
  hideSidebar?: boolean;
}

export default function AppShell({ children, title, hideSidebar = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0B0D10] text-[#F5F7FA] flex overflow-hidden h-[100dvh]">
        {/* Desktop Sidebar */}
        {!hideSidebar && (
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed(!collapsed)}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto overflow-x-hidden">
          {!hideSidebar && <Topbar title={title} />}
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
