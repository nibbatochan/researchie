'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Warning, ShieldCheck, ArrowSquareOut, CheckCircle, XCircle, Eye, EyeSlash } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';
import { DEFAULT_PROVIDER, MEDICAL_DATA_NOTICE, PROVIDERS, PROVIDER_ORDER, getProvider, type ProviderId } from '@/lib/ai/providers';

// Settings -> AI: pick a provider, paste your own key, test it, remove it. The key goes to our server once
// and is stored encrypted there; this component only ever sees the last four characters back.

interface KeyView {
  configured: boolean;
  provider?: ProviderId;
  model?: string;
  last4?: string;
  status?: 'unchecked' | 'valid' | 'invalid';
  lastCheckedAt?: string | null;
}

type Notice = { kind: 'ok' | 'error'; text: string; helpUrl?: string } | null;

const LEVEL_STYLE = {
  ok: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300',
  check: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300',
  warn: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300',
} as const;

export const AiProviderSettings: React.FC = () => {
  const { authRequired } = useAuth();
  const [saved, setSaved] = useState<KeyView | null>(null);
  const [provider, setProvider] = useState<ProviderId>(DEFAULT_PROVIDER);
  const [model, setModel] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<'save' | 'test' | 'remove' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const info = getProvider(provider);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/ai-key', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        setSaved(json.data);
        if (json.data.configured) {
          setProvider(json.data.provider);
          setModel(json.data.model || '');
        }
      }
    } catch {
      // The panel still works; saving will report the problem.
    }
  }, []);

  useEffect(() => {
    if (authRequired) void load();
  }, [authRequired, load]);

  if (!authRequired) {
    return (
      <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] text-[11px] text-slate-600 dark:text-zinc-400">
        Local mode: AI uses the key set as <code className="font-mono">GROQ_API_KEY</code> in <code className="font-mono">.env.local</code>. On the tester site each person adds their own key here.
      </div>
    );
  }

  async function call(method: 'PUT' | 'POST' | 'DELETE', kind: 'save' | 'test' | 'remove') {
    setBusy(kind);
    setNotice(null);
    try {
      const res = await fetch('/api/settings/ai-key', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: method === 'PUT' ? JSON.stringify({ provider, key, model: model.trim() || undefined }) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (json.data) setSaved(json.data);
      if (method === 'PUT' && json.success) setKey('');
      if (method === 'DELETE' && json.success) {
        setKey('');
        setNotice({ kind: 'ok', text: 'Key removed. AI features are off until you add another.' });
        return;
      }
      setNotice({
        kind: json.success ? 'ok' : 'error',
        text: json.message || json.error || (json.success ? 'Done.' : 'Something went wrong.'),
        helpUrl: json.helpUrl,
      });
    } catch {
      setNotice({ kind: 'error', text: 'Could not reach the server. Check your connection.' });
    } finally {
      setBusy(null);
    }
  }

  const connected = saved?.configured ? PROVIDERS[saved.provider as ProviderId] : null;

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-3">
      <div>
        <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block">AI provider and key</span>
        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
          Summaries, Q&amp;A and synthesis run on your own account with the provider. The key is stored encrypted on our server and is never shown again.
        </span>
      </div>

      {connected && (
        <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-zinc-300">
          {saved?.status === 'invalid' ? <XCircle size={14} className="text-red-500" weight="fill" /> : <CheckCircle size={14} className="text-emerald-500" weight="fill" />}
          <span>
            {connected.label}, key ending <span className="font-mono">••••{saved?.last4}</span>
            {saved?.status === 'invalid' ? ' (rejected on the last check)' : ''}
            {saved?.lastCheckedAt ? `, checked ${new Date(saved.lastCheckedAt).toLocaleString()}` : ''}
          </span>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Provider</span>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as ProviderId);
            setModel('');
            setNotice(null);
          }}
          className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none"
        >
          {PROVIDER_ORDER.map((id) => (
            <option key={id} value={id}>
              {PROVIDERS[id].label}
              {PROVIDERS[id].recommended ? ' (recommended)' : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-zinc-400">
        <p>{info.freeTier}</p>
        <p className={`p-2 rounded-lg border flex gap-2 ${LEVEL_STYLE[info.privacy.level]}`}>
          {info.privacy.level === 'ok' ? <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" /> : <Warning size={14} className="flex-shrink-0 mt-0.5" weight="fill" />}
          <span>{info.privacy.text}</span>
        </p>
      </div>

      <label className="block space-y-1">
        <span className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
          <span>API key</span>
          <a href={info.keysUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-[#325FEC] dark:text-[#518FFF] hover:underline inline-flex items-center gap-1">
            Get a free key <ArrowSquareOut size={11} />
          </a>
        </span>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder={saved?.configured ? 'Paste a new key to replace the saved one' : 'Paste your key'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none font-mono"
          />
          <button type="button" onClick={() => setShowKey(!showKey)} aria-label={showKey ? 'Hide key' : 'Show key'} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white">
            {showKey ? <EyeSlash size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Model</span>
        <input
          type="text"
          spellCheck={false}
          placeholder={info.defaultModel}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg text-xs bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-800 dark:text-zinc-200 outline-none font-mono"
        />
        <span className="text-[10px] text-slate-500 dark:text-zinc-500">Leave empty to use {info.defaultModel}. Model names change; if answers fail, check the provider&apos;s list.</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null || key.trim().length === 0}
          onClick={() => call('PUT', 'save')}
          className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer"
        >
          {busy === 'save' ? 'Checking…' : saved?.configured ? 'Replace key' : 'Save and connect'}
        </button>
        <button
          type="button"
          disabled={busy !== null || !saved?.configured}
          onClick={() => call('POST', 'test')}
          className="px-3 py-1.5 bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] disabled:opacity-50 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-medium cursor-pointer"
        >
          {busy === 'test' ? 'Testing…' : 'Test connection'}
        </button>
        <button
          type="button"
          disabled={busy !== null || !saved?.configured}
          onClick={() => call('DELETE', 'remove')}
          className="px-3 py-1.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 rounded-lg text-xs font-medium cursor-pointer"
        >
          {busy === 'remove' ? 'Removing…' : 'Remove key'}
        </button>
      </div>

      {notice && (
        <p role="status" className={`text-[11px] ${notice.kind === 'ok' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {notice.text}{' '}
          {notice.helpUrl && (
            <a href={notice.helpUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Get a key
            </a>
          )}
        </p>
      )}

      <p className="text-[10px] text-slate-500 dark:text-zinc-500">{MEDICAL_DATA_NOTICE}</p>
    </div>
  );
};
