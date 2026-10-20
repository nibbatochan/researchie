'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ResearchAtom } from '@/lib/types/research';
import { getEvidenceKind, EVIDENCE_LABEL } from '@/lib/atoms/evidence';
import {
  PAPER_TEMPLATES, createOutline, setPaperMeta, setSectionPoint, setSectionDraft, setSectionAuthored, setSectionDone, replaceDraft, restorePreviousDraft, addPart, renamePart, removePart, movePart,
  assignClip, unassignClip, placedClipIds, pruneMissingClips, sectionStatus, nextSection,
  type PaperOutline, type PaperTemplateId, type OutlineSection,
} from '@/lib/paper/outline';
import { PaperPreview } from './PaperPreview';
import { PastePanel } from './PastePanel';
import { SectionEditor } from './SectionEditor';
import { ImportRefsPanel } from './ImportRefsPanel';
import type { CitationRecord } from '@/lib/citations/types';
import type { NewClip } from '@/lib/paper/pasteMatch';
import { checkSection, type SectionChecklist } from '@/lib/paper/checklist';
import { parseTable } from '@/lib/paper/tableParse';
import { usePrefs } from '@/lib/prefs/prefsContext';
import { outlineKey, readOutline, serializeOutline, STYLE_PREF_KEY } from '@/lib/paper/store';
import { buildPreview, type ClipInfo } from '@/lib/paper/preview';
import { classifySentence, hasPlaceholder, countClips, MAX_CLIPS_PER_DRAFT, STATUS_MESSAGE, type DraftClip, type DraftInput } from '@/lib/paper/draft';
import { renderCitations, IN_TEXT_STYLES, type InTextStyle, type CitedSource, type MarkerPart } from '@/lib/citations/inText';

const CLIP_MIME = 'application/x-researchie-clip';
const PART_MIME = 'application/x-researchie-part';

/** An image clip is a figure; a clip that holds an HTML table is a table. Only the table's text is kept. */
function mediaOf(a: ResearchAtom): ClipInfo['media'] {
  const caption = (a.content?.description || a.userNotes || a.title || '').trim();
  if (a.type === 'image' && a.content?.imageUrl) return { kind: 'image', src: a.content.imageUrl, caption };
  const html = a.content?.sanitizedHtml || a.content?.rawText || '';
  const table = a.type === 'block' ? parseTable(html) : undefined;
  return table ? { kind: 'table', table, caption: table.caption || caption } : undefined;
}

function clipText(atom: ResearchAtom): string {
  const text = atom.content?.text || atom.content?.rawText || atom.metadata?.selectedText || atom.title || '';
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}


function jumpTo(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('ring-2', 'ring-[#325FEC]');
  window.setTimeout(() => el.classList.remove('ring-2', 'ring-[#325FEC]'), 1500);
}

/** The sources a part cites: its clips that carry a citation record. Pages are kept for quotes only. */
function citedSources(partClipIds: string[], byId: Map<string, ResearchAtom>): { cited: CitedSource[]; missing: number } {
  const cited: CitedSource[] = [];
  let missing = 0;
  for (const id of partClipIds) {
    const atom = byId.get(id);
    if (!atom) continue;
    if (getEvidenceKind(atom) === 'mine') continue; // your own words need no citation
    const record = atom.metadata?.citation;
    if (!record) { missing++; continue; }
    const page = getEvidenceKind(atom) === 'quote' ? (atom.metadata?.pageNumber ?? atom.metadata?.page) : undefined;
    cited.push({ sourceId: atom.id, record, page });
  }
  return { cited, missing };
}

const KIND_TONE: Record<string, string> = {
  quote: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/40',
  'ai-summary': 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40',
  mine: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/40',
};

function ClipChip({ atom, onRemove, draggable }: { atom: ResearchAtom; onRemove?: () => void; draggable?: boolean }) {
  const kind = getEvidenceKind(atom);
  return (
    <div
      data-testid="outline-clip"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(CLIP_MIME, atom.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      className={`flex items-start gap-2 rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-2.5 py-2 text-[12px] leading-snug ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${KIND_TONE[kind]}`}>{EVIDENCE_LABEL[kind]}</span>
      <span className="min-w-0 flex-1 break-words text-[#0F172A] dark:text-zinc-200">{clipText(atom)}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove clip from this part" className="shrink-0 text-slate-400 hover:text-red-500">×</button>
      )}
    </div>
  );
}

function SectionCard({
  section, index, isNext, byId, unplaced, apply, markers, missingByPart, onDraft, drafting, draftError, draftClips, checklist, done, clipInfos,
}: {
  section: OutlineSection;
  index: number;
  isNext: boolean;
  byId: Map<string, ResearchAtom>;
  unplaced: ResearchAtom[];
  apply: (fn: (o: PaperOutline) => PaperOutline) => void;
  markers: Map<string, MarkerPart[]>;
  missingByPart: Map<string, number>;
  onDraft: () => void;
  drafting: boolean;
  draftError?: string;
  draftClips: Map<string, DraftClip>;
  checklist: SectionChecklist;
  done: boolean;
  clipInfos: Map<string, ClipInfo>;
}) {
  const [newPart, setNewPart] = useState('');
  const status = sectionStatus(section);
  const started = status !== 'empty'; // nothing to draft or check until there is a point or a part
  const draftTotal = section.parts.reduce((n, p) => n + p.clipIds.filter((id) => draftClips.has(id)).length, 0);
  const statusLabel = done ? 'Done' : status === 'has-evidence' ? 'Has evidence' : status === 'framed' ? 'Framed, needs clips' : 'Not started';

  return (
    <section
      data-testid="outline-section"
      data-key={section.key}
      className={`rounded-xl border bg-[#FAFBFD] dark:bg-[#0F0F12] p-4 ${isNext ? 'border-[#325FEC] dark:border-[#518FFF]' : 'border-[#D9E1EC] dark:border-[#27272A]'}`}
    >
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">{index + 1}. {section.title}</h3>
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-400">{statusLabel}</span>
        {isNext && <span className="rounded bg-[#325FEC] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">Next</span>}
      </header>
      <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">{section.hint}</p>

      <input
        value={section.point}
        onChange={(e) => apply((o) => setSectionPoint(o, section.id, e.target.value))}
        placeholder="Your point for this section, in one sentence"
        aria-label={`Point of ${section.title}`}
        className="mt-3 w-full rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-3 py-1.5 text-[13px] text-[#0F172A] dark:text-zinc-100 outline-none focus:border-[#325FEC]"
      />

      <ol className="mt-3 space-y-2" onDragOver={(e) => { if (e.dataTransfer.types.includes(PART_MIME)) e.preventDefault(); }}
        onDrop={(e) => {
          const partId = e.dataTransfer.getData(PART_MIME);
          if (partId) { e.preventDefault(); apply((o) => movePart(o, partId, section.id, section.parts.length)); }
        }}>
        {section.parts.map((part, partIndex) => (
          <li
            key={part.id}
            data-testid="outline-part"
            draggable
            onDragStart={(e) => { e.dataTransfer.setData(PART_MIME, part.id); e.dataTransfer.effectAllowed = 'move'; }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes(PART_MIME) || e.dataTransfer.types.includes(CLIP_MIME)) e.preventDefault();
            }}
            onDrop={(e) => {
              const clipId = e.dataTransfer.getData(CLIP_MIME);
              const partId = e.dataTransfer.getData(PART_MIME);
              if (clipId) { e.preventDefault(); e.stopPropagation(); apply((o) => assignClip(o, part.id, clipId)); }
              else if (partId && partId !== part.id) { e.preventDefault(); e.stopPropagation(); apply((o) => movePart(o, partId, section.id, partIndex)); }
            }}
            className="rounded-lg border border-dashed border-[#C7D2E2] dark:border-[#3A3A42] bg-white/60 dark:bg-[#121214]/60 p-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="cursor-grab select-none text-slate-400" title="Drag to reorder">⠿</span>
              <input
                defaultValue={part.title}
                onBlur={(e) => apply((o) => renamePart(o, part.id, e.target.value || part.title))}
                aria-label="Part title"
                className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[#0F172A] dark:text-zinc-100 outline-none"
              />
              <button type="button" onClick={() => apply((o) => removePart(o, part.id))} aria-label={`Delete part ${part.title}`} className="text-xs text-slate-400 hover:text-red-500">Delete</button>
            </div>

            <div className="mt-2 space-y-1.5">
              {part.clipIds.map((id) => {
                const atom = byId.get(id);
                return atom ? <ClipChip key={id} atom={atom} onRemove={() => apply((o) => unassignClip(o, part.id, id))} /> : null;
              })}
              {part.clipIds.length === 0 && <p className="text-[11px] text-slate-500 dark:text-zinc-500">Drop clips here, or pick one below.</p>}
            </div>

            {(markers.get(part.id) || (missingByPart.get(part.id) ?? 0) > 0) && (
              <p id={`cite-${part.id}`} data-testid="part-citation" className="mt-2 rounded px-1 text-[12px] text-slate-700 dark:text-zinc-300">
                <span className="mr-1 text-[10px] uppercase tracking-wide text-slate-500 dark:text-zinc-500">Cite as</span>
                {markers.get(part.id)?.map((m, i) =>
                  m.sourceId ? (
                    <button key={i} type="button" data-testid="cite-link" onClick={() => jumpTo(`ref-${m.sourceId}`)} className="text-[#325FEC] dark:text-[#518FFF] underline-offset-2 hover:underline">{m.text}</button>
                  ) : (
                    <span key={i}>{m.text}</span>
                  ),
                )}
                {(missingByPart.get(part.id) ?? 0) > 0 && (
                  <span data-testid="missing-citation" className="ml-2 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                    {missingByPart.get(part.id)} clip{missingByPart.get(part.id) === 1 ? '' : 's'} without a citation. No source, no claim.
                  </span>
                )}
              </p>
            )}

            {unplaced.length > 0 && (
              <select
                aria-label={`Add a clip to ${part.title}`}
                value=""
                onChange={(e) => { if (e.target.value) apply((o) => assignClip(o, part.id, e.target.value)); }}
                className="mt-2 w-full rounded-md border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-2 py-1 text-[11px] text-slate-600 dark:text-zinc-400"
              >
                <option value="">Add a clip…</option>
                {unplaced.map((a) => <option key={a.id} value={a.id}>{clipText(a).slice(0, 70)}</option>)}
              </select>
            )}
          </li>
        ))}
      </ol>

      <SectionEditor section={section} clips={clipInfos} onChange={(a) => apply((o) => setSectionAuthored(o, section.id, a))} />

      {started && (
      <div className="mt-3 rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white/60 dark:bg-[#121214]/60 p-2.5" data-testid="draft-panel">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="draft-button"
            disabled={drafting || draftTotal === 0}
            onClick={onDraft}
            className="rounded-lg bg-[#325FEC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A4FCC] disabled:cursor-not-allowed disabled:opacity-50"
          >{drafting ? 'Drafting…' : section.draft ? 'Draft again' : 'Draft this section'}</button>
          <span className="text-[11px] text-slate-500 dark:text-zinc-500">
            {draftTotal === 0 ? 'Place clips under a part first.' : draftTotal > MAX_CLIPS_PER_DRAFT ? `Too many clips (${draftTotal}). Up to ${MAX_CLIPS_PER_DRAFT} per draft.` : 'AI writes from these clips only. You check every sentence.'}
          </span>
          {draftTotal > 0 && (
            <p data-testid="draft-privacy" className="basis-full text-[11px] text-slate-500 dark:text-zinc-500">
              Drafting sends the text of these clips to Groq, the AI service. Groq's docs say it does not keep this data by default, but it may keep it up to 30 days to fix faults or stop abuse. Check Groq's terms before you send unpublished work.
            </p>
          )}
          {section.draft?.previous && (
            <button type="button" data-testid="restore-draft" onClick={() => apply((o) => restorePreviousDraft(o, section.id))} className="ml-auto text-xs text-[#325FEC] hover:underline dark:text-[#518FFF]" title="Swap back to the draft this one replaced. You can swap again.">Restore previous draft</button>
          )}
          {section.draft && (
            <button type="button" onClick={() => apply((o) => setSectionDraft(o, section.id, undefined))} className={`${section.draft.previous ? '' : 'ml-auto '}text-xs text-slate-500 hover:text-red-500`}>Clear draft</button>
          )}
        </div>
        {draftError && <p role="alert" data-testid="draft-error" className="mt-2 text-xs text-red-700 dark:text-red-400">{draftError}</p>}
        {section.draft && (
          <ol className="mt-2 space-y-1.5" data-testid="draft-sentences">
            {section.draft.sentences.map((sentence, i) => {
              const flagged = sentence.status !== 'sourced' && sentence.status !== 'own';
              return (
                <li key={i} data-testid="draft-sentence" data-status={sentence.status} className={`flex items-start gap-2 rounded-md border px-2 py-1.5 ${flagged ? 'border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/20' : 'border-[#D9E1EC] dark:border-[#27272A]'}`}>
                  <textarea
                    value={sentence.text}
                    rows={Math.max(2, Math.ceil(sentence.text.length / 70))}
                    aria-label={`Draft sentence ${i + 1}`}
                    onChange={(e) => {
                      const text = e.target.value;
                      apply((o) => setSectionDraft(o, section.id, {
                        ...section.draft!,
                        sentences: section.draft!.sentences.map((x, j) => (j === i ? { ...x, text, status: classifySentence(text, x.clipIds, draftClips, [section.point]), placeholder: hasPlaceholder(text) } : x)),
                      }));
                    }}
                    className="min-w-0 flex-1 resize-y bg-transparent text-[12.5px] leading-snug text-[#0F172A] dark:text-zinc-100 outline-none"
                  />
                  <div className="flex w-36 shrink-0 flex-col items-end gap-1 text-right">
                    <span className="text-[10px] leading-tight text-slate-600 dark:text-zinc-400">{STATUS_MESSAGE[sentence.status]}</span>
                    {sentence.placeholder && <span className="text-[10px] text-amber-700 dark:text-amber-300">Fill in the [ ? ]</span>}
                    <button type="button" aria-label={`Delete draft sentence ${i + 1}`} onClick={() => apply((o) => setSectionDraft(o, section.id, { ...section.draft!, sentences: section.draft!.sentences.filter((_, j) => j !== i) }))} className="text-[10px] text-slate-400 hover:text-red-500">Delete</button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      )}

      {started && (
      <div data-testid="checklist" data-done={done} className={`mt-3 rounded-lg border p-2.5 ${done ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20' : 'border-[#D9E1EC] dark:border-[#27272A]'}`}>
        {done ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Done. Every check passes.</span>
            <button type="button" data-testid="reopen-section" onClick={() => apply((o) => setSectionDone(o, section.id, false))} className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200">Reopen</button>
          </div>
        ) : (
          <>
            {checklist.items.length > 0 ? (
              <ul className="space-y-1">
                {checklist.items.map((item) => (
                  <li key={item.id} data-testid="checklist-item" data-severity={item.severity} className={`text-[11.5px] leading-snug ${item.severity === 'block' ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                    <span className="mr-1 font-mono text-[10px] font-semibold uppercase">{item.severity === 'block' ? 'Fix' : 'Check'}</span>{item.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300">Every check passes. Read each sentence against its clip once more, then mark it done.</p>
            )}
            <button
              type="button"
              data-testid="mark-done"
              disabled={!checklist.canComplete}
              onClick={() => apply((o) => setSectionDone(o, section.id, true))}
              className="mt-2 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
            >Mark as done</button>
          </>
        )}
      </div>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); if (newPart.trim()) { apply((o) => addPart(o, section.id, newPart)); setNewPart(''); } }}
      >
        <input
          value={newPart}
          onChange={(e) => setNewPart(e.target.value)}
          placeholder={section.key === 'methods' ? 'Add a method, for example "Survey (n = 40)"' : 'Add a part'}
          aria-label={`Add a part to ${section.title}`}
          className="min-w-0 flex-1 rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-3 py-1.5 text-[13px] text-[#0F172A] dark:text-zinc-100 outline-none focus:border-[#325FEC]"
        />
        <button type="submit" className="rounded-lg bg-[#325FEC] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A4FCC]">Add part</button>
      </form>
    </section>
  );
}

interface Props {
  projectId: string;
  atoms: ResearchAtom[];
  onClose: () => void;
  onCreateClip?: (clip: NewClip) => void; // absent for a viewer, who can not add clips
}

export function PaperOutlineView({ projectId, atoms: atomsProp, onClose, onCreateClip }: Props) {
  const [pasteOpen, setPasteOpen] = useState(false);
  // On a phone the list of unplaced clips starts closed so the sections get the screen.
  const [asideOpen, setAsideOpen] = useState(true);
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches) setAsideOpen(false);
  }, []);
  const [importOpen, setImportOpen] = useState(false);
  // Citations attached by an import show at once; the page's own list catches up on the next load.
  const [citationOverrides, setCitationOverrides] = useState<Map<string, CitationRecord>>(new Map());
  const atoms = useMemo(
    () => (citationOverrides.size === 0 ? atomsProp : atomsProp.map((a) => (citationOverrides.has(a.id) ? { ...a, metadata: { ...a.metadata, citation: citationOverrides.get(a.id) } } : a))),
    [atomsProp, citationOverrides],
  );
  const [outline, setOutline] = useState<PaperOutline | undefined>(undefined);
  const prefs = usePrefs();
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipSave = useRef(true);

  // Saved with the account on the tester site, in this browser in local mode. A copy left in this browser
  // by an earlier version is adopted once.
  useEffect(() => {
    skipSave.current = true;
    let found = readOutline(prefs.get(outlineKey(projectId)));
    if (!found && prefs.inAccount) {
      try { found = readOutline(window.localStorage.getItem(outlineKey(projectId))); } catch { /* none */ }
    }
    setOutline(found);
    setSaveError(null);
    setLoaded(true);
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded) return;
    if (skipSave.current) { skipSave.current = false; return; }
    if (!outline) { prefs.remove(outlineKey(projectId)); setSaveError(null); return; }
    const result = serializeOutline(outline);
    if (result.ok) { prefs.set(outlineKey(projectId), result.json); setSaveError(null); }
    else setSaveError(result.reason);
  }, [outline, projectId, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(atoms.map((a) => [a.id, a])), [atoms]);

  // A clip deleted from the project leaves the outline too.
  useEffect(() => {
    if (!outline || atoms.length === 0) return;
    const pruned = pruneMissingClips(outline, new Set(atoms.map((a) => a.id)));
    if (pruned !== outline) setOutline(pruned);
  }, [atoms, outline]);

  const apply = (fn: (o: PaperOutline) => PaperOutline) => setOutline((o) => (o ? fn(o) : o));
  const placed = useMemo(() => (outline ? placedClipIds(outline) : new Set<string>()), [outline]);
  const unplaced = useMemo(() => atoms.filter((a) => !placed.has(a.id)), [atoms, placed]);
  const next = outline ? nextSection(outline) : undefined;

  const choose = (id: PaperTemplateId) => setOutline(createOutline(id));

  const [tab, setTab] = useState<'outline' | 'preview'>('outline');
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});

  const draftClips = useMemo(() => {
    const m = new Map<string, DraftClip>();
    for (const a of atoms) {
      m.set(a.id, { id: a.id, kind: getEvidenceKind(a), text: a.content?.text || a.content?.rawText || a.metadata?.selectedText || a.title || '' });
    }
    return m;
  }, [atoms]);

  const draftSection = async (section: OutlineSection) => {
    if (section.draft && !window.confirm('Draft again? The current draft is kept, and you can bring it back with Restore previous draft.')) return;
    const input: DraftInput = {
      sectionTitle: section.title,
      sectionHint: section.hint,
      point: section.point,
      parts: section.parts.map((p) => ({ id: p.id, title: p.title, clips: p.clipIds.map((id) => draftClips.get(id)).filter((c): c is DraftClip => !!c) })),
    };
    if (countClips(input) === 0) return;
    setDraftingId(section.id);
    setDraftErrors((e) => ({ ...e, [section.id]: '' }));
    try {
      const res = await fetch('/api/ai/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Could not draft this section.');
      apply((o) => replaceDraft(o, section.id, { sentences: json.data.sentences, generatedAt: json.data.generatedAt }));
    } catch (err) {
      setDraftErrors((e) => ({ ...e, [section.id]: err instanceof Error ? err.message : 'Could not draft this section.' }));
    } finally {
      setDraftingId(null);
    }
  };

  const [style, setStyleState] = useState<InTextStyle>(() => {
    const saved = prefs.get(STYLE_PREF_KEY);
    return saved === 'ieee' ? 'ieee' : 'harvard';
  });
  const setStyle = (next: InTextStyle) => {
    setStyleState(next);
    prefs.set(STYLE_PREF_KEY, next);
  };

  // One citation group per part, in document order. Switching style only re-renders this.
  const citations = useMemo(() => {
    const groups: CitedSource[][] = [];
    const partOfGroup: string[] = [];
    const missingByPart = new Map<string, number>();
    for (const section of outline?.sections ?? []) {
      for (const part of section.parts) {
        const { cited, missing } = citedSources(part.clipIds, byId);
        if (missing > 0) missingByPart.set(part.id, missing);
        if (cited.length > 0) { groups.push(cited); partOfGroup.push(part.id); }
      }
    }
    const rendered = renderCitations(style, groups);
    const markers = new Map<string, MarkerPart[]>();
    rendered.markers.forEach((m, i) => markers.set(partOfGroup[i], m));
    // First part that cites each source, so a reference can link back to it.
    const firstPart = new Map<string, string>();
    groups.forEach((g, i) => g.forEach((c) => { if (!firstPart.has(c.sourceId)) firstPart.set(c.sourceId, partOfGroup[i]); }));
    return { markers, missingByPart, references: rendered.references, firstPart };
  }, [outline, byId, style]);

  const clipInfos = useMemo(() => {
    const clips = new Map<string, ClipInfo>();
    for (const a of atoms) {
      const kind = getEvidenceKind(a);
      clips.set(a.id, {
        id: a.id,
        text: a.content?.text || a.content?.rawText || a.metadata?.selectedText || a.title || '',
        kind,
        record: a.metadata?.citation,
        page: kind === 'quote' ? (a.metadata?.pageNumber ?? a.metadata?.page) : undefined,
        retractionState: a.metadata?.health?.retraction?.state,
        media: mediaOf(a),
      });
    }
    return clips;
  }, [atoms]);

  const previewDoc = useMemo(() => (outline ? buildPreview(outline, clipInfos, style) : undefined), [outline, clipInfos, style]);

  // The checklist of every section, recomputed whenever clips, drafts or citations change.
  const checklists = useMemo(() => {
    const m = new Map<string, SectionChecklist>();
    for (const s of outline?.sections ?? []) m.set(s.id, checkSection(s, clipInfos));
    return m;
  }, [outline, clipInfos]);

  // A section stays done only while its checklist still passes.
  const isDone = (s: OutlineSection) => !!s.done && (checklists.get(s.id)?.canComplete ?? false);

  return (
    <div data-testid="paper-outline" className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#D9E1EC] dark:border-[#27272A] px-4 py-2.5 md:px-6">
        <div className="basis-full min-w-0 sm:basis-auto">
          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">Paper outline</h2>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">Plan where each clip goes. Nothing here is a finished paper.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {outline && (
            <div role="tablist" aria-label="Outline or preview" className="flex rounded-lg border border-[#D9E1EC] dark:border-[#27272A] p-0.5 text-xs">
              {(['outline', 'preview'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  data-testid={`tab-${t}`}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-2.5 py-1 capitalize ${tab === t ? 'bg-[#325FEC] text-white' : 'text-slate-600 dark:text-zinc-400'}`}
                >{t}</button>
              ))}
            </div>
          )}
          {outline && (
            <button
              type="button"
              onClick={() => { if (window.confirm('Start over with a different template? Your parts and placements will be cleared. Your clips stay.')) setOutline(undefined); }}
              className="rounded-lg border border-[#D9E1EC] dark:border-[#27272A] px-2.5 py-1 text-xs text-slate-700 dark:text-zinc-300"
            >Change template</button>
          )}
          <button type="button" onClick={onClose} className="rounded-lg border border-[#D9E1EC] dark:border-[#27272A] px-2.5 py-1 text-xs text-slate-700 dark:text-zinc-300">Back to clips</button>
        </div>
      </div>

      {(saveError || prefs.saveError) && (
        <p role="alert" data-testid="save-error" className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800 md:px-6">Not saved. {saveError || prefs.saveError}</p>
      )}

      {!loaded ? null : !outline ? (
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <p className="mb-3 text-sm text-slate-700 dark:text-zinc-300">Pick what you are writing. You can add, rename and reorder parts after.</p>
          <div className="grid items-stretch gap-3 md:grid-cols-2">
            {(Object.keys(PAPER_TEMPLATES) as PaperTemplateId[]).map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`template-${id}`}
                onClick={() => choose(id)}
                className="h-full rounded-xl border border-[#D9E1EC] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#0F0F12] p-4 text-left hover:border-[#325FEC]"
              >
                <div className="text-sm font-semibold text-[#0F172A] dark:text-white">{PAPER_TEMPLATES[id].label}</div>
                <div className="mt-1 text-xs text-slate-600 dark:text-zinc-400">{PAPER_TEMPLATES[id].description}</div>
                <div className="mt-2 font-mono text-[10px] text-slate-500 dark:text-zinc-500">{PAPER_TEMPLATES[id].sections.map((s) => s.title).join(' → ')}</div>
              </button>
            ))}
          </div>
        </div>
      ) : tab === 'preview' && previewDoc ? (
        <PaperPreview doc={previewDoc} style={style} onStyleChange={setStyle} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="min-w-0 flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={outline.title ?? ''}
                onChange={(e) => apply((o) => setPaperMeta(o, { title: e.target.value }))}
                placeholder="Working title of your paper"
                aria-label="Paper title"
                className="rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-3 py-1.5 text-[13px] text-[#0F172A] dark:text-zinc-100 outline-none focus:border-[#325FEC]"
              />
              <input
                value={outline.authors ?? ''}
                onChange={(e) => apply((o) => setPaperMeta(o, { authors: e.target.value }))}
                placeholder="Authors, for example J. Lee, R. Patel"
                aria-label="Paper authors"
                className="rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#121214] px-3 py-1.5 text-[13px] text-[#0F172A] dark:text-zinc-100 outline-none focus:border-[#325FEC]"
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400" data-testid="outline-next">
              {outline.sections.filter(isDone).length} of {outline.sections.length} sections done.{' '}
              {next ? <>Next: <strong>{next.title}</strong>. {next.hint}</> : 'Every section is done. Preview it, then check the journal\'s own format before you submit.'}
            </p>
            {outline.sections.map((s, i) => (
              <SectionCard key={s.id} section={s} index={i} isNext={next?.id === s.id} byId={byId} unplaced={unplaced} apply={apply} markers={citations.markers} missingByPart={citations.missingByPart} onDraft={() => draftSection(s)} drafting={draftingId === s.id} draftError={draftErrors[s.id] || undefined} draftClips={draftClips} checklist={checklists.get(s.id) ?? { items: [], canComplete: false }} done={isDone(s)} clipInfos={clipInfos} />
            ))}

            <section data-testid="reference-list" className="rounded-xl border border-[#D9E1EC] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#0F0F12] p-4">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white">References</h3>
                <div role="group" aria-label="Citation style" className="flex rounded-lg border border-[#D9E1EC] dark:border-[#27272A] p-0.5 text-xs">
                  {IN_TEXT_STYLES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      data-testid={`style-${st.id}`}
                      aria-pressed={style === st.id}
                      title={st.hint}
                      onClick={() => setStyle(st.id)}
                      className={`rounded-md px-2.5 py-1 ${style === st.id ? 'bg-[#325FEC] text-white' : 'text-slate-600 dark:text-zinc-400'}`}
                    >{st.label}</button>
                  ))}
                </div>
              </header>
              {citations.references.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">Place clips that have a citation under a part and the sources appear here.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {citations.references.map((r) => (
                    <li key={r.sourceId} id={`ref-${r.sourceId}`} data-testid="reference-item" className="flex gap-2 rounded px-1 text-[12px] leading-snug text-[#0F172A] dark:text-zinc-200">
                      {r.label && <span className="shrink-0 font-mono">{r.label}</span>}
                      <span className="min-w-0 flex-1 break-words">
                        {r.text}
                        {r.incomplete && <span className="ml-1 rounded border border-amber-300 px-1 text-[10px] text-amber-800 dark:text-amber-300">incomplete</span>}
                      </span>
                      <button type="button" aria-label="Back to where this is cited" title="Back to where this is cited" onClick={() => jumpTo(`cite-${citations.firstPart.get(r.sourceId)}`)} className="shrink-0 text-[#325FEC] dark:text-[#518FFF]">↩</button>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-3 text-[11px] text-slate-500 dark:text-zinc-500">Preview only. Journals set their own reference format; check the target journal's guide before you submit.</p>
            </section>
          </div>

          <aside className="w-full shrink-0 border-t border-[#D9E1EC] dark:border-[#27272A] md:w-80 md:border-l md:border-t-0">
            <div className="flex h-full flex-col">
              <div className="border-b border-[#D9E1EC] dark:border-[#27272A] px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-[#0F172A] dark:text-white">Clips not placed yet ({unplaced.length})</h3>
                  <button type="button" data-testid="clips-toggle" aria-expanded={asideOpen} onClick={() => setAsideOpen((v) => !v)} className="text-xs text-[#325FEC] dark:text-[#518FFF] md:hidden">{asideOpen ? 'Hide' : 'Show'}</button>
                </div>
                <p className={`${asideOpen ? '' : 'hidden md:block'} text-[11px] text-slate-500 dark:text-zinc-400`}>Drag a clip onto a part.</p>
                {onCreateClip && (
                  <button type="button" data-testid="paste-toggle" aria-expanded={pasteOpen} onClick={() => setPasteOpen((v) => !v)} className={`${asideOpen ? '' : 'hidden md:inline-block'} mt-2 rounded-lg border border-[#B8C4D6] dark:border-[#3A3A42] bg-white dark:bg-[#18181B] px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200 hover:border-[#325FEC]`}>{pasteOpen ? 'Close paste box' : 'Paste text from NotebookLM or Zotero'}</button>
                )}
              </div>
              <div className={`${asideOpen ? 'flex' : 'hidden md:flex'} min-h-0 flex-1 flex-col`}>
              {onCreateClip && pasteOpen && <PastePanel projectId={projectId} onCreate={onCreateClip} />}
              {onCreateClip && (
                <div className="border-b border-[#D9E1EC] dark:border-[#27272A] px-4 py-2">
                  <button type="button" data-testid="import-toggle" aria-expanded={importOpen} onClick={() => setImportOpen((v) => !v)} className="rounded-lg border border-[#B8C4D6] dark:border-[#3A3A42] bg-white dark:bg-[#18181B] px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-zinc-200 hover:border-[#325FEC]">{importOpen ? 'Close import' : 'Import references (RIS or BibTeX)'}</button>
                </div>
              )}
              {onCreateClip && importOpen && (
                <ImportRefsPanel projectId={projectId} atoms={atoms} onApplied={(changes) => setCitationOverrides((prev) => new Map([...prev, ...changes]))} />
              )}
              <div className="max-h-72 flex-1 space-y-1.5 overflow-y-auto p-3 md:max-h-none">
                {unplaced.length === 0 && <p className="text-[11px] text-slate-500 dark:text-zinc-500">All clips are placed.</p>}
                {unplaced.map((a) => <ClipChip key={a.id} atom={a} draggable />)}
              </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
