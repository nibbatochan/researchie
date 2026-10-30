'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Key, Copy, Check, Trash, CaretRight, CaretDown } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';
import { useDeleteToast } from './DeleteToast';

// The token that connects the Chrome extension to this site. It ends in this site's address, so in the
// extension you only paste the token: open the popup, click the link icon next to the on/off switch,
// paste, Connect. Shown in Profile (compact) and in Settings -> Account.
//
//   Tester site  : you make a token. It is shown once here, and only its hash is kept on the server.
//   Local server : there are no accounts, so the token is only a pairing code that carries the address.
//                  It appears as soon as the box opens and can be copied again any time.

interface TokenRow {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export const ExtensionConnectionSettings: React.FC<{ compact?: boolean; defaultOpen?: boolean }> = ({ compact = false, defaultOpen = false }) => {
  const notifyDeleted = useDeleteToast();
  const { authRequired } = useAuth();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Closed until the person clicks "Extension token".
  const [open, setOpen] = useState(defaultOpen);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/tokens', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) setTokens(json.data);
    } catch {
      // shown on the next action
    }
  }, []);

  const make = useCallback(async () => {
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
      if (authRequired) await load();
    } catch (e: any) {
      setError(e.message || 'Could not create a token.');
    } finally {
      setBusy(false);
    }
  }, [authRequired, load]);

  useEffect(() => {
    if (authRequired) void load();
    else void make(); // a local server has nothing to protect, so its token is made on the spot
  }, [authRequired, load, make]);

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not revoke the token.');
      notifyDeleted({ kind: 'extension token' });
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

  const box = compact
    ? 'p-2 rounded-xl bg-white dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] space-y-1.5'
    : 'p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-3';

  return (
    <div className={box}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer min-w-0"
        >
          {open ? <CaretDown size={11} weight="bold" className="text-slate-400" /> : <CaretRight size={11} weight="bold" className="text-slate-400" />}
          <Key size={compact ? 13 : 14} className="text-[#325FEC]" />
          <span className="whitespace-nowrap">Extension token</span>
        </button>
        {fresh && (
          <button type="button" onClick={() => copy(fresh)} className="inline-flex items-center gap-1 text-[11px] font-medium text-[#325FEC] dark:text-[#518FFF] cursor-pointer flex-shrink-0">
            {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy token'}
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-slate-600 dark:text-zinc-400">
            Copy the token. In the extension, click the link icon next to the on/off switch, paste it and press Connect.
          </p>

          {fresh ? (
            <div className="space-y-1">
              <code className="block p-1.5 rounded bg-[#F4F6F9] dark:bg-[#202024] font-mono text-[10px] text-slate-600 dark:text-zinc-400 break-all select-all">
                {fresh}
              </code>
              {authRequired && <p className="text-[11px] text-amber-700 dark:text-amber-300">Shown once. Copy it now.</p>}
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={make}
              className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer"
            >
              {busy ? 'Working…' : 'Create token'}
            </button>
          )}
        </div>
      )}

      {open && authRequired && fresh && !compact && (
        <button type="button" disabled={busy} onClick={make} className="text-[11px] text-slate-500 dark:text-zinc-400 hover:underline cursor-pointer">
          Create another token
        </button>
      )}

      {open && authRequired && !compact && tokens.length > 0 && (
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
