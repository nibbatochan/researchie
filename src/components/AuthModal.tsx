'use client';

import React from 'react';
import Link from 'next/link';
import { X, ShieldCheck } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';
import { ResearchieLogo } from './ResearchieLogo';

// Opened from the "Sign in" button when nobody is signed in. Accounts use email and password on the
// sign-in page; the old social buttons, magic link and demo shortcut are gone.
export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen } = useAuth();

  if (!isAuthModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-popIn">
        <div className="p-6 pb-4 border-b border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#18181B] relative">
          <button
            onClick={() => setIsAuthModalOpen(false)}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#325FEC] flex items-center justify-center p-1.5 text-white shadow-xs">
              <ResearchieLogo className="w-full h-full text-white" />
            </div>
            <span className="font-display font-bold text-base text-[#0F172A] dark:text-white">researchie</span>
          </div>

          <h2 className="font-display font-bold text-lg text-[#0F172A] dark:text-white">Sign in to your workspace</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Your clips, projects and documents are private to your account.
          </p>
        </div>

        <div className="p-6 flex gap-2 font-sans text-xs">
          <Link
            href="/login"
            onClick={() => setIsAuthModalOpen(false)}
            className="flex-1 text-center py-2.5 bg-[#325FEC] hover:bg-[#274AC4] text-white font-semibold rounded-xl shadow-xs transition-all"
          >
            Sign in
          </Link>
          <Link
            href="/login?tab=register"
            onClick={() => setIsAuthModalOpen(false)}
            className="flex-1 text-center py-2.5 bg-white dark:bg-[#1C1C20] hover:bg-slate-50 dark:hover:bg-[#25252A] text-[#0F172A] dark:text-white font-semibold border border-[#D9E1EC] dark:border-[#27272A] rounded-xl shadow-xs transition-all"
          >
            Create account
          </Link>
        </div>

        <div className="px-6 py-3 bg-[#EEF3F8] dark:bg-[#18181B] border-t border-[#D9E1EC] dark:border-[#27272A] flex items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-500">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Secure cookie session. Passwords are handled by Supabase Auth.</span>
        </div>
      </div>
    </div>
  );
};
