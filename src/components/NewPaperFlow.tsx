'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Files, Columns, TextAlignLeft, Quotes, ListChecks, FolderSimple, Lightbulb } from '@phosphor-icons/react';
import type { ResearchProject } from '@/lib/types/research';
import { PICKER_TEMPLATES, getTemplate, type PaperTemplate, type CitationStyleId } from '@/lib/paper/templates';
import { buildWireframe } from '@/lib/paper/wireframe';
import { PageWireframe } from './PageWireframe';
import { TemplateIcon } from './templateIcons';

// The new-paper flow: pick a template (the details are the main view, the whole page-by-page wireframe sits in the
// small box beside them), then, for a template that is not Blank, answer the few questions worth asking up front.
// Everything else is filled in the editor. Blank opens straight away. See docs/research/paper-mode-workspace.md.

export interface NewPaperChoice {
  title: string;
  templateId: string;
  projectId: string | null;
  citationStyle: CitationStyleId;
  venue: string;
  wordLimit: number | null;
}

const STYLE_LABEL: Record<CitationStyleId, string> = {
  apa: 'APA 7 (author, date)',
  harvard: 'Harvard (author, date)',
  mla: 'MLA 9 (author, page)',
  chicago: 'Chicago (author, date)',
  ieee: 'IEEE (numbered)',
  vancouver: 'Vancouver (numbered)',
  ama: 'AMA (numbered)',
};

const OFFERED_STYLES: CitationStyleId[] = ['apa', 'harvard', 'mla', 'chicago', 'ieee', 'vancouver', 'ama'];

const ABSTRACT_LABEL = { none: 'No abstract', unstructured: 'One-paragraph abstract', structured: 'Structured abstract' } as const;

interface Props {
  projects: ResearchProject[];
  /** Project to preselect as the data source, when the person came from one. */
  defaultProjectId?: string | null;
  onCreate: (choice: NewPaperChoice) => Promise<void> | void;
  onClose: () => void;
}

const Fact: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-zinc-300">
    <Icon size={13} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" aria-hidden />
    {children}
  </span>
);

export const NewPaperFlow: React.FC<Props> = ({ projects, defaultProjectId = null, onCreate, onClose }) => {
  const [step, setStep] = useState<'pick' | 'details'>('pick');
  const [selected, setSelected] = useState<PaperTemplate>(PICKER_TEMPLATES[1] ?? PICKER_TEMPLATES[0]);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId && defaultProjectId !== 'all' ? defaultProjectId : null);
  const [style, setStyle] = useState<CitationStyleId>(selected.citationStyle);
  const [venue, setVenue] = useState('');
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const pages = useMemo(() => buildWireframe(selected), [selected]);
  const twoCol = pages.filter((p) => p.columns === 2).length;
  const columnsLabel = twoCol === 0 ? 'One column' : twoCol === pages.length - 1 || selected.columns === 2 ? 'Two columns' : 'Some pages in two columns';

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (choice: NewPaperChoice) => {
    if (busy) return;
    setBusy(true);
    try {
      await onCreate(choice);
    } finally {
      setBusy(false);
    }
  };

  const useTemplate = (t: PaperTemplate) => {
    if (t.id === 'blank') {
      void submit({ title: 'Untitled paper', templateId: 'blank', projectId, citationStyle: t.citationStyle, venue: '', wordLimit: null });
      return;
    }
    setStyle(t.citationStyle);
    setStep('details');
  };

  const words = limit.trim() === '' ? null : Number(limit);
  const limitOk = words === null || (Number.isInteger(words) && words > 0 && words < 1_000_000);
  const canCreate = title.trim().length > 0 && limitOk && !busy;
  const input = 'mt-1 w-full rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-3 py-2 text-sm text-[#0F172A] dark:text-white';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-backdropIn" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="New paper"
        data-testid="new-paper-flow"
        className="animate-popIn w-[min(1280px,96vw)] h-[min(900px,94vh)] flex flex-col rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D2DCEA] dark:border-[#27272A]">
          <div className="flex items-center gap-2.5">
            {step === 'details' ? (
              <button type="button" onClick={() => setStep('pick')} aria-label="Back to templates" className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                <ArrowLeft size={16} />
              </button>
            ) : null}
            <span className="w-8 h-8 rounded-lg bg-[#325FEC]/10 text-[#325FEC] dark:text-[#8DB4FF] flex items-center justify-center">
              <TemplateIcon blank={step === 'pick' || selected.id === 'blank'} size={18} />
            </span>
            <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">{step === 'pick' ? 'New paper' : selected.label}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {step === 'pick' ? (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)_22rem] grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 overflow-hidden">
            <ul className="overflow-y-auto max-h-40 lg:max-h-none border-b lg:border-b-0 lg:border-r border-[#D2DCEA] dark:border-[#27272A] p-2" role="listbox" aria-label="Templates">
              {PICKER_TEMPLATES.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected.id === t.id}
                    data-testid={`template-${t.id}`}
                    onClick={() => setSelected(t)}
                    onDoubleClick={() => useTemplate(t)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                      selected.id === t.id ? 'bg-[#325FEC]/10 text-[#325FEC] dark:text-[#8DB4FF] font-semibold' : 'text-slate-700 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#18181B]'
                    }`}
                  >
                    <TemplateIcon blank={t.id === 'blank'} size={18} className="flex-shrink-0" />
                    <span className="min-w-0">{t.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            <section className="overflow-y-auto p-6" data-testid="template-details" key={selected.id}>
              <div className="max-w-2xl animate-clipIn">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#325FEC]/10 text-[#325FEC] dark:text-[#8DB4FF] flex items-center justify-center">
                    <TemplateIcon blank={selected.id === 'blank'} size={24} />
                  </span>
                  <div>
                    <h3 className="text-lg font-display font-bold text-[#0F172A] dark:text-white">{selected.label}</h3>
                    <p className="text-sm text-slate-700 dark:text-zinc-300">{selected.bestFor}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-500">{selected.basis}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Fact icon={Files}>{pages.length} {pages.length === 1 ? 'page' : 'pages'}</Fact>
                  <Fact icon={Columns}>{columnsLabel}</Fact>
                  <Fact icon={TextAlignLeft}>{ABSTRACT_LABEL[selected.abstract]}</Fact>
                  <Fact icon={Quotes}>{STYLE_LABEL[selected.citationStyle]}</Fact>
                </div>

                {selected.guideline && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#325FEC]/25 bg-[#325FEC]/[0.05] px-3.5 py-3 text-xs text-slate-700 dark:text-zinc-300">
                    <ListChecks size={16} weight="bold" className="mt-0.5 flex-shrink-0 text-[#325FEC] dark:text-[#8DB4FF]" aria-hidden />
                    <span>
                      <span className="font-semibold text-[#0F172A] dark:text-white">Checklist to follow: {selected.guideline}.</span> The editor lists its items so you can tick them off. It does not decide whether your paper complies.
                    </span>
                  </div>
                )}

                {selected.sections.length === 0 ? (
                  <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-dashed border-[#C5D0E3] dark:border-white/15 px-4 py-5 text-sm text-slate-600 dark:text-zinc-400">
                    <Lightbulb size={18} weight="duotone" className="mt-0.5 flex-shrink-0 text-[#325FEC] dark:text-[#8DB4FF]" aria-hidden />
                    An empty page. Add your own sections as you write, or start from a template if you want a structure.
                  </div>
                ) : (
                  <ol className="mt-6 space-y-3" aria-label="Sections">
                    {selected.sections.map((sec) =>
                      sec.level === 1 ? (
                        <li key={sec.title}>
                          <p className="text-sm font-semibold text-[#0F172A] dark:text-white">{sec.title}</p>
                          <p className="text-xs text-slate-500 dark:text-zinc-500 leading-snug">{sec.hint}</p>
                        </li>
                      ) : (
                        <li key={sec.title} className="ml-3 pl-3 border-l-2 border-[#D2DCEA] dark:border-[#27272A]">
                          <p className="text-xs font-medium text-slate-800 dark:text-zinc-200">{sec.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-500 leading-snug">{sec.hint}</p>
                        </li>
                      )
                    )}
                  </ol>
                )}
              </div>
            </section>

            <aside className="hidden lg:flex flex-col min-h-0 border-l border-[#D2DCEA] dark:border-[#27272A] bg-[#E8EDF6] dark:bg-[#0B0B0D]" data-testid="template-preview" key={`p-${selected.id}`}>
              <p className="px-4 pt-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">How it will look</p>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="flex flex-col gap-5">
                  {pages.map((page, i) => (
                    <figure key={i} className="animate-clipIn" style={{ ['--i' as string]: i }} title={page.caption}>
                      <PageWireframe page={page} className="w-full" />
                      <figcaption className="mt-1.5 text-center text-[11px] text-slate-500 dark:text-zinc-500 truncate">{page.caption}</figcaption>
                    </figure>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-snug text-slate-500 dark:text-zinc-500">A plan of the shape, not journal formatting.</p>
              </div>
            </aside>
          </div>
        ) : (
          <form
            className="flex-1 overflow-y-auto p-6 space-y-4 w-full max-w-xl mx-auto"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canCreate) return;
              void submit({ title: title.trim(), templateId: selected.id, projectId, citationStyle: style, venue: venue.trim(), wordLimit: words });
            }}
          >
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Paper name</span>
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} data-testid="new-paper-title" placeholder="For example: Sleep and memory in adolescents" className={input} />
            </label>
            <label className="block">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <FolderSimple size={13} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" aria-hidden /> Where should your clips come from?
              </span>
              <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value || null)} data-testid="new-paper-project" className={input}>
                <option value="">None yet. I will pick later.</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.parentId ? '  ↳ ' : ''}
                    {p.title}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-zinc-500">The editor sidebar lists this project&apos;s text clips, images and citations. You can change it later.</span>
            </label>
            <label className="block">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <Quotes size={13} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" aria-hidden /> Citation style
              </span>
              <select value={style} onChange={(e) => setStyle(e.target.value as CitationStyleId)} className={input}>
                {OFFERED_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {STYLE_LABEL[s]}
                    {s === getTemplate(selected.id)?.citationStyle ? ' (usual for this template)' : ''}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-zinc-500">If your journal names a style, pick that one.</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Journal or conference <span className="font-normal text-slate-500">(optional)</span>
                </span>
                <input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={200} className={input} />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Word limit <span className="font-normal text-slate-500">(optional)</span>
                </span>
                <input value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" className={input} />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500">Authors, affiliations, funding and ethics are filled in the editor, next to the text they belong to.</p>
            <button type="submit" disabled={!canCreate} className="hidden" aria-hidden tabIndex={-1} />
          </form>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#D2DCEA] dark:border-[#27272A]">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-zinc-400 hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] cursor-pointer">
            Cancel
          </button>
          {step === 'pick' ? (
            <button type="button" disabled={busy} onClick={() => useTemplate(selected)} data-testid="template-use" className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#325FEC] text-white hover:bg-[#2A4FCC] disabled:opacity-50 cursor-pointer">
              {selected.id === 'blank' ? 'Open blank paper' : 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canCreate}
              data-testid="new-paper-submit"
              onClick={() => void submit({ title: title.trim(), templateId: selected.id, projectId, citationStyle: style, venue: venue.trim(), wordLimit: words })}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#325FEC] text-white hover:bg-[#2A4FCC] disabled:opacity-50 cursor-pointer"
            >
              Create paper
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
