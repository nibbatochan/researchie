'use client';

import React, { useEffect, useRef } from 'react';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { ResearchAtom } from '@/lib/types/research';

interface UndoToastProps {
  deletedAtom: ResearchAtom | null;
  onUndo: (atom: ResearchAtom) => void;
  onDismiss: () => void;
  durationMs?: number;
}

// A small toast: one line and Undo. It goes away on its own after durationMs.
export const UndoToast: React.FC<UndoToastProps> = ({
  deletedAtom,
  onUndo,
  onDismiss,
  durationMs = 3000,
}) => {
  // Kept in a ref so a parent re-render does not restart the timer.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!deletedAtom) return;
    const timer = setTimeout(() => dismissRef.current(), durationMs);
    return () => clearTimeout(timer);
  }, [deletedAtom, durationMs]);

  if (!deletedAtom) return null;

  return (
    <div role="status" className="fixed bottom-6 right-6 z-50 animate-slideUp">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#0F172A] dark:bg-[#18181B] text-white rounded-lg shadow-lg">
        <span className="text-xs">Clip deleted</span>
        <button
          type="button"
          onClick={() => onUndo(deletedAtom)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#518FFF] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowCounterClockwise size={12} weight="bold" />
          <span>Undo</span>
        </button>
      </div>
    </div>
  );
};
