'use client';

import React, { useRef } from 'react';
import { X } from '@phosphor-icons/react';
import type { PaperMeta } from '@/lib/paper/docModel';

// Header & Footer (micro changes, step 3): the options a Word user expects, and only those: a different first page,
// the number the paper starts at, and the text of the header and footer's left, centre and right parts. Page numbers,
// titles and the venue go in with one click at the cursor (the last box clicked).

const TOKENS: Array<{ token: string; label: string }> = [
  { token: '{page}', label: 'Page number' },
  { token: '{pages}', label: 'Total pages' },
  { token: '{title}', label: 'Title' },
  { token: '{shortTitle}', label: 'Running title' },
  { token: '{author}', label: 'Author' },
  { token: '{venue}', label: 'Journal' },
  { token: '{date}', label: 'Date' },
];

const field = 'w-full rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2 py-1.5 text-xs text-[#0F172A] dark:text-white';

interface Props {
  meta: PaperMeta;
  onChange: (next: PaperMeta) => void;
  onClose: () => void;
}

export const HeaderFooterDialog: React.FC<Props> = ({ meta, onChange, onClose }) => {
  const lastFocus = useRef<{ part: 'header' | 'footer'; side: 'left' | 'center' | 'right'; even: boolean } | null>(null);
  const { page } = meta;
  const setPage = (patch: Partial<PaperMeta['page']>) => onChange({ ...meta, page: { ...page, ...patch } });
  const zoneKey = (part: 'header' | 'footer', even: boolean) => (even ? (`${part}Even` as const) : part);
  const setZone = (part: 'header' | 'footer', side: 'left' | 'center' | 'right', value: string, even = false) => {
    const key = zoneKey(part, even);
    setPage({ [key]: { ...page[key], [side]: value } } as Partial<PaperMeta['page']>);
  };
  const insert = (token: string) => {
    // an even box can only be the target while the odd/even option is on (it is hidden otherwise)
    const last = lastFocus.current;
    const target = last && (!last.even || page.oddEven) ? last : { part: 'footer' as const, side: 'center' as const, even: false };
    const current = page[zoneKey(target.part, target.even)][target.side];
    setZone(target.part, target.side, `${current}${token}`, target.even);
  };

  const zoneRow = (part: 'header' | 'footer', even = false) => (
    <div className="grid grid-cols-3 gap-2">
      {(['left', 'center', 'right'] as const).map((side) => (
        <label key={side} className="block">
          <span className="block text-[10px] uppercase tracking-wide text-slate-500 mb-1">{side}</span>
          <input
            value={page[zoneKey(part, even)][side]}
            onFocus={() => (lastFocus.current = { part, side, even })}
            onChange={(e) => setZone(part, side, e.target.value, even)}
            aria-label={`${even ? 'even ' : ''}${part} ${side}`}
            data-testid={even ? `hf-even-${part}-${side}` : `hf-${part}-${side}`}
            className={field}
          />
        </label>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Header and footer" data-testid="header-footer-dialog" className="w-full max-w-xl max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">Header &amp; footer</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
            <input type="checkbox" checked={page.differentFirstPage} onChange={(e) => setPage({ differentFirstPage: e.target.checked })} data-testid="hf-first" />
            Different first page (no header or footer on page 1)
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
            <input type="checkbox" checked={page.oddEven} onChange={(e) => setPage({ oddEven: e.target.checked })} data-testid="hf-oddeven" />
            Different odd &amp; even pages
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300">
            Start page numbers at
            <input
              type="number"
              min={1}
              value={page.startAt}
              onChange={(e) => setPage({ startAt: Math.max(1, Number(e.target.value) || 1) })}
              data-testid="hf-start"
              className="w-20 rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2 py-1 text-xs"
            />
          </label>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-[#0F172A] dark:text-white">Insert at the cursor box</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TOKENS.map((t) => (
              <button key={t.token} type="button" onClick={() => insert(t.token)} data-testid={`hf-token-${t.token.slice(1, -1)}`} className="rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2 py-1 text-[11px] text-slate-700 dark:text-zinc-300 hover:border-[#325FEC] cursor-pointer">
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {page.oddEven && <p className="text-xs font-semibold text-[#325FEC]">Odd pages</p>}
          <p className="text-xs font-semibold text-[#0F172A] dark:text-white">Header</p>
          {zoneRow('header')}
          <p className="text-xs font-semibold text-[#0F172A] dark:text-white">Footer</p>
          {zoneRow('footer')}
          {page.oddEven && (
            <>
              <p className="pt-2 text-xs font-semibold text-[#325FEC]">Even pages</p>
              <p className="text-xs font-semibold text-[#0F172A] dark:text-white">Header</p>
              {zoneRow('header', true)}
              <p className="text-xs font-semibold text-[#0F172A] dark:text-white">Footer</p>
              {zoneRow('footer', true)}
            </>
          )}
        </div>
        <p className="mt-4 text-[11px] text-slate-500">Changes apply to every page at once. Page 1 is left blank when "different first page" is on.</p>
      </div>
    </div>
  );
};
