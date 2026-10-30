'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  SignOut,
  CaretDown,
  UserSwitch
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';
import { forgetAccount, listAccounts } from '@/lib/auth/knownAccounts';

// "Switch account" (S-44). Lists the other addresses used to sign in on this browser. Choosing one signs out and
// opens the sign-in page with that address filled in; the password is still typed. Only addresses are kept.
const SwitchAccount: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, authRequired, signOut } = useAuth();
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    setAccounts(listAccounts(window.localStorage));
  }, []);

  const mine = (user?.email || '').toLowerCase();
  const others = accounts.filter((e) => e !== mine);
  const rowClass =
    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] transition-colors cursor-pointer';

  return (
    <div className="space-y-0.5">
      {authRequired && others.length > 0 && (
        <>
          <div className="px-2 pt-1 text-[10px] text-slate-500 dark:text-zinc-400">Switch to</div>
          {others.map((email) => (
            <div key={email} className="flex items-center group/acct">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void signOut({ switchTo: email });
                }}
                title={`Signs out and opens the sign-in page for ${email}`}
                className={rowClass + ' min-w-0'}
              >
                <UserSwitch size={14} className="text-[#325FEC] dark:text-[#518FFF] flex-shrink-0" />
                <span className="truncate">{email}</span>
              </button>
              <button
                type="button"
                onClick={() => setAccounts(forgetAccount(window.localStorage, email))}
                aria-label={`Forget ${email}`}
                title="Forget this address"
                className="px-1.5 text-slate-400 hover:text-red-600 cursor-pointer opacity-0 group-hover/acct:opacity-100 focus:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </>
      )}
      <button
        type="button"
        onClick={() => {
          onClose();
          void signOut();
        }}
        title="Ends this session and opens the sign-in page"
        className={rowClass}
      >
        <UserSwitch size={14} className="text-[#325FEC] dark:text-[#518FFF]" />
        <span>{authRequired && others.length > 0 ? 'Use another account' : 'Switch account'}</span>
      </button>
    </div>
  );
};

export const UserProfileButton: React.FC<{ isCollapsed?: boolean }> = ({ isCollapsed = false }) => {
  const { user, setIsAuthModalOpen, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => setIsAuthModalOpen(true)}
        className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
          isCollapsed ? 'p-2' : ''
        }`}
        title="Sign In / Create Account"
      >
        <User size={14} weight="bold" />
        {!isCollapsed && <span>Sign In / Sign Up</span>}
      </button>
    );
  }

  // ─── Collapsed State ──────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="relative inline-block" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-8 h-8 rounded-full overflow-hidden border border-[#D9E1EC] dark:border-[#27272A] hover:scale-105 transition-transform cursor-pointer"
          title={`${user.name} (${user.email})`}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#325FEC] text-white flex items-center justify-center font-bold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Live Online Badge Dot */}
          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#121214]" />
        </button>

        {isOpen && (
          <div className="absolute left-10 bottom-0 w-64 bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] rounded-2xl shadow-2xl p-3 z-50 text-xs font-sans animate-popIn">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#D9E1EC] dark:border-[#27272A]">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-[#D9E1EC] dark:border-[#27272A] flex-shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#325FEC] text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs text-[#0F172A] dark:text-white truncate">{user.name}</span>
                  {user.tier && (<span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 font-bold uppercase">{user.tier}</span>)}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate block">{user.email}</span>
              </div>
            </div>

            <div className="py-2 space-y-1">
              <SwitchAccount onClose={() => setIsOpen(false)} />

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <SignOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Expanded State ───────────────────────────────────────────
  return (
    <div className="relative w-full" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] transition-all text-xs font-sans cursor-pointer group"
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden border border-[#D9E1EC] dark:border-[#27272A]">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#325FEC] text-white flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#FAFBFD] dark:ring-[#121214]" />
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-xs text-[#0F172A] dark:text-white truncate">{user.name}</span>
              {user.tier && (<span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 font-bold uppercase">{user.tier}</span>)}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate block">{user.email}</span>
          </div>
        </div>

        <CaretDown size={12} className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white flex-shrink-0 transition-colors" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-12 w-full bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] rounded-2xl shadow-2xl p-2.5 z-50 text-xs font-sans animate-popIn">
          {/* Action Links */}
          <div className="pt-2 space-y-1">
              <SwitchAccount onClose={() => setIsOpen(false)} />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <SignOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
