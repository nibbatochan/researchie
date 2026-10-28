'use client';

// Autosave for the paper editor (design note section 6). Debounce 1.5 s after the last change, at most 10 s while
// typing goes on, save when the tab is hidden, warn before leaving with unsaved changes.
// A refusal (too large, invalid) is shown and not retried until the paper changes; a network error or a server
// fault retries after 2, 5 and 15 seconds; a lost sign-in says so; a conflict stops saving until the person chooses.

import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_PAPER_BYTES } from '../data/papers.ts';
import { docBytes } from './docModel.ts';

export const DEBOUNCE_MS = 1500;
export const MAX_WAIT_MS = 10_000;
export const RETRY_MS = [2000, 5000, 15_000];

export type SaveState =
  | { kind: 'saved' }
  | { kind: 'dirty' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; message: string };

export interface SavePayload {
  doc: unknown;
  meta: unknown;
  title?: string;
  citationStyle?: string;
  projectId?: string | null;
}

export interface SavedPaper {
  updatedAt: string;
  title: string;
}

/** What to do after a failed save, from the HTTP status (0 = the request never got an answer). */
export function classifyFailure(status: number): 'retry' | 'refused' | 'conflict' | 'signin' {
  if (status === 409) return 'conflict';
  if (status === 401) return 'signin';
  if (status === 400 || status === 413 || status === 404) return 'refused';
  return 'retry'; // 0, 5xx, 429
}

interface Options {
  paperId: string;
  /** The updatedAt of the paper as loaded. */
  initialUpdatedAt: string;
  onSaved?: (saved: SavedPaper) => void;
  /** True while an IME composition is open: saving then would cut the composed text. */
  isComposing?: () => boolean;
}

export function useAutosave({ paperId, initialUpdatedAt, onSaved, isComposing }: Options) {
  const [state, setState] = useState<SaveState>({ kind: 'saved' });
  const pending = useRef<SavePayload | null>(null);
  const base = useRef<string | undefined>(initialUpdatedAt);
  const inflight = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retries = useRef(0);
  const blocked = useRef(false); // conflict: no saving until the person chooses
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;
  const composingRef = useRef(isComposing);
  composingRef.current = isComposing;

  const clearTimers = () => {
    if (debounce.current) clearTimeout(debounce.current);
    if (maxWait.current) clearTimeout(maxWait.current);
    debounce.current = null;
    maxWait.current = null;
  };

  const flush = useCallback(async (): Promise<void> => {
    clearTimers();
    if (blocked.current || inflight.current || !pending.current) return;
    if (composingRef.current?.()) {
      debounce.current = setTimeout(() => void flush(), 500);
      return;
    }
    const sent = pending.current;
    if (docBytes(sent.doc, sent.meta) > MAX_PAPER_BYTES) {
      setState({ kind: 'error', message: `This paper is over the ${MAX_PAPER_BYTES / 1024 / 1024} MB that can be saved. Remove large pasted images and try again.` });
      return; // not retried: it changes only when the person edits
    }
    inflight.current = true;
    setState({ kind: 'saving' });
    let status = 0;
    let json: { success?: boolean; error?: string; data?: SavedPaper } = {};
    try {
      const res = await fetch(`/api/papers/${paperId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sent, ...(base.current ? { baseUpdatedAt: base.current } : {}) }),
      });
      status = res.status;
      json = await res.json().catch(() => ({}));
    } catch {
      status = 0;
    }
    inflight.current = false;

    if (status >= 200 && status < 300 && json.data) {
      base.current = json.data.updatedAt;
      retries.current = 0;
      if (pending.current === sent) pending.current = null;
      onSavedRef.current?.(json.data);
      if (pending.current) {
        setState({ kind: 'dirty' });
        void flush(); // something changed while this save was on its way
      } else {
        setState({ kind: 'saved' });
      }
      return;
    }

    const failure = classifyFailure(status);
    if (failure === 'conflict') {
      blocked.current = true;
      setState({ kind: 'conflict', message: json.error || 'This paper was changed in another tab or window.' });
    } else if (failure === 'signin') {
      setState({ kind: 'error', message: 'You were signed out. Sign in again; your text is still here.' });
    } else if (failure === 'refused') {
      setState({ kind: 'error', message: json.error || 'The paper could not be saved.' });
    } else if (retries.current < RETRY_MS.length) {
      const wait = RETRY_MS[retries.current++];
      setState({ kind: 'error', message: `Not saved yet. Trying again in ${wait / 1000} seconds.` });
      debounce.current = setTimeout(() => void flush(), wait);
    } else {
      setState({ kind: 'error', message: 'Not saved: the server did not answer. Your text is still here; it will save with your next change.' });
    }
  }, [paperId]);

  /** Call on every change with the whole current paper. */
  const schedule = useCallback(
    (payload: SavePayload) => {
      pending.current = payload;
      retries.current = 0;
      if (blocked.current) return;
      setState((s) => (s.kind === 'saving' ? s : { kind: 'dirty' }));
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void flush(), DEBOUNCE_MS);
      if (!maxWait.current) maxWait.current = setTimeout(() => void flush(), MAX_WAIT_MS);
    },
    [flush]
  );

  /** After a conflict: save over the other version (sends no baseUpdatedAt once). */
  const keepMine = useCallback(() => {
    blocked.current = false;
    base.current = undefined;
    void flush();
  }, [flush]);

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current || inflight.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('beforeunload', beforeUnload);
      void flush(); // leaving the editor inside the app
      clearTimers();
    };
  }, [flush]);

  return { state, schedule, flush, keepMine };
}
