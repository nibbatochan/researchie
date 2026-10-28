'use client';

import React, { useMemo, useState } from 'react';
import { X, Plus, Trash } from '@phosphor-icons/react';
import type { ResearchAtom, ResearchProject } from '@/lib/types/research';
import { FormattedAIMessage } from './FormattedAIMessage';
import { IN_TEXT_STYLES, renderCitations, type CitedSource, type InTextStyle } from '@/lib/citations/inText';

// Edit a deliverable: the AI's text on the left, an empty page on the right for the researcher's own words, and the
// references (the sources the AI used, plus any the researcher adds) in the chosen style at the bottom. Saving sends the
// rewritten text to the chosen project or sub-project; the references and the cited clips travel with it.

export interface EditSave {
  title: string;
  markdown: string;
  tags: string[];
  sourceAtomIds: string[];
  references: string[];
  projectId: string;
}

interface Props {
  /** The deliverable's name, for the heading. */
  title: string;
  /** The AI's text. */
  content: string;
  /** The clips the AI used for this deliverable. */
  sources: ResearchAtom[];
  /** Every clip of the project, to add more sources from. */
  projectAtoms: ResearchAtom[];
  /** The project and its sub-projects, to choose where the note is saved. */
  projects: ResearchProject[];
  /** The project open now: the default save target. */
  currentProjectId: string;
  onClose: () => void;
  onSave: (save: EditSave) => void;
}

const STYLE_KEY = 'researchie.referenceStyle';

function storedStyle(): InTextStyle {
  try {
    const v = localStorage.getItem(STYLE_KEY);
    if (IN_TEXT_STYLES.some((s) => s.id === v)) return v as InTextStyle;
  } catch {
    // no storage: the default is used
  }
  return 'apa';
}

/** A reference line for a clip that has no citation details: what is known about where it came from. */
function plainSource(a: ResearchAtom): string {
  const where = a.metadata?.pageTitle || a.metadata?.sourceUrl || a.content?.targetUrl || '';
  return [a.title, where && where !== a.title ? where : ''].filter(Boolean).join('. ');
}

/** The AI's in-text markers ([1], [1, 2], [Source: …], [Page 3]) mean nothing once the text is edited, so they go. */
function withoutMarkers(text: string): string {
  return text.replace(/\s*\[(?:\d+(?:\s*[,–-]\s*\d+)*|Source:[^\]]*|Page [^\]]*)\]/gi, '').trim();
}

export const DeliverableEditModal: React.FC<Props> = ({ title, content, sources, projectAtoms, projects, currentProjectId, onClose, onSave }) => {
  const [text, setText] = useState('');
  const [style, setStyle] = useState<InTextStyle>(storedStyle);
  const [ids, setIds] = useState<string[]>(() => sources.map((a) => a.id));
  const [adding, setAdding] = useState('');
  const [projectId, setProjectId] = useState(currentProjectId);
  const plain = useMemo(() => withoutMarkers(content), [content]);

  const byId = useMemo(() => new Map([...projectAtoms, ...sources].map((a) => [a.id, a] as const)), [projectAtoms, sources]);
  const chosen = ids.map((id) => byId.get(id)).filter((a): a is ResearchAtom => Boolean(a));
  const cited: CitedSource[] = chosen.flatMap((a) => (a.metadata?.citation ? [{ sourceId: a.id, record: a.metadata.citation }] : []));
  const unlisted = chosen.filter((a) => !a.metadata?.citation);
  const references = useMemo(() => renderCitations(style, [cited]).references, [style, cited.map((c) => c.sourceId).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const addable = projectAtoms.filter((a) => !ids.includes(a.id) && (a.metadata?.citation || a.metadata?.sourceUrl));
  const targets = projects.map((p) => {
    const parent = p.parentId ? projects.find((x) => x.id === p.parentId) : undefined;
    return { id: p.id, label: parent ? `${parent.title} / ${p.title}` : p.title };
  });

  const pickStyle = (next: InTextStyle) => {
    setStyle(next);
    try {
      localStorage.setItem(STYLE_KEY, next);
    } catch {
      // not saved; the choice still applies here
    }
  };

  const referenceLines = [
    ...references.map((r) => `${r.label ? `${r.label} ` : ''}${r.text}`),
    ...unlisted.map(plainSource),
  ];

  const save = () => {
    onSave({ title: 'Paraphrased answer', markdown: text.trim(), tags: ['user-written'], sourceAtomIds: ids, references: referenceLines, projectId });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" data-testid="deliverable-edit-modal" role="dialog" aria-modal="true" aria-label={`Edit ${title}`}>
      <div className="flex h-[90vh] w-[70vw] min-w-[640px] max-w-[1400px] flex-col rounded-xl border border-[#D9E1EC] bg-white shadow-2xl dark:border-[#27272A] dark:bg-[#121214]">
        <div className="flex items-center justify-between border-b border-[#D9E1EC] px-4 py-3 dark:border-[#27272A]">
          <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">Edit: {title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] cursor-pointer"><X size={16} /></button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-[#D9E1EC] dark:divide-[#27272A]">
          <section className="flex min-h-0 flex-col" aria-label="AI-generated content">
            <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Generated content</p>
            <div className="min-h-0 flex-1 select-text overflow-y-auto px-4 pb-3 pt-2 text-sm text-[#0F172A] dark:text-zinc-100" data-testid="edit-ai-content">
              <FormattedAIMessage content={plain} />
            </div>
          </section>
          <section className="flex min-h-0 flex-col" aria-label="Your version">
            <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Your version</p>
            <textarea
              data-testid="edit-own-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write this in your own words. Select text on the left to read it while you write."
              className="min-h-0 flex-1 resize-none bg-transparent px-4 pb-3 pt-2 text-sm leading-relaxed text-[#0F172A] outline-none placeholder:text-slate-400 dark:text-zinc-100"
            />
          </section>
        </div>

        <div className="max-h-[32%] overflow-y-auto border-t border-[#D9E1EC] px-4 py-3 dark:border-[#27272A]" data-testid="edit-references">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">References</p>
            <select
              data-testid="edit-reference-style"
              value={style}
              onChange={(e) => pickStyle(e.target.value as InTextStyle)}
              aria-label="Reference style"
              className="rounded-md border border-[#D9E1EC] bg-white px-2 py-1 text-xs dark:border-[#27272A] dark:bg-[#18181B] dark:text-zinc-100"
            >
              {IN_TEXT_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select
              data-testid="edit-add-source"
              value={adding}
              onChange={(e) => {
                const id = e.target.value;
                setAdding('');
                if (id) setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
              }}
              aria-label="Add a source from this project"
              className="max-w-[16rem] rounded-md border border-[#D9E1EC] bg-white px-2 py-1 text-xs dark:border-[#27272A] dark:bg-[#18181B] dark:text-zinc-100"
            >
              <option value="">Add a source from this project</option>
              {addable.map((a) => <option key={a.id} value={a.id}>{(a.metadata?.citation?.title || a.title || a.id).slice(0, 70)}</option>)}
            </select>
            <Plus size={12} className="text-slate-400" aria-hidden />
          </div>
          {chosen.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-zinc-400">No sources. Add one from this project if your text cites a paper.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-xs text-slate-700 dark:text-zinc-300">
              {chosen.map((a) => {
                const ref = references.find((r) => r.sourceId === a.id);
                return (
                  <li key={a.id} className="flex items-start gap-2" data-testid="edit-reference-row">
                    <span className="min-w-0 flex-1">{ref ? `${ref.label ? `${ref.label} ` : ''}${ref.text}` : plainSource(a)}</span>
                    <button type="button" onClick={() => setIds((prev) => prev.filter((x) => x !== a.id))} aria-label="Remove this source" title="Remove this source" className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"><Trash size={12} /></button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#D9E1EC] px-4 py-3 dark:border-[#27272A]">
          {targets.length > 0 && (
            <label className="mr-auto flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
              <span>Save to</span>
              <select
                data-testid="edit-save-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="max-w-[18rem] rounded-md border border-[#D9E1EC] bg-white px-2 py-1 text-xs text-[#0F172A] dark:border-[#27272A] dark:bg-[#18181B] dark:text-zinc-100"
              >
                {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
          )}
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-[#EEF3F8] dark:text-zinc-300 dark:hover:bg-[#18181B] cursor-pointer">Cancel</button>
          <button type="button" data-testid="edit-save" disabled={!text.trim()} onClick={save} className="rounded-lg bg-[#325FEC] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 cursor-pointer">Save to Project</button>
        </div>
      </div>
    </div>
  );
};
