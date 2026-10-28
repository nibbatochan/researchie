'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * A toolbar button that opens a small panel under it. The panel closes on a click outside, on Escape, and when the
 * panel's own content calls close(). Pressing a button inside does not move the cursor out of the text.
 */
export function Popover({ trigger, children, testId, width = 'w-52' }: {
  trigger: (p: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  testId?: string;
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as HTMLElement)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      // the focus goes back to the button that opened the panel, as a keyboard user expects
      ref.current?.querySelector<HTMLElement>('button')?.focus();
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          data-testid={testId}
          onMouseDown={(e) => {
            if (!(e.target as HTMLElement).closest('input,select,textarea')) e.preventDefault();
          }}
          className={`absolute left-0 top-full z-50 mt-1 ${width} rounded-xl border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-1.5 shadow-xl`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** One row of a Popover list: a label, a tick when it is the current choice. */
export const MenuItem: React.FC<{ label: string; active?: boolean; testId?: string; onClick: () => void; icon?: React.ReactNode }> = ({ label, active, testId, onClick, icon }) => (
  <button
    type="button"
    role="menuitemradio"
    aria-checked={active}
    data-testid={testId}
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs cursor-pointer ${active ? 'bg-[#325FEC]/12 font-semibold text-[#325FEC] dark:text-[#8DB4FF]' : 'text-slate-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'}`}
  >
    {icon}
    <span className="flex-1">{label}</span>
    {active && <span aria-hidden>✓</span>}
  </button>
);
