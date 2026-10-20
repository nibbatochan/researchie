'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth/authContext';

// Small per-user preferences (citation style, panel width, canvas layout, ...).
//   Local development: kept in this browser's localStorage, exactly as before.
//   Tester site: kept in the user's account (user_settings) and held in memory here. Nothing about the user
//   is written to browser storage. Children render only after the saved values have loaded, so components
//   can read them synchronously.

interface PrefsApi {
  /** False while a signed-in user's saved values are still loading. */
  ready: boolean;
  /** True when preferences are kept in the account instead of the browser. */
  inAccount: boolean;
  /** Why the last save to the account was refused (for example, too large), or null. Cleared by the next good save. */
  saveError: string | null;
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
}

const PrefsContext = createContext<PrefsApi | undefined>(undefined);

const SAVE_DELAY_MS = 600;

export const PrefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authRequired, user, loading } = useAuth();
  const inAccount = authRequired;
  const values = useRef<Record<string, string>>({});
  const pending = useRef<Record<string, string | null>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(!authRequired);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load the account's preferences once a user is known; forget them when the user goes away.
  useEffect(() => {
    if (!authRequired) {
      setReady(true);
      return;
    }
    if (loading) return;
    if (!user) {
      values.current = {};
      pending.current = {};
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    fetch('/api/settings', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json?.success) values.current = { ...(json.data?.prefs ?? {}) };
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authRequired, loading, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(() => {
    timer.current = null;
    const batch = pending.current;
    pending.current = {};
    if (Object.keys(batch).length === 0) return;
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ prefs: batch }),
      keepalive: true,
    }).then(async (res) => {
      if (res.ok) { setSaveError(null); return; }
      // A refusal (too large, bad name) will not get better by trying again, so it is reported, not retried.
      // A server fault or a lost sign-in may, so those changes wait for the next save.
      const json = await res.json().catch(() => ({}));
      setSaveError(typeof json?.error === 'string' ? json.error : 'Your changes could not be saved to your account.');
      if (res.status >= 500 || res.status === 401) pending.current = { ...batch, ...pending.current };
    }).catch(() => {
      // Keep the changes to try again with the next one.
      pending.current = { ...batch, ...pending.current };
    });
  }, []);

  const get = useCallback(
    (key: string) => {
      if (inAccount) return values.current[key] ?? null;
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    [inAccount]
  );

  const write = useCallback(
    (key: string, value: string | null) => {
      if (inAccount) {
        if (value === null) delete values.current[key];
        else values.current[key] = value;
        pending.current[key] = value;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DELAY_MS);
        return;
      }
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        // storage unavailable: the preference just won't persist
      }
    },
    [inAccount, flush]
  );

  const set = useCallback((key: string, value: string) => write(key, value), [write]);
  const remove = useCallback((key: string) => write(key, null), [write]);

  // Send anything still waiting when the tab is hidden or closed.
  useEffect(() => {
    if (!inAccount) return;
    const onHide = () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [inAccount, flush]);

  if (!ready) return null;

  return <PrefsContext.Provider value={{ ready, inAccount, saveError, get, set, remove }}>{children}</PrefsContext.Provider>;
};

export function usePrefs(): PrefsApi {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within a PrefsProvider');
  return ctx;
}
