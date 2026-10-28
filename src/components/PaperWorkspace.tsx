'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, MagnifyingGlass, SquaresFour, ListBullets, Trash, Copy, PencilSimple, ArrowCounterClockwise, FolderSimple, Clock, Article, FileDashed } from '@phosphor-icons/react';
import type { ResearchProject } from '@/lib/types/research';
import type { PaperSummary } from '@/lib/data/papers';
import { getTemplate } from '@/lib/paper/templates';
import { usePrefs } from '@/lib/prefs/prefsContext';
import { INFO_PENDING_KEY } from '@/lib/paper/store';
import { templateToDoc, defaultMeta } from '@/lib/paper/docModel';
import { buildWireframe } from '@/lib/paper/wireframe';
import { PageWireframe } from './PageWireframe';
import { NewPaperFlow, type NewPaperChoice } from './NewPaperFlow';
import { TemplateIcon } from './templateIcons';

// Paper Mode home: every paper the person wrote, like a file explorer. List by default, grid on request, search,
// rename, duplicate, delete with an undo toast, and a trash that keeps deleted papers until they are removed for good.
// The editor that opens a paper is the next phase; until it lands, opening a paper tells the person so.

interface Props {
  projects: ResearchProject[];
  /** Project the person was in, used to preselect the data source. */
  defaultProjectId?: string | null;
  /** Opens a paper. A paper just created comes with its document, so the editor needs no round trip. */
  onOpenPaper?: (paper: PaperSummary & { doc?: unknown; meta?: unknown }) => void;
}

const UNDO_MS = 8000;
const VIEW_KEY = 'researchie.paperView';

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, json };
}

export const PaperWorkspace: React.FC<Props> = ({ projects, defaultProjectId = null, onOpenPaper }) => {
  const prefs = usePrefs();
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [trash, setTrash] = useState<PaperSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [undo, setUndo] = useState<PaperSummary | null>(null);
  const [note, setNote] = useState('');
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The editor is a separate chunk. Start loading it when the picker opens, so Create does not wait for it.
  useEffect(() => {
    if (creating) void import('./PaperEditor');
  }, [creating]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'grid' || saved === 'list') setView(saved);
    } catch {
      /* the default stays */
    }
  }, []);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api('/api/papers'), api('/api/papers?trash=1')]);
    if (!a.ok) setError(a.json.error || 'Papers could not be loaded.');
    else {
      setError('');
      setPapers(a.json.data ?? []);
      setTrash(b.json.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = showTrash ? trash : papers;
    return q ? base.filter((p) => p.title.toLowerCase().includes(q) || (getTemplate(p.templateId)?.label ?? '').toLowerCase().includes(q)) : base;
  }, [papers, trash, query, showTrash]);

  const projectName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.title ?? 'A project you no longer see' : 'No data source');

  const setViewMode = (v: 'list' | 'grid') => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* not saved */
    }
  };

  const create = async (c: NewPaperChoice) => {
    const template = getTemplate(c.templateId) ?? getTemplate('blank')!;
    (window as unknown as { __paperOpenStart?: number }).__paperOpenStart = performance.now(); // the editor reports how long the open took
    const r = await api('/api/papers', {
      method: 'POST',
      body: JSON.stringify({
        title: c.title,
        templateId: c.templateId,
        citationStyle: c.citationStyle,
        projectId: c.projectId,
        doc: templateToDoc(template),
        meta: defaultMeta(template, c.title, { venue: c.venue, wordLimit: c.wordLimit }),
      }),
    });
    if (!r.ok) {
      setNote(r.json.error || 'The paper could not be created.');
      return;
    }
    setCreating(false);
    prefs.set(INFO_PENDING_KEY, '1'); // the editor shows its note once, for this new paper
    void load();
    onOpenPaper?.(r.json.data);
  };

  const rename = async (p: PaperSummary, title: string) => {
    setRenaming(null);
    const next = title.trim();
    if (!next || next === p.title) return;
    const r = await api(`/api/papers/${p.id}`, { method: 'PATCH', body: JSON.stringify({ title: next }) });
    if (!r.ok) setNote(r.json.error || 'The paper could not be renamed.');
    await load();
  };

  const duplicate = async (p: PaperSummary) => {
    const r = await api('/api/papers', { method: 'POST', body: JSON.stringify({ action: 'duplicate', id: p.id }) });
    if (!r.ok) setNote(r.json.error || 'The paper could not be copied.');
    await load();
  };

  const remove = async (p: PaperSummary) => {
    const r = await api(`/api/papers/${p.id}`, { method: 'DELETE' });
    if (!r.ok) return setNote(r.json.error || 'The paper could not be deleted.');
    await load();
    setUndo(p);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
  };

  const restore = async (p: PaperSummary) => {
    setUndo(null);
    const r = await api('/api/papers', { method: 'POST', body: JSON.stringify({ action: 'restore', id: p.id }) });
    if (!r.ok) setNote(r.json.error || 'The paper could not be restored.');
    await load();
  };

  const purge = async (p: PaperSummary) => {
    if (!window.confirm(`Remove "${p.title}" for good? This cannot be undone.`)) return;
    const r = await api('/api/papers', { method: 'POST', body: JSON.stringify({ action: 'purge', id: p.id }) });
    if (!r.ok) setNote(r.json.error || 'The paper could not be removed.');
    await load();
  };

  const open = (p: PaperSummary) => {
    if (showTrash) return;
    (window as unknown as { __paperOpenStart?: number }).__paperOpenStart = performance.now();
    onOpenPaper?.(p);
  };

  const actionBtn = 'p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer';

  // The paper's first page, drawn from its template, with its own name on it. Real page text comes with the editor.
  const thumb = (p: PaperSummary, grid: boolean) => {
    const t = getTemplate(p.templateId);
    const [first] = t ? buildWireframe(t) : [];
    return first ? (
      <PageWireframe page={first} title={p.title} className={grid ? 'w-full' : 'w-8 flex-shrink-0'} />
    ) : null;
  };

  const renameInput = (p: PaperSummary) => (
    <input
      autoFocus
      defaultValue={p.title}
      maxLength={200}
      aria-label="Paper name"
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => void rename(p, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setRenaming(null);
      }}
      className="w-full rounded-md border border-[#325FEC] bg-white dark:bg-[#18181B] px-2 py-0.5 text-sm text-[#0F172A] dark:text-white"
    />
  );

  const actions = (p: PaperSummary) =>
    showTrash ? (
      <>
        <button type="button" onClick={() => void restore(p)} aria-label="Restore" title="Restore" className={actionBtn}><ArrowCounterClockwise size={15} /></button>
        <button type="button" onClick={() => void purge(p)} aria-label="Remove for good" title="Remove for good" className={`${actionBtn} hover:!text-red-600`}><Trash size={15} /></button>
      </>
    ) : (
      <>
        <button type="button" onClick={() => setRenaming(p.id)} aria-label="Rename" title="Rename" className={actionBtn}><PencilSimple size={15} /></button>
        <button type="button" onClick={() => void duplicate(p)} aria-label="Make a copy" title="Make a copy" className={actionBtn}><Copy size={15} /></button>
        <button type="button" onClick={() => void remove(p)} aria-label="Delete" title="Delete" data-testid="paper-delete" className={`${actionBtn} hover:!text-red-600`}><Trash size={15} /></button>
      </>
    );

  const meta = (p: PaperSummary) => {
    const t = getTemplate(p.templateId);
    return (
      <>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#325FEC] dark:text-[#8DB4FF] truncate">
          <TemplateIcon blank={!t || t.id === 'blank'} size={13} className="flex-shrink-0" />
          <span className="truncate">{t?.label ?? 'Paper'}</span>
        </span>
        <span className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-[11px] text-slate-500 dark:text-zinc-500">
          <span className="inline-flex items-center gap-1 min-w-0"><FolderSimple size={12} className="flex-shrink-0" aria-hidden /><span className="truncate">{projectName(p.projectId)}</span></span>
          <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden />{ago(p.updatedAt)}</span>
        </span>
      </>
    );
  };

  // Grid: a gallery. The page is the card: a first-page thumbnail on a tinted stage that lifts on hover, with the
  // actions floating on it, and the name and details underneath. No box around the whole thing.
  const tile = (p: PaperSummary, i: number) => (
    <div key={p.id} data-testid="paper-row" className="group relative animate-cardIn" style={{ ['--i' as string]: i }}>
      <button type="button" onClick={() => open(p)} disabled={showTrash} aria-label={`Open ${p.title}`} className={`block w-full text-left ${showTrash ? 'cursor-default' : 'cursor-pointer'}`}>
        <span data-testid="paper-thumb" className={`block rounded-2xl bg-[#E1E8F4] dark:bg-[#17181D] px-6 pt-6 pb-0 h-56 overflow-hidden transition-colors ${showTrash ? 'opacity-70' : 'group-hover:bg-[#D6E0F2] dark:group-hover:bg-[#1D1F26]'}`}>
          <span className={`block transition-transform duration-200 ${showTrash ? '' : 'group-hover:-translate-y-1.5'}`}>{thumb(p, true)}</span>
        </span>
      </button>
      <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-lg bg-white/95 dark:bg-[#18181B]/95 shadow-md ring-1 ring-[#D2DCEA] dark:ring-[#27272A] px-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">{actions(p)}</div>
      <div className="mt-2.5 px-0.5 space-y-1 min-w-0">
        {renaming === p.id ? renameInput(p) : <button type="button" onClick={() => open(p)} disabled={showTrash} data-testid="paper-title" className={`block w-full text-left text-sm font-semibold text-[#0F172A] dark:text-white line-clamp-2 leading-snug ${showTrash ? 'cursor-default' : 'cursor-pointer'}`}>{p.title}</button>}
        {meta(p)}
      </div>
    </div>
  );

  // List: one compact row per paper.
  const row = (p: PaperSummary) => (
    <div key={p.id} data-testid="paper-row" className={`group relative rounded-xl border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#121214] px-4 py-3 flex items-center gap-3 ${showTrash ? '' : 'hover:border-[#325FEC]/50'} transition-colors animate-cardIn`}>
      <button type="button" onClick={() => open(p)} disabled={showTrash} aria-label={`Open ${p.title}`} className={`flex flex-1 items-center gap-3 min-w-0 text-left ${showTrash ? 'cursor-default' : 'cursor-pointer'}`}>
        <span data-testid="paper-thumb">{thumb(p, false)}</span>
        <span className="min-w-0 space-y-0.5">
          {renaming === p.id ? renameInput(p) : <span className="block text-sm font-semibold text-[#0F172A] dark:text-white truncate" data-testid="paper-title">{p.title}</span>}
          {meta(p)}
        </span>
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">{actions(p)}</div>
    </div>
  );

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-[#F2F5FA] dark:bg-[#09090B] ob-grid" data-testid="paper-workspace">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="mr-auto flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#325FEC]/10 text-[#325FEC] dark:text-[#8DB4FF] flex items-center justify-center">{showTrash ? <Trash size={20} weight="duotone" /> : <Article size={20} weight="duotone" />}</span>
            <div>
              <h1 className="text-xl font-display font-bold text-[#0F172A] dark:text-white">{showTrash ? 'Paper trash' : 'Your papers'}</h1>
              <p className="text-xs text-slate-500 dark:text-zinc-500">{showTrash ? 'Deleted papers stay here until you remove them for good.' : 'Every paper you write here. Start from a template or a blank page.'}</p>
            </div>
          </div>
          <button type="button" onClick={() => { setShowTrash((v) => !v); setQuery(''); }} data-testid="paper-trash-toggle" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-[#18181B] cursor-pointer">
            {!showTrash && <Trash size={14} />}{showTrash ? 'Back to papers' : `Trash${trash.length ? ` (${trash.length})` : ''}`}
          </button>
          {!showTrash && (
            <button type="button" onClick={() => setCreating(true)} data-testid="new-paper-button" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#325FEC] text-white hover:bg-[#2A4FCC] cursor-pointer">
              <Plus size={14} weight="bold" /> Create new paper
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <label className="relative flex-1">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search papers" aria-label="Search papers" className="w-full rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] pl-8 pr-3 py-2 text-sm text-[#0F172A] dark:text-white" />
          </label>
          <div className="inline-flex rounded-lg border border-[#D2DCEA] dark:border-[#27272A] overflow-hidden">
            <button type="button" onClick={() => setViewMode('list')} aria-label="List view" aria-pressed={view === 'list'} className={`p-2 cursor-pointer ${view === 'list' ? 'bg-[#325FEC]/10 text-[#325FEC]' : 'text-slate-500'}`}><ListBullets size={15} /></button>
            <button type="button" onClick={() => setViewMode('grid')} aria-label="Grid view" aria-pressed={view === 'grid'} className={`p-2 cursor-pointer ${view === 'grid' ? 'bg-[#325FEC]/10 text-[#325FEC]' : 'text-slate-500'}`}><SquaresFour size={15} /></button>
          </div>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
        {note && (
          <p role="status" className="mb-4 rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-3 py-2 text-xs text-slate-700 dark:text-zinc-300 flex items-center justify-between gap-3">
            {note}
            <button type="button" onClick={() => setNote('')} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Dismiss">×</button>
          </p>
        )}

        {loading ? (
          <p className="text-xs text-slate-500 py-10 text-center">Loading papers…</p>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-center py-14 text-xs text-slate-500 dark:text-zinc-400" data-testid="paper-empty">
            <FileDashed size={32} weight="duotone" className="text-[#325FEC]/70 dark:text-[#8DB4FF]/70" aria-hidden />
            {query ? 'No paper matches that search.' : showTrash ? 'The trash is empty.' : 'No papers yet. Create one to get started.'}
          </div>
        ) : (
          view === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-5 gap-y-8">
            {shown.map(tile)}
          </div>
        ) : (
          <div className="space-y-2">{shown.map(row)}</div>
        )
        )}
      </div>

      {undo && (
        <div role="status" className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div className="flex items-center gap-3 px-4 py-2 bg-[#0F172A] dark:bg-[#18181B] text-white rounded-lg shadow-lg">
            <span className="text-xs">Paper deleted</span>
            <button type="button" onClick={() => void restore(undo)} data-testid="paper-undo" className="inline-flex items-center gap-1 text-xs font-semibold text-[#518FFF] hover:text-white transition-colors cursor-pointer">
              <ArrowCounterClockwise size={12} weight="bold" /> Undo
            </button>
          </div>
        </div>
      )}

      {creating && <NewPaperFlow projects={projects} defaultProjectId={defaultProjectId} onCreate={create} onClose={() => setCreating(false)} />}
    </div>
  );
};
