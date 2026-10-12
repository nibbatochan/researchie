'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy } from '@phosphor-icons/react';
import type { CitationRecord } from '@/lib/citations/types';
import { citationText, type CitationCopyKind } from '@/lib/citations/client.ts';

export const CITATION_STYLES: ReadonlyArray<{ kind: CitationCopyKind; label: string; hint: string }> = [
  { kind: 'line', label: 'Vancouver', hint: 'Medical journals (ICMJE / NLM)' },
  { kind: 'apa', label: 'APA', hint: 'APA 7th edition' },
  { kind: 'ama', label: 'AMA', hint: 'AMA 11th edition' },
  { kind: 'bibtex', label: 'BibTeX', hint: 'For LaTeX and reference managers' },
  { kind: 'ris', label: 'RIS', hint: 'For Zotero, Mendeley and EndNote' },
];

const STORAGE_KEY = 'researchie.citationStyle';

/** Clipboard API first; a hidden textarea when the browser blocks it. True when the text was copied. */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** The chosen style, kept in this browser. The first render always uses Vancouver. */
export function useCitationStyle(): [CitationCopyKind, (kind: CitationCopyKind) => void] {
  const [style, setStyle] = useState<CitationCopyKind>('line');
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (CITATION_STYLES.some((s) => s.kind === saved)) setStyle(saved as CitationCopyKind);
    } catch {}
  }, []);
  const choose = (kind: CitationCopyKind) => {
    setStyle(kind);
    try {
      window.localStorage.setItem(STORAGE_KEY, kind);
    } catch {}
  };
  return [style, choose];
}

interface BarProps {
  record: CitationRecord;
  style: CitationCopyKind;
  onStyleChange: (kind: CitationCopyKind) => void;
  testIdPrefix?: string;
}

/** Style tabs plus one Copy button. Copy always copies the text the preview shows. */
export function CitationStyleBar({ record, style, onStyleChange, testIdPrefix = 'citation' }: BarProps) {
  const [result, setResult] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  // Switching style resets the confirmation: it was for the previous text.
  useEffect(() => setResult('idle'), [style]);

  const copy = async () => {
    const ok = await writeToClipboard(citationText(record, style));
    setResult(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setResult('idle'), 2500);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      <div role="group" aria-label="Citation style" className="inline-flex rounded-md border border-[#E4ECF6] dark:border-[#27272A] overflow-hidden">
        {CITATION_STYLES.map(({ kind, label, hint }) => {
          const selected = kind === style;
          return (
            <button
              key={kind}
              type="button"
              title={hint}
              aria-pressed={selected}
              data-testid={`${testIdPrefix}-style-${kind}`}
              onClick={() => onStyleChange(kind)}
              className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                selected
                  ? 'bg-[#325FEC] text-white'
                  : 'text-slate-500 dark:text-zinc-400 hover:bg-[#E4ECF6] dark:hover:bg-[#222226]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        data-testid={`${testIdPrefix}-copy`}
        onClick={copy}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
          result === 'copied'
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
            : result === 'failed'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
              : 'bg-[#E4ECF6] dark:bg-[#222226] text-slate-700 dark:text-zinc-200 hover:bg-[#D4DFF0] dark:hover:bg-[#2A2A30]'
        }`}
      >
        {result === 'copied' ? <Check size={11} weight="bold" /> : <Copy size={11} />}
        <span>{result === 'copied' ? 'Copied' : result === 'failed' ? "Couldn't copy" : 'Copy'}</span>
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {result === 'copied'
          ? `${CITATION_STYLES.find((s) => s.kind === style)?.label} citation copied to the clipboard`
          : result === 'failed'
            ? 'Copy failed. Select the text and copy it by hand.'
            : ''}
      </span>
    </div>
  );
}

interface PreviewProps {
  record: CitationRecord;
  style: CitationCopyKind;
  testIdPrefix?: string;
}

/** The exact text Copy will put on the clipboard. */
export function CitationPreview({ record, style, testIdPrefix = 'citation' }: PreviewProps) {
  const text = citationText(record, style);
  const code = style === 'bibtex' || style === 'ris';
  return (
    <div>
      <p
        data-testid={`${testIdPrefix}-preview`}
        className={
          code
            ? 'whitespace-pre-wrap break-all font-mono text-[10.5px] leading-snug rounded-md bg-[#F4F4F5] dark:bg-[#1F1F23] p-2 max-h-64 overflow-auto'
            : 'leading-relaxed break-words'
        }
      >
        {text}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-400 dark:text-zinc-500">Copy puts exactly this text on your clipboard.</p>
    </div>
  );
}
