'use client';

import React from 'react';
import { X, FilePlus, ArrowRight, Trash } from '@phosphor-icons/react';
import type { PaperMeta } from '@/lib/paper/docModel';

// Page settings (one button on the toolbar): paper size, margins, a new page at the cursor, and a list of every page
// with Go to and Delete on each, so any page can be chosen, not only the one the cursor is on.

const field = 'w-full rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2 py-1.5 text-xs text-[#0F172A] dark:text-white';

interface Props {
  meta: PaperMeta;
  onChange: (next: PaperMeta) => void;
  pages: number;
  /** The page the cursor is on. */
  current: number;
  onAddPage: () => void;
  onGoTo: (n: number) => void;
  onDelete: (n: number) => void;
  /** The ruler above the page. */
  ruler: boolean;
  onRuler: (on: boolean) => void;
  onClose: () => void;
}

export const PageSettingsDialog: React.FC<Props> = ({ meta, onChange, pages, current, onAddPage, onGoTo, onDelete, ruler, onRuler, onClose }) => {
  const { page } = meta;
  const setPage = (patch: Partial<PaperMeta['page']>) => onChange({ ...meta, page: { ...page, ...patch } });
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Page settings" data-testid="page-settings-dialog" className="w-full max-w-md max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">Page settings</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Paper size</span>
            <select value={page.size} onChange={(e) => setPage({ size: e.target.value as 'a4' | 'letter' })} data-testid="ps-size" className={field}>
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">Margins</span>
            <select value={page.marginPx ? 'custom' : page.margin} onChange={(e) => e.target.value !== 'custom' && setPage({ margin: e.target.value as 'narrow' | 'normal' | 'wide', marginPx: null })} data-testid="ps-margin" className={field}>
              {page.marginPx ? <option value="custom">Custom (from the ruler)</option> : null}
              <option value="narrow">Narrow (0.5 in)</option>
              <option value="normal">Normal (1 in)</option>
              <option value="wide">Wide (1.25 in)</option>
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
          <input type="checkbox" checked={ruler} onChange={(e) => onRuler(e.target.checked)} data-testid="ps-ruler" />
          Show the ruler above the page (drag its handles to set the margins)
        </label>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs font-semibold text-[#0F172A] dark:text-white">Pages ({pages})</p>
          <button type="button" onClick={onAddPage} data-testid="ps-add" className="inline-flex items-center gap-1 rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:border-[#325FEC] cursor-pointer">
            <FilePlus size={14} /> Add a page at the cursor
          </button>
        </div>
        <ul className="mt-2 divide-y divide-[#D2DCEA] dark:divide-[#27272A] rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B]" data-testid="ps-pages">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <li key={n} data-testid={`ps-page-${n}`} className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#0F172A] dark:text-white">
              <span className="flex-1">Page {n}{n === current && <span className="ml-1.5 text-[10px] text-slate-500">cursor is here</span>}</span>
              <button type="button" onClick={() => onGoTo(n)} data-testid={`ps-go-${n}`} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"><ArrowRight size={12} /> Go to</button>
              <button type="button" onClick={() => onDelete(n)} data-testid={`ps-delete-${n}`} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash size={12} /> Delete</button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-slate-500">Delete removes everything on that page and asks first. Ctrl+Z brings it back.</p>
      </div>
    </div>
  );
};
