'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, ArrowSquareOut } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';
import { PERPLEXITY_KEYS_HELP_URL, WEB_EFFORTS, type WebEffort } from '@/lib/ai/webResearch';

// Settings -> AI: the Perplexity key for web search. Separate from the answer provider, so a user can keep Groq
// or Claude for answers and use Perplexity only for web research. The key is checked once with one short call,
// which uses a few tokens of the user's Perplexity credit.

interface WebKeyView {
  configured: boolean;
  last4?: string;
  status?: 'valid' | 'invalid';
  lastCheckedAt?: string | null;
  effort?: WebEffort;
}

export const WebSearchKeySettings: React.FC = () => {
  const { authRequired } = useAuth();
  const [saved, setSaved] = useState<WebKeyView | null>(null);
  const [key, setKey] = useState('');
  const [effort, setEffort] = useState<WebEffort>('fast');
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/web-key', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        setSaved(json.data);
        if (json.data.effort) setEffort(json.data.effort);
      }
    } catch {
      // The panel still works; saving will report the problem.
    }
  }, []);

  useEffect(() => {
    if (authRequired) void load();
  }, [authRequired, load]);

  if (!authRequired) return null;

  const save = async () => {
    setBusy('save');
    setNotice(null);
    try {
      const res = await fetch('/api/settings/web-key', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, effort }),
      });
      const json = await res.json();
      if (json.success) {
        setKey('');
        setSaved(json.data);
        setNotice({ kind: 'ok', text: 'Perplexity connected. Web search is on for your account.' });
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
      const res = await fetch('/api/settings/web-key', { method: 'DELETE', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        setSaved({ configured: false });
        setNotice({ kind: 'ok', text: 'Perplexity key removed.' });
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
        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">Web search (Perplexity)</span>
        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
          The web search button in the AI chat asks Perplexity, which searches the open web. Its answers are not from your clips and are labelled as web answers.
        </span>
      </div>

      {saved?.configured && (
        <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-zinc-300">
          {saved.status === 'invalid' ? <XCircle size={14} className="text-red-500" weight="fill" /> : <CheckCircle size={14} className="text-emerald-500" weight="fill" />}
          <span>
            Perplexity key ending <span className="font-mono">••••{saved.last4}</span>
            {saved.lastCheckedAt ? `, checked ${new Date(saved.lastCheckedAt).toLocaleString()}` : ''}
          </span>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Search depth</span>
        <select
          value={effort}
          onChange={(e) => setEffort(e.target.value as WebEffort)}
          className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none"
        >
          {WEB_EFFORTS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-slate-500 dark:text-zinc-500">Set when you save the key. Deeper search costs more Perplexity credit per question.</span>
      </label>

      <label className="block space-y-1">
        <span className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
          <span>Perplexity API key</span>
          <a href={PERPLEXITY_KEYS_HELP_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-[#325FEC] dark:text-[#518FFF] hover:underline inline-flex items-center gap-1">
            How to get one <ArrowSquareOut size={11} />
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
        <span className="text-[10px] text-slate-500 dark:text-zinc-500">Saving checks the key with one short search, which uses a few tokens.</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null || key.trim().length === 0}
          onClick={save}
          className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer"
        >
          {busy === 'save' ? 'Checking…' : saved?.configured ? 'Replace key' : 'Save and connect'}
        </button>
        <button
          type="button"
          disabled={busy !== null || !saved?.configured}
          onClick={remove}
          className="px-3 py-1.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 rounded-lg text-xs font-medium cursor-pointer"
        >
          {busy === 'remove' ? 'Removing…' : 'Remove key'}
        </button>
      </div>

      {notice && (
        <p role="status" className={`text-[11px] ${notice.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {notice.text}
        </p>
      )}
    </div>
  );
};
