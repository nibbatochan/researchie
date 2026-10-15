'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// The session lives in an httpOnly cookie that only the server can read. This file never stores anything
// about the user in the browser: it asks /api/auth/me who is signed in and keeps the answer in memory.
//
// Two modes, chosen by the server (AUTH_REQUIRED):
//   authRequired = false  local development: one built-in demo user, no sign-in.
//   authRequired = true   the tester deployment: real accounts, and no demo user.

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'apple' | 'facebook' | 'github' | 'email' | 'demo';
  /** Only the local demo user has a plan badge. */
  tier?: 'free' | 'pro' | 'team';
  createdAt: string;
}

type AuthResult = { success: boolean; message: string; needsConfirmation?: boolean };

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  /** True on the tester deployment, where signing in is required. */
  authRequired: boolean;
  signInWithOAuth: (provider: 'google' | 'apple' | 'facebook' | 'github') => Promise<{ success: boolean; message?: string }>;
  signInWithEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (name: string, email: string, password: string) => Promise<AuthResult>;
  /** Local development only. Does nothing when sign-in is required. */
  signInAsDemo: (tier?: 'free' | 'pro' | 'team') => void;
  signOut: (opts?: { everywhere?: boolean }) => Promise<void>;
  /** Re-read who is signed in. */
  refresh: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const DEFAULT_DEMO_USER: UserProfile = {
  id: 'user-01',
  email: 'researcher@researchie.ai',
  name: 'Alex Chen',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  provider: 'demo',
  tier: 'pro',
  createdAt: '2026-09-25T08:00:00Z',
};

// Pages a signed-out visitor may open on the tester deployment.
const PUBLIC_PATHS = ['/login', '/signup', '/auth', '/share'];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: any }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: 'Could not reach the server. Check your connection.' } };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  // NEXT_PUBLIC_AUTH_REQUIRED only picks the first paint (so the demo user never flashes on the tester
  // deployment); /api/auth/me below is what decides.
  const startsRequired = process.env.NEXT_PUBLIC_AUTH_REQUIRED === 'true';
  const [user, setUser] = useState<UserProfile | null>(startsRequired ? null : DEFAULT_DEMO_USER);
  const [authRequired, setAuthRequired] = useState(startsRequired);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      const data = await res.json();
      setAuthRequired(Boolean(data.authRequired));
      setUser(data.authRequired ? data.user : DEFAULT_DEMO_USER);
    } catch {
      // Server unreachable: keep what we have rather than signing anyone out by accident.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A session that ends while the app is open (expired, signed out in another tab) shows up as a 401 from
  // our own API. Treat it as signed out, so the redirect below sends the user to the sign-in page.
  useEffect(() => {
    if (!authRequired) return;
    const original = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);
      if (res.status === 401) {
        try {
          const raw = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
          const url = new URL(raw, window.location.origin);
          const ours = url.origin === window.location.origin && url.pathname.startsWith('/api/');
          if (ours && !url.pathname.startsWith('/api/auth/login') && !url.pathname.startsWith('/api/auth/signup')) setUser(null);
        } catch {
          // not a URL we can read: leave it
        }
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, [authRequired]);

  // On the tester deployment every page except the public ones needs a signed-in user.
  useEffect(() => {
    if (loading || !authRequired || user) return;
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname?.startsWith(p + '/'))) return;
    router.replace('/login');
  }, [loading, authRequired, user, pathname, router]);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple' | 'facebook' | 'github') => {
    // PLACEHOLDER: social sign-in is not built. Google is set up by hand in the Supabase dashboard later.
    // When it is, start the flow from a server route (so the PKCE verifier cookie is httpOnly) and
    // send the user to /auth/callback. Until then nothing here pretends to sign anyone in.
    return {
      success: false,
      message: provider === 'google' ? 'Google sign-in is coming soon. Use email and password for now.' : 'This sign-in method is not available.',
    };
  }, []);

  const signInWithEmail = useCallback(async () => {
    return { success: false, message: 'Magic links are not available. Use email and password.' };
  }, []);

  const signUpWithPassword = useCallback(async (name: string, email: string, password: string): Promise<AuthResult> => {
    const { ok, data } = await postJson('/api/auth/signup', { name, email, password });
    if (!ok || !data.success) return { success: false, message: data.error || 'Could not create the account.' };
    if (data.needsConfirmation) {
      return { success: true, needsConfirmation: true, message: 'Check your email and open the link to finish creating your account.' };
    }
    await refresh();
    return { success: true, message: 'Account created.' };
  }, [refresh]);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { ok, data } = await postJson('/api/auth/login', { email, password });
    if (!ok || !data.success) return { success: false, message: data.error || 'Could not log in.' };
    await refresh();
    return { success: true, message: 'Signed in.' };
  }, [refresh]);

  const signInAsDemo = useCallback((tier: 'free' | 'pro' | 'team' = 'pro') => {
    if (authRequired) return;
    setUser({ ...DEFAULT_DEMO_USER, tier });
    setIsAuthModalOpen(false);
  }, [authRequired]);

  const signOut = useCallback(async (opts?: { everywhere?: boolean }) => {
    if (authRequired) {
      await postJson('/api/auth/logout', { everywhere: Boolean(opts?.everywhere) });
      setUser(null);
      // A full load, so nothing from the last account stays in memory.
      window.location.assign('/login');
      return;
    }
    // Local development has no session to end.
    setUser(DEFAULT_DEMO_USER);
  }, [authRequired]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authRequired,
        signInWithOAuth,
        signInWithEmail,
        signInWithPassword,
        signUpWithPassword,
        signInAsDemo,
        signOut,
        refresh,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
