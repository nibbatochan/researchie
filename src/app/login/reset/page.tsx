'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LockSimple, ArrowRight, CheckCircle, WarningCircle } from '@phosphor-icons/react';

// Where the reset link lands after /auth/callback has signed the person in. They choose a new password here.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage({ text: 'The two passwords do not match.', type: 'error' });
      return;
    }
    setIsLoading(true);
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await res.json().catch(() => ({}));
    setIsLoading(false);
    if (res.ok && json.success) {
      setMessage({ text: 'Password changed. Opening your workspace…', type: 'success' });
      router.push('/');
    } else {
      setMessage({ text: json.error || 'The password could not be changed.', type: 'error' });
    }
  };

  return (
    <div className="ob-grid min-h-screen bg-[#EAEEF4] dark:bg-[#09090B] flex flex-col justify-center items-center p-4 font-sans text-slate-800 dark:text-zinc-200">
      <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl shadow-sm p-6 space-y-4">
        <h1 className="font-display font-bold text-xl text-[#0F172A] dark:text-white">Choose a new password</h1>

        {message && (
          <div role={message.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${message.type === 'success' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'}`}>
            {message.type === 'success' ? <CheckCircle size={15} weight="bold" /> : <WarningCircle size={15} weight="bold" />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">New password</label>
            <div className="relative flex items-center">
              <LockSimple size={15} className="absolute left-3 text-slate-400" />
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">Confirm new password</label>
            <div className="relative flex items-center">
              <LockSimple size={15} className="absolute left-3 text-slate-400" />
              <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type it again" className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-[#325FEC] hover:bg-[#274AC4] text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            <span>{isLoading ? 'Saving…' : 'Save new password'}</span>
            <ArrowRight size={13} weight="bold" />
          </button>
        </form>

        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          Link expired? <Link href="/login" className="font-semibold text-[#325FEC] dark:text-[#518FFF] hover:underline">Ask for a new one</Link>.
        </p>
      </div>
    </div>
  );
}
