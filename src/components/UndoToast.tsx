'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { ResearchAtom } from '@/lib/types/research';

interface UndoToastProps {
  deletedAtom: ResearchAtom | null;
  onUndo: (atom: ResearchAtom) => void;
  onDismiss: () => void;
  durationMs?: number;
}

const EXIT_MS = 160;

// A small toast: one line and Undo. It goes away on its own after durationMs, leaving the way it came in.
export const UndoToast: React.FC<UndoToastProps> = ({
  deletedAtom,
  onUndo,
  onDismiss,
  durationMs = 3000,
}) => {
  // Kept in a ref so a parent re-render does not restart the timer.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // The last clip stays on screen while the toast plays its exit.
  const [shown, setShown] = useState<ResearchAtom | null>(deletedAtom);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (deletedAtom) {
      setShown(deletedAtom);
      setLeaving(false);
      return;
    }
    if (!shown) return;
    setLeaving(true);
    const t = setTimeout(() => setShown(null), EXIT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedAtom]);

  useEffect(() => {
    if (!deletedAtom) return;
    const timer = setTimeout(() => dismissRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [deletedAtom, durationMs]);

  if (!shown) return null;

  return (
    <div role="status" className={`fixed bottom-6 right-6 z-50 ${leaving ? 'animate-slideDown pointer-events-none' : 'animate-slideUp'}`}>
      <div className="flex items-center gap-3 px-4 py-2 bg-[#0F172A] dark:bg-[#18181B] text-white rounded-lg shadow-lg">
        <span className="text-xs">Clip deleted</span>
        <button
          type="button"
          onClick={() => onUndo(shown)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#518FFF] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowCounterClockwise size={12} weight="bold" />
          <span>Undo</span>
        </button>
      </div>
    </div>
  );
};
