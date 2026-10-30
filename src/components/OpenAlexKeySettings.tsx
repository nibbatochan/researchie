'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useDeleteToast } from './DeleteToast';
import { CheckCircle, ArrowSquareOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';

// Settings -> Paper search: the OpenAlex key. Optional. Without it, paper search shares one small daily allowance
// with everyone on the network. The key is checked once with one tiny call.

const OPENALEX_KEY_URL = 'https://openalex.org/settings/api';

interface KeyView {
  configured: boolean;
  last4?: string;
  status?: 'valid' | 'invalid';
  lastCheckedAt?: string | null;
}

export const OpenAlexKeySettings: React.FC = () => {
  const notifyDeleted = useDeleteToast();
  const { authRequired } = useAuth();
  const [saved, setSaved] = useState<KeyView | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/openalex-key', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) setSaved(json.data);
    } catch {
      // The panel still works; saving will report the problem.
    }
  }, []);

  useEffect(() => {
    if (authRequired) void load();
  }, [authRequired, load]);

  // Locally the key comes from .env.local, so this panel is for the signed-in deployment only.
  if (!authRequired) return null;

  const save = async () => {
    setBusy('save');
    setNotice(null);
    try {
      const res = await fetch('/api/settings/openalex-key', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const json = await res.json();
      if (json.success) {
        setKey('');
        setSaved(json.data);
        setNotice({ kind: 'ok', text: 'OpenAlex key saved. Paper search uses your own allowance.' });
      } else {
        setNotice({ kind: 'error', text: json.error || 'Could not save the key.' });
      }
    } catch {
      setNotice({ kind: 'error', text: 'Could not reach the server. Try again.' });
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy('remove');
    setNotice(null);
    try {
      const res = await fetch('/api/settings/openalex-key', { method: 'DELETE', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        setSaved({ configured: false });
        setNotice({ kind: 'ok', text: 'OpenAlex key removed. Paper search now shares the free daily allowance.' });
        notifyDeleted({ kind: 'OpenAlex key' });
      } else {
        setNotice({ kind: 'error', text: json.error || 'Could not remove the key.' });
      }
    } catch {
      setNotice({ kind: 'error', text: 'Could not reach the server. Try again.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-3">
      <div>
        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Paper search (OpenAlex)</span>
        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
          Finds research papers and their abstracts to support answers in the AI chat. Optional. Without your own key, searches share a small daily allowance.
        </span>
      </div>

      {saved?.configured && (
        <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-zinc-300">
          <CheckCircle size={14} className="text-emerald-500" weight="fill" />
          <span>
            OpenAlex key ending <span className="font-mono">••••{saved.last4}</span>
            {saved.lastCheckedAt ? `, checked ${new Date(saved.lastCheckedAt).toLocaleString()}` : ''}
          </span>
        </div>
      )}

      <label className="block space-y-1">
        <span className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
          <span>OpenAlex API key</span>
          <a href={OPENALEX_KEY_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-[#325FEC] dark:text-[#518FFF] hover:underline inline-flex items-center gap-1">
            Get a free key <ArrowSquareOut size={11} />
          </a>
        </span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={saved?.configured ? 'Paste a new key to replace the saved one' : 'Paste your key'}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none font-mono"
        />
        <span className="text-[10px] text-slate-500 dark:text-zinc-500">Saving checks the key with one short call. The key is stored encrypted and never shown again.</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null || key.trim().length === 0}
          onClick={save}
          className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer"
        >
          {busy === 'save' ? 'Checking…' : saved?.configured ? 'Replace key' : 'Save key'}
        </button>
        {saved?.configured && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={remove}
            className="px-3 py-1.5 border border-[#D2DCEA] dark:border-[#27272A] text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-[#202024] disabled:opacity-50"
          >
            {busy === 'remove' ? 'Removing…' : 'Remove key'}
          </button>
        )}
      </div>

      {notice && (
        <p role="status" className={`text-[11px] ${notice.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {notice.text}
        </p>
      )}
    </div>
  );
};
