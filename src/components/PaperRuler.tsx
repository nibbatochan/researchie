'use client';

import React, { useRef, useState } from 'react';
import { MARGIN_STEP, marginLabel, rulerTicks, snapMargin, type RulerUnit } from '@/lib/paper/ruler';

// The ruler above the page: cm or inches along the page width, the margins shaded, and a handle at each margin. Drag a
// handle (the guide lines show on the page while you do) or focus it and use the arrow keys. The margin is the same on
// all four sides, so either handle sets it.

interface Props {
  /** Page width in px. */
  width: number;
  /** The margin now, in px. */
  margin: number;
  unit: RulerUnit;
  onMargin: (px: number) => void;
  /** The margin being dragged, for the guide lines on the page; null when no drag is going on. */
  onGuide: (px: number | null) => void;
}

export const PaperRuler: React.FC<Props> = ({ width, margin, unit, onMargin, onGuide }) => {
  const [live, setLive] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const shown = live ?? margin;
  const ticks = rulerTicks(width, unit);

  const startDrag = (side: 'left' | 'right') => (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = box.current!.getBoundingClientRect();
    const toMargin = (clientX: number) => snapMargin(side === 'left' ? clientX - rect.left : rect.right - clientX);
    let last = margin;
    const move = (ev: PointerEvent) => {
      last = toMargin(ev.clientX);
      setLive(last);
      onGuide(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setLive(null);
      onGuide(null);
      if (last !== margin) onMargin(last);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const keys = (e: React.KeyboardEvent, side: 'left' | 'right') => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const grows = (e.key === 'ArrowRight') === (side === 'left'); // moving a handle toward the page centre grows the margin
    onMargin(snapMargin(margin + (grows ? MARGIN_STEP : -MARGIN_STEP)));
  };

  const handle = (side: 'left' | 'right') => (
    <div
      role="slider"
      tabIndex={0}
      aria-label={`${side === 'left' ? 'Left' : 'Right'} margin`}
      aria-valuetext={marginLabel(shown, unit)}
      title={`Margin ${marginLabel(shown, unit)}: drag, or use the arrow keys`}
      data-testid={`ruler-handle-${side}`}
      onPointerDown={startDrag(side)}
      onKeyDown={(e) => keys(e, side)}
      className="absolute bottom-0 z-10 h-4 w-4 -translate-x-1/2 cursor-col-resize touch-none outline-none"
      style={{ left: side === 'left' ? shown : width - shown }}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden className="text-[#325FEC]">
        <path d="M2 2h12v6l-6 6-6-6z" fill="currentColor" />
      </svg>
    </div>
  );

  return (
    <div className="mx-auto w-full select-none" style={{ maxWidth: width }} data-testid="paper-ruler" data-margin-px={margin}>
      <div ref={box} className="relative h-6 overflow-visible rounded-sm bg-white dark:bg-[#18181B] ring-1 ring-[#D2DCEA] dark:ring-[#27272A]">
        <div className="absolute inset-y-0 left-0 bg-[#E8EDF6] dark:bg-[#27272A]" style={{ width: shown }} />
        <div className="absolute inset-y-0 right-0 bg-[#E8EDF6] dark:bg-[#27272A]" style={{ width: shown }} />
        {ticks.map((t) => (
          <span key={t.x} className="absolute top-0 text-[8px] leading-none text-slate-500 dark:text-zinc-500" style={{ left: t.x }}>
            <span className="block w-px bg-slate-400 dark:bg-zinc-600" style={{ height: t.kind === 'major' ? 9 : t.kind === 'half' ? 6 : 4 }} />
            {t.label && <span className="absolute left-[3px] top-[7px]">{t.label}</span>}
          </span>
        ))}
        {handle('left')}
        {handle('right')}
      </div>
      <p className="sr-only" aria-live="polite">Margin {marginLabel(shown, unit)}</p>
    </div>
  );
};
