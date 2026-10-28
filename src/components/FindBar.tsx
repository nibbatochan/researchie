'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { closeHistory } from '@tiptap/pm/history';
import { TextSelection } from '@tiptap/pm/state';
import { CaretDown, CaretUp, X } from '@phosphor-icons/react';
import { FIND_META } from '@/lib/paper/editor/extensions';
import { findMatches, replaceAll, replaceMatch, type FindMatch } from '@/lib/paper/editor/find';

// Find and replace (Ctrl+F): the matches are marked on the page, the current one in a stronger colour; Enter goes to
// the next one, Shift+Enter to the one before. Replace changes the current match, Replace all changes every match in one
// step that Ctrl+Z undoes.

const input = 'h-7 rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2 text-xs text-[#0F172A] dark:text-white';
const btn = 'h-7 rounded-md border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:border-[#325FEC] disabled:opacity-40 disabled:hover:border-[#D2DCEA] cursor-pointer disabled:cursor-default';

interface Props {
  editor: Editor;
  /** Text to start the search with (the selection when Ctrl+F was pressed). */
  initialQuery: string;
  onClose: () => void;
}

export const FindBar: React.FC<Props> = ({ editor, initialQuery, onClose }) => {
  const [query, setQuery] = useState(initialQuery);
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [current, setCurrent] = useState(0);
  const [tick, setTick] = useState(0);
  const findRef = useRef<HTMLInputElement>(null);
  const visited = useRef(false);

  useEffect(() => {
    findRef.current?.focus();
    findRef.current?.select();
  }, []);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    editor.on('update', bump);
    return () => {
      editor.off('update', bump);
    };
  }, [editor]);

  const matches: FindMatch[] = findMatches(editor.state.doc, query, { caseSensitive, wholeWord });
  const index = matches.length ? Math.min(current, matches.length - 1) : -1;

  // mark the matches on the page; clear them when the bar closes
  useEffect(() => {
    editor.view.dispatch(editor.state.tr.setMeta(FIND_META, { matches, current: index }).setMeta('addToHistory', false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, query, caseSensitive, wholeWord, index, tick, matches.length]);
  useEffect(
    () => () => {
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(FIND_META, { matches: [], current: -1 }).setMeta('addToHistory', false));
    },
    [editor]
  );

  const show = (i: number) => {
    const m = matches[i];
    if (!m) return;
    setCurrent(i);
    const { state, view } = editor;
    view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, m.from, m.to)).scrollIntoView());
  };
  const go = (dir: 1 | -1) => {
    if (!matches.length) return;
    // the first press shows the current match; the ones after move on from it
    if (!visited.current) {
      visited.current = true;
      show(dir === 1 ? Math.max(index, 0) : matches.length - 1);
      return;
    }
    show((index + dir + matches.length) % matches.length);
  };
  const replaceCurrent = () => {
    const m = matches[index];
    if (!m) return;
    editor.view.dispatch(closeHistory(replaceMatch(editor.state, m, replacement)));
    // the next match is now where the cursor is; stay on the same position in the list
    setCurrent(index);
  };
  const replaceEvery = () => {
    editor.view.dispatch(closeHistory(editor.state.tr));
    const tr = replaceAll(editor.state, query, replacement, { caseSensitive, wholeWord });
    if (tr) editor.view.dispatch(closeHistory(tr));
    setCurrent(0);
  };

  return (
    <div role="search" aria-label="Find and replace" data-testid="find-bar" className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214]">
      <input
        ref={findRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCurrent(0); visited.current = false; }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); go(e.shiftKey ? -1 : 1); }
          if (e.key === 'Escape') { e.preventDefault(); onClose(); editor.view.focus(); }
        }}
        placeholder="Find"
        aria-label="Find"
        data-testid="find-input"
        className={`${input} w-44`}
      />
      <span data-testid="find-count" className="w-16 text-[11px] text-slate-500 dark:text-zinc-400" aria-live="polite">
        {query ? (matches.length ? `${index + 1} of ${matches.length}` : 'No matches') : ''}
      </span>
      <button type="button" onClick={() => go(-1)} disabled={!matches.length} aria-label="Previous match" data-testid="find-prev" className={`${btn} px-1.5`}><CaretUp size={13} /></button>
      <button type="button" onClick={() => go(1)} disabled={!matches.length} aria-label="Next match" data-testid="find-next" className={`${btn} px-1.5`}><CaretDown size={13} /></button>
      <input
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); replaceCurrent(); }
          if (e.key === 'Escape') { e.preventDefault(); onClose(); editor.view.focus(); }
        }}
        placeholder="Replace with"
        aria-label="Replace with"
        data-testid="replace-input"
        className={`${input} w-40`}
      />
      <button type="button" onClick={replaceCurrent} disabled={!matches.length} data-testid="replace-one" className={btn}>Replace</button>
      <button type="button" onClick={replaceEvery} disabled={!matches.length} data-testid="replace-all" className={btn}>Replace all</button>
      <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-zinc-400">
        <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} data-testid="find-case" /> Match case
      </label>
      <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-zinc-400">
        <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} data-testid="find-word" /> Whole word
      </label>
      <button type="button" onClick={() => { onClose(); editor.view.focus(); }} aria-label="Close find" data-testid="find-close" className="ml-auto p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"><X size={14} /></button>
    </div>
  );
};
