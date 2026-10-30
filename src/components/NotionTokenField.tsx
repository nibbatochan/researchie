'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useDeleteToast } from './DeleteToast';
import { Key } from '@phosphor-icons/react';

// The Notion token on the tester site: saved encrypted in the account (S-46), so it is pasted once, not at every
// visit. The server only ever tells the browser the last four characters. Used in Settings and in the Export box.
// onStatus tells the parent whether a token is saved, so the Export box can push without asking for it again.

const input =
  'w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono';

export const NotionTokenField: React.FC<{ onStatus?: (configured: boolean) => void }> = ({ onStatus }) => {
  const notifyDeleted = useDeleteToast();
  const [loaded, setLoaded] = useState(false);
  const [last4, setLast4] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    (configured: boolean, tail?: string) => {
      setLast4(configured ? tail ?? '' : null);
      onStatus?.(configured);
    },
    [onStatus],
  );

  useEffect(() => {
    fetch('/api/settings/notion-token', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => apply(Boolean(j.data?.configured), j.data?.last4))
      .catch(() => apply(false))
      .finally(() => setLoaded(true));
  }, [apply]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/notion-token', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not save the token.');
      setToken('');
      setReplacing(false);
      apply(true, json.data?.last4);
    } catch (e: any) {
      setError(e.message || 'Could not save the token.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/notion-token', { method: 'DELETE', credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not remove the token.');
      notifyDeleted({ kind: 'Notion token' });
      apply(false);
    } catch (e: any) {
      setError(e.message || 'Could not remove the token.');
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;
  const showInput = last4 === null || replacing;

  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
        <Key size={13} className="text-slate-500" />
        <span>Notion Internal Integration Token</span>
      </label>
      {showInput ? (
        <>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="secret_..." autoComplete="off" className={input} />
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy || !token.trim()} onClick={save} className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer">
              {busy ? 'Saving…' : 'Save to my account'}
            </button>
            {replacing && (
              <button type="button" disabled={busy} onClick={() => { setReplacing(false); setToken(''); setError(null); }} className="text-[11px] text-slate-500 dark:text-zinc-400 hover:underline cursor-pointer">
                Cancel
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">
            Saved encrypted in your account, so you paste it once. Get a free token at{' '}
            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">notion.so/my-integrations ↗</a>
          </span>
        </>
      ) : (
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-mono text-slate-600 dark:text-zinc-400">Saved: ••••{last4}</span>
          <span className="flex items-center gap-3">
            <button type="button" disabled={busy} onClick={() => setReplacing(true)} className="text-[#325FEC] dark:text-[#518FFF] cursor-pointer">Replace</button>
            <button type="button" disabled={busy} onClick={remove} className="text-red-600 dark:text-red-400 cursor-pointer">Remove</button>
          </span>
        </div>
      )}
      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
