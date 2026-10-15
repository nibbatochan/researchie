'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  SignOut,
  CaretDown,
  UserSwitch
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';

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
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                title="Ends this session and opens the sign-in page"
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] transition-colors cursor-pointer"
              >
                <UserSwitch size={14} className="text-[#325FEC] dark:text-[#518FFF]" />
                <span>Switch account</span>
              </button>

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
          <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#D9E1EC] dark:border-[#27272A] flex-shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#325FEC] text-white flex items-center justify-center font-bold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-[#121214]" />
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
            <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  signOut();
                }}
                title="Ends this session and opens the sign-in page"
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-slate-700 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] transition-colors cursor-pointer"
              >
                <UserSwitch size={14} className="text-[#325FEC] dark:text-[#518FFF]" />
                <span>Switch account</span>
              </button>

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
