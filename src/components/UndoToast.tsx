'use client';

import React, { useEffect, useState } from 'react';
import { ArrowCounterClockwise, X, Trash } from '@phosphor-icons/react';
import { ResearchAtom } from '@/lib/types/research';

interface UndoToastProps {
  deletedAtom: ResearchAtom | null;
  onUndo: (atom: ResearchAtom) => void;
  onDismiss: () => void;
  durationMs?: number;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  deletedAtom,
  onUndo,
  onDismiss,
  durationMs = 8000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!deletedAtom) return;

    setProgress(100);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [deletedAtom, durationMs, onDismiss]);

  if (!deletedAtom) return null;

  const title =
    deletedAtom.title ||
    deletedAtom.content.text?.slice(0, 40) ||
    deletedAtom.content.rawText?.slice(0, 40) ||
    'Clip';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
      <div className="flex flex-col bg-[#0F172A] dark:bg-[#18181B] text-white border border-slate-700 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden min-w-[320px] max-w-md">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
              <Trash size={15} weight="bold" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold block truncate">
                Deleted clip: "{title}"
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Click Undo to restore
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onUndo(deletedAtom)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-[#325FEC] hover:bg-[#274AC4] text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Undo</span>
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Animated Countdown Progress Bar */}
        <div className="w-full h-1 bg-slate-800">
          <div
            className="h-full bg-[#518FFF] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
