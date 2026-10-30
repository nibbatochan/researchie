'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ArrowCounterClockwise, Trash } from '@phosphor-icons/react';

// The one toast for every delete. It says what went ("Deleted project “Thesis”"), offers Undo when the delete can
// be put back, and goes away on its own. A later delete replaces the one on screen.
// Use it from any component: const notifyDeleted = useDeleteToast(); notifyDeleted({ kind: 'clip', name, onUndo }).

export interface DeletedItem {
  /** What it was, in a few words: "clip", "project", "sub-project", "paper", "document", "highlight"... */
  kind: string;
  /** The name of the thing deleted. Leave empty when it has none (a key, a token): the toast then says only the kind. */
  name?: string;
  /** Put it back. Leave out when the delete cannot be undone; then the toast has no Undo button. */
  onUndo?: () => void;
}

type Notify = (item: DeletedItem) => void;

const DeleteToastContext = createContext<Notify>(() => {});
export const useDeleteToast = (): Notify => useContext(DeleteToastContext);

const SHOW_MS = 5000;
const EXIT_MS = 160;

export const DeleteToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<DeletedItem | null>(null);
  const [leaving, setLeaving] = useState(false);

  // A new object each time, so a second delete restarts the timer.
  useEffect(() => {
    if (!current) return;
    setLeaving(false);
    const exit = setTimeout(() => setLeaving(true), SHOW_MS);
    const gone = setTimeout(() => setCurrent(null), SHOW_MS + EXIT_MS);
    return () => {
      clearTimeout(exit);
      clearTimeout(gone);
    };
  }, [current]);

  const undo = () => {
    current?.onUndo?.();
    setCurrent(null);
  };

  return (
    <DeleteToastContext.Provider value={(item) => setCurrent({ ...item })}>
      {children}
      {current && (
        <div
          role="status"
          aria-live="polite"
          data-testid="delete-toast"
          className={`fixed bottom-6 right-6 z-[120] max-w-[calc(100vw-32px)] ${leaving ? 'animate-slideDown pointer-events-none' : 'animate-slideUp'}`}
        >
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0F172A] dark:bg-[#18181B] text-white rounded-lg shadow-lg">
            <Trash size={14} className="flex-shrink-0 text-[#8DB4FF]" aria-hidden />
            <span className="min-w-0 text-xs truncate">
              Deleted {current.kind}
              {current.name ? ` “${current.name}”` : ''}
            </span>
            {current.onUndo && (
              <button
                type="button"
                onClick={undo}
                className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#518FFF] hover:text-white transition-colors cursor-pointer"
              >
                <ArrowCounterClockwise size={12} weight="bold" />
                <span>Undo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </DeleteToastContext.Provider>
  );
};
