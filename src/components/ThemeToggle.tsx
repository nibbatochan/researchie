'use client';

import React from 'react';
import { Sun, Moon } from '@phosphor-icons/react';
import { useTheme } from '@/lib/theme';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-1.5 rounded-full text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-[#18181B] hover:bg-slate-200 dark:hover:bg-[#27272A] border border-slate-200 dark:border-[#27272A] transition-all ${className}`}
      title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun size={14} weight="regular" />
      ) : (
        <Moon size={14} weight="regular" />
      )}
    </button>
  );
};
