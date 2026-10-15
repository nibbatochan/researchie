'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Key, Copy, Check, Trash } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';

// Settings -> Account: make a token for the Chrome extension. The token is shown once, here, and only its
// hash is kept on the server. In the extension: open the popup, "Connect", paste the server address and token.

interface TokenRow {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const ExtensionConnectionSettings: React.FC = () => {
  const { authRequired } = useAuth();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/tokens', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) setTokens(json.data);
    } catch {
      // shown on the next action
    }
  }, []);

  useEffect(() => {
    if (authRequired) void load();
  }, [authRequired, load]);

  if (!authRequired) return null;

  const serverUrl = typeof window !== 'undefined' ? window.location.origin : '';

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ label: 'Chrome extension' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not create a token.');
      setFresh(json.token);
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not create a token.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not revoke the token.');
      await load();
    } catch (e: any) {
      setError(e.message || 'Could not revoke the token.');
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200">
        <Key size={14} className="text-[#325FEC]" />
        <span>Chrome extension connection</span>
      </div>
      <ol className="text-[11px] text-slate-600 dark:text-zinc-400 list-decimal pl-4 space-y-0.5">
        <li>Create a token below and copy it. It is shown only once.</li>
        <li>In the extension popup open &quot;Connect&quot; and paste this server address and the token.</li>
      </ol>
      <div className="text-[11px] text-slate-600 dark:text-zinc-400">
        Server address: <code className="font-mono select-all">{serverUrl}</code>
      </div>

      {fresh && (
        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
            <span>Copy it now. You will not see it again.</span>
            <button type="button" onClick={() => copy(fresh)} className="inline-flex items-center gap-1 font-medium cursor-pointer">
              {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy token'}
            </button>
          </div>
          <code className="block p-1.5 rounded bg-white/60 dark:bg-black/30 font-mono text-[11px] break-all select-all">{fresh}</code>
        </div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={create}
        className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer"
      >
        Create token
      </button>

      {tokens.length > 0 && (
        <ul className="divide-y divide-[#D2DCEA] dark:divide-[#27272A] text-[11px] text-slate-600 dark:text-zinc-400">
          {tokens.map((t) => (
            <li key={t.id} className="py-1.5 flex items-center justify-between gap-2">
              <span>
                {t.label}, made {new Date(t.createdAt).toLocaleDateString()}
                {t.lastUsedAt ? `, last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : ', never used'}
              </span>
              <button type="button" disabled={busy} onClick={() => revoke(t.id)} aria-label="Revoke token" className="text-red-500 hover:text-red-600 cursor-pointer">
                <Trash size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
