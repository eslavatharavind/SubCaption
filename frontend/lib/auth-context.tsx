'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: ensure loading resolves within 4 seconds even if network/Supabase hangs
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 4000);

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        if (error) {
          console.error('Error fetching Supabase session:', error.message);
        }
        setUser(session?.user ?? null);
        if (session?.access_token) {
          localStorage.setItem('access_token', session.access_token);
        } else {
          localStorage.removeItem('access_token');
        }
        setLoading(false);
        clearTimeout(timeoutId);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Unexpected auth initialization error:', err);
        setUser(null);
        localStorage.removeItem('access_token');
        setLoading(false);
        clearTimeout(timeoutId);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.access_token) {
        localStorage.setItem('access_token', session.access_token);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('access_token');
      }
      setLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('access_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
