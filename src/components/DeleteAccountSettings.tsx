'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Warning } from '@phosphor-icons/react';

// Settings -> Account & Security. Deleting the account needs a one-time code from an authenticator app, so the
// app is set up here first (S-43). The server checks the password, the code and the word DELETE.

const box = 'p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-3';
const input =
  'w-full px-2.5 py-1.5 rounded-lg bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-xs text-slate-900 dark:text-white outline-none focus:border-[#325FEC]';

export const DeleteAccountSettings: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/auth/totp', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => setEnabled(Boolean(j.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  async function startSetup() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/totp', { method: 'POST', credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not start the set-up.');
      setSetup({ secret: json.secret, uri: json.uri });
    } catch (e: any) {
      setMessage({ text: e.message || 'Could not start the set-up.', error: true });
    } finally {
      setBusy(false);
    }
  }

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/totp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ code: setupCode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not turn it on.');
      setEnabled(true);
      setSetup(null);
      setSetupCode('');
      setMessage({ text: 'Authenticator app is on. You can now delete the account.', error: false });
    } catch (e: any) {
      setMessage({ text: e.message || 'Could not turn it on.', error: true });
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password, code, confirm: typed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not delete the account.');
      window.location.href = '/login';
    } catch (e: any) {
      setMessage({ text: e.message || 'Could not delete the account.', error: true });
      setBusy(false);
    }
  }

  if (enabled === null) return null;

  return (
    <>
      {/* Authenticator app set-up */}
      <div className={box}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200">
          <ShieldCheck size={14} className="text-[#325FEC]" />
          <span>Authenticator app</span>
          <span className="ml-auto text-[10px] font-mono text-slate-500 dark:text-zinc-400">{enabled ? 'On' : 'Off'}</span>
        </div>
        {enabled ? (
          <p className="text-[11px] text-slate-600 dark:text-zinc-400">Needed to delete the account. Set up once; it cannot be reset from here.</p>
        ) : !setup ? (
          <>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400">
              Needed before you can delete the account. Add the code to an authenticator app (Google Authenticator, 1Password, Authy and similar).
            </p>
            <button type="button" disabled={busy} onClick={startSetup} className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer">
              {busy ? 'Working…' : 'Set up authenticator app'}
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-600 dark:text-zinc-400">In your app, add a new account with this key (or open the address on a phone that has the app):</p>
            <code className="block p-1.5 rounded bg-[#F4F6F9] dark:bg-[#202024] font-mono text-[10px] text-slate-600 dark:text-zinc-400 break-all select-all">{setup.secret}</code>
            <input className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code from the app" value={setupCode} onChange={(e) => setSetupCode(e.target.value)} />
            <button type="button" disabled={busy || setupCode.length !== 6} onClick={turnOn} className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer">
              {busy ? 'Checking…' : 'Turn on'}
            </button>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-red-300 dark:border-red-900/70 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
          <Warning size={14} />
          <span>Delete account</span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-zinc-400">
          Deletes your projects, clips, documents, settings, AI keys, extension tokens and login. This cannot be undone.
        </p>
        {!confirming ? (
          <button type="button" disabled={!enabled} onClick={() => setConfirming(true)} className="px-3 py-1.5 border border-red-400 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50 rounded-lg text-xs font-medium cursor-pointer">
            Delete my account…
          </button>
        ) : (
          <div className="space-y-2">
            <input className={input} type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className={input} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code from the app" value={code} onChange={(e) => setCode(e.target.value)} />
            <input className={input} placeholder='Type DELETE to confirm' value={typed} onChange={(e) => setTyped(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button type="button" disabled={busy} onClick={() => { setConfirming(false); setMessage(null); }} className="px-3 py-1.5 border border-[#D2DCEA] dark:border-[#27272A] text-slate-700 dark:text-zinc-300 rounded-lg text-xs cursor-pointer">
                Cancel
              </button>
              <button type="button" disabled={busy || !password || code.length !== 6 || typed !== 'DELETE'} onClick={deleteAccount} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer">
                {busy ? 'Deleting…' : 'Delete everything'}
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <p className={`text-[11px] ${message.error ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{message.text}</p>
      )}
    </>
  );
};
