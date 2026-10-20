'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { OutlineSection } from '@/lib/paper/outline';
import type { ClipInfo } from '@/lib/paper/preview';
import { addCite, draftToText, splitCites } from '@/lib/paper/authored';

interface Props {
  section: OutlineSection;
  clips: Map<string, ClipInfo>;
  onChange: (authored: { text: string; cites: Record<string, string>; aiAssisted?: boolean }) => void;
}

const who = (c: ClipInfo) => {
  const a = c.record?.authors[0]?.family ?? 'Unknown';
  return `${a}${(c.record?.authors.length ?? 0) > 1 ? ' et al.' : ''}${c.record?.year ? ` ${c.record.year}` : ''}`;
};

/** What a key points to, in words, so a typed [@Lee2020] is never a mystery. */
function describe(key: string, cites: Record<string, string>, clips: Map<string, ClipInfo>): { ok: boolean; text: string } {
  const id = cites[key];
  if (!id) return { ok: false, text: 'Not known in this section. Insert the citation again from the list.' };
  const clip = clips.get(id);
  if (!clip) return { ok: false, text: 'The clip was deleted.' };
  if (clip.kind === 'ai-summary') return { ok: false, text: 'An AI summary. It can not be cited.' };
  if (clip.kind === 'mine') return { ok: true, text: 'Your own clip. Shown without a citation.' };
  if (!clip.record) return { ok: false, text: 'This clip has no reference details yet.' };
  const page = clip.page ? `, p. ${clip.page}` : '';
  return { ok: true, text: `${who(clip)}${page}: ${clip.text.slice(0, 60)}${clip.text.length > 60 ? '…' : ''}` };
}

/** The researcher's own text for a section, with citations inserted from clips. */
export function SectionEditor({ section, clips, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(!!section.text?.trim());
  const text = section.text ?? '';
  const cites = section.cites ?? {};

  const placed = useMemo(() => new Set(section.parts.flatMap((p) => p.clipIds)), [section.parts]);
  // Only a quote with reference details can be cited. Clips placed in this section come first.
  const citable = useMemo(() => [...clips.values()].filter((c) => c.kind === 'quote' && c.record && !c.media), [clips]);
  const here = citable.filter((c) => placed.has(c.id));
  const elsewhere = citable.filter((c) => !placed.has(c.id));

  const usedKeys = useMemo(() => [...new Set(splitCites(text).flatMap((p) => (p.type === 'cite' ? p.keys : [])))], [text]);

  const set = (nextText: string, nextCites = cites, ai = section.aiAssisted) => onChange({ text: nextText, cites: nextCites, aiAssisted: ai });

  const insert = (clipId: string) => {
    const clip = clips.get(clipId);
    if (!clip) return;
    const { key, cites: nextCites } = addCite(cites, clipId, clip);
    const area = ref.current;
    const start = area?.selectionStart ?? text.length;
    const end = area?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const token = `[@${key}]`;
    // A second source right after a token joins it: [@A; @B].
    const joined = before.match(/\[@([A-Za-z0-9_:\-; @]+)\]$/);
    const nextText = joined
      ? `${before.slice(0, -1)}; @${key}]${text.slice(end)}`
      : `${before}${before && !/\s$/.test(before) ? ' ' : ''}${token}${text.slice(end)}`;
    set(nextText, nextCites);
    const caret = nextText.length - (text.length - end);
    requestAnimationFrame(() => { area?.focus(); area?.setSelectionRange(caret, caret); });
  };

  const moveDraft = () => {
    if (!section.draft) return;
    if (text.trim() && !window.confirm('Replace your text with the AI draft? Your current text will be lost.')) return;
    const converted = draftToText(section.draft, section.parts.map((p) => p.id), clips, {});
    set(converted.text, converted.cites, true);
    setOpen(true);
  };

  if (!open) {
    return (
      <div className="mt-3">
        <button type="button" data-testid="write-open" onClick={() => setOpen(true)} className="rounded-lg border border-[#B8C4D6] dark:border-[#3A3A42] bg-white dark:bg-[#18181B] px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200 hover:border-[#325FEC]">Write my own text</button>
      </div>
    );
  }

  return (
    <div data-testid="section-editor" className="mt-3 rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white/60 dark:bg-[#121214]/60 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[#0F172A] dark:text-white">My text</span>
        <select
          aria-label="Insert a citation"
          data-testid="insert-citation"
          value=""
          onChange={(e) => { if (e.target.value) insert(e.target.value); }}
          className="rounded-md border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-2 py-1 text-[11px] text-slate-700 dark:text-zinc-300"
        >
          <option value="">Insert a citation…</option>
          {here.length > 0 && (
            <optgroup label="In this section">
              {here.map((c) => <option key={c.id} value={c.id}>{who(c)}: {c.text.slice(0, 50)}</option>)}
            </optgroup>
          )}
          {elsewhere.length > 0 && (
            <optgroup label="Other clips with a citation">
              {elsewhere.map((c) => <option key={c.id} value={c.id}>{who(c)}: {c.text.slice(0, 50)}</option>)}
            </optgroup>
          )}
        </select>
        {section.draft && (
          <button type="button" data-testid="move-draft" onClick={moveDraft} className="rounded-md border border-[#D9E1EC] dark:border-[#27272A] px-2 py-1 text-[11px] text-slate-700 dark:text-zinc-300">Move the AI draft into my text</button>
        )}
        <button type="button" onClick={() => { if (!text.trim() || window.confirm('Clear your text for this section?')) { set('', {}, false); setOpen(false); } }} className="ml-auto text-[11px] text-slate-500 hover:text-red-500">Clear my text</button>
      </div>

      <textarea
        ref={ref}
        value={text}
        onChange={(e) => set(e.target.value)}
        rows={Math.max(6, Math.min(24, Math.ceil(text.length / 80) + text.split('\n').length))}
        aria-label={`My text for ${section.title}`}
        data-testid="section-text"
        placeholder="Write here. Leave a blank line between paragraphs. Use Insert a citation to cite a clip."
        className="mt-2 w-full resize-y rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-3 py-2 text-[13px] leading-relaxed text-[#0F172A] dark:text-zinc-100 outline-none focus:border-[#325FEC]"
      />
      <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-500">
        Put exact words from a paper in quotation marks and cite them; they are checked against the clip. Type $x^2$ for maths, or $$...$$ for an equation on its own line. [@Key] is a citation: the style (Harvard or numbered) is chosen in the preview.
      </p>

      {usedKeys.length > 0 && (
        <ul data-testid="cite-legend" className="mt-2 space-y-0.5">
          {usedKeys.map((key) => {
            const d = describe(key, cites, clips);
            return (
              <li key={key} data-ok={d.ok} className={`text-[11px] leading-snug ${d.ok ? 'text-slate-600 dark:text-zinc-400' : 'text-red-700 dark:text-red-400'}`}>
                <code className="mr-1 rounded bg-slate-100 px-1 dark:bg-zinc-800">[@{key}]</code>{d.text}
              </li>
            );
          })}
        </ul>
      )}

      <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
        <input type="checkbox" data-testid="ai-assisted" checked={!!section.aiAssisted} onChange={(e) => set(text, cites, e.target.checked)} />
        Some of this text was drafted by AI (many journals ask authors to say so)
      </label>
    </div>
  );
}
