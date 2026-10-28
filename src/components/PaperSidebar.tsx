'use client';

import React, { useMemo, useState } from 'react';
import { MagnifyingGlass, Plus, TextAlignLeft, Image as ImageIcon, Quotes, FolderSimple, CheckCircle, Stack, X, Globe } from '@phosphor-icons/react';
import type { ResearchAtom, ResearchProject } from '@/lib/types/research';
import type { ClipInfo } from '@/lib/paper/preview';
import { EVIDENCE_LABEL } from '@/lib/atoms/evidence';
import { clipPreview } from '@/lib/paper/clipInfo';
import { CLIP_MIME, CITE_MIME } from '@/lib/paper/dnd';

// The content sidebar (design note section 4): what the paper's data-source project holds, to assemble the paper
// from. Drag a row onto the page, or press Insert. Text and Images place the clip itself; Citations place only a
// citation (the in-text marker). A row already used shows "In the text".

type Tab = 'text' | 'images' | 'cites';
const MAX_ROWS = 200;

interface Props {
  /** Hides the sidebar; the editor shows a strip to bring it back. */
  onClose: () => void;
  atoms: ResearchAtom[];
  infos: Map<string, ClipInfo>;
  /** Clip ids already in the body or cited in it. */
  used: Set<string>;
  /** Clip ids on the References list without being cited. */
  listed: string[];
  onList: (clipIds: string[]) => void;
  projects: ResearchProject[];
  projectId: string | null;
  loading: boolean;
  error: string;
  onProjectChange: (id: string | null) => void;
  onInsert: (clipId: string, mode: 'clip' | 'cite') => void;
}

// The tag is only a word, in colour, above the text. "Main" is the researcher's own text (the clip kind "mine").
const KIND_TONE: Record<string, string> = {
  quote: 'text-blue-700 dark:text-blue-300',
  'ai-summary': 'text-amber-700 dark:text-amber-300',
  mine: 'text-purple-700 dark:text-purple-300',
};
const KIND_WORD: Record<string, string> = { quote: 'Quote', 'ai-summary': 'AI summary', mine: 'Main' };

// Each tab says what its search looks at. Images have no tags yet, so that search reads the caption and title.
// The Images tab has no search: clips have no tags yet, so the owner scrolls the list instead.
const PLACEHOLDER: Record<Tab, string> = { text: 'Search by text or quote', images: '', cites: 'Search by citation' };

/** A citation is verified when it has a DOI (the lookup that checked it); otherwise a clip with a web address is a web source. */
const isVerified = (info: ClipInfo) => Boolean(info.record?.doi);
const isWeb = (atom: ResearchAtom, info: ClipInfo) => !info.record?.doi && Boolean(atom.metadata?.sourceUrl);

/** Badge text from the retraction check. Only a checked paper with no notice reads "No updates on record". */
const STATUS_LABEL: Record<string, string> = {
  retracted: 'Retracted',
  removed: 'Removed',
  concern: 'Expression of concern',
  corrected: 'Corrected',
  notice: 'Notice, not the paper',
  none_found: 'No updates on record',
};
const statusLabel = (info: ClipInfo): string | null => (info.retractionState ? STATUS_LABEL[info.retractionState] ?? null : null);

const sourceLabel = (info: ClipInfo): string => {
  const r = info.record;
  if (!r) return '';
  const who = r.authors[0]?.family ?? r.publisher ?? 'Anon.';
  return `${who}${r.authors.length > 1 ? ' et al.' : ''}${r.year ? ` (${r.year})` : ''}`;
};

export const PaperSidebar: React.FC<Props> = ({ atoms, infos, used, listed, onList, projects, projectId, loading, error, onProjectChange, onInsert, onClose }) => {
  const [tab, setTab] = useState<Tab>('text');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (a: ResearchAtom, info: ClipInfo) => !q || `${a.title} ${info.text} ${info.record?.title ?? ''} ${info.record?.authors.map((x) => x.family).join(' ') ?? ''}`.toLowerCase().includes(q);
    const text: Array<{ atom: ResearchAtom; info: ClipInfo }> = [];
    const images: Array<{ atom: ResearchAtom; info: ClipInfo }> = [];
    const sources = new Map<string, { atom: ResearchAtom; info: ClipInfo }>();
    for (const atom of atoms) {
      const info = infos.get(atom.id);
      if (!info || !matches(atom, info)) continue;
      (info.media ? images : text).push({ atom, info });
      if (info.record && info.kind === 'quote') {
        const key = info.record.doi || `${info.record.title}|${info.record.year}`;
        if (!sources.has(key)) sources.set(key, { atom, info });
      }
    }
    return { text, images, cites: [...sources.values()] };
  }, [atoms, infos, query]);

  const verifiedPending = rows.cites.filter(({ atom, info }) => isVerified(info) && !used.has(atom.id) && !listed.includes(atom.id)).map(({ atom }) => atom.id);
  const list = tab === 'text' ? rows.text : tab === 'images' ? rows.images : rows.cites;
  const mode = tab === 'cites' ? 'cite' : 'clip';
  const TABS: Array<{ id: Tab; label: string; icon: React.ElementType; count: number }> = [
    { id: 'text', label: 'Text', icon: TextAlignLeft, count: rows.text.length },
    { id: 'images', label: 'Images', icon: ImageIcon, count: rows.images.length },
    { id: 'cites', label: 'Citations', icon: Quotes, count: rows.cites.length },
  ];

  return (
    <aside className="w-[19rem] max-w-full flex-shrink-0 flex flex-col min-h-0 border-r border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214]" data-testid="paper-sidebar" aria-label="Clips">
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-[#D2DCEA] dark:border-[#27272A]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A] dark:text-white"><Stack size={14} /> Clips</span>
          <button type="button" onClick={onClose} aria-label="Hide clips" data-testid="sidebar-close" className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"><X size={14} /></button>
        </div>
        <label className="block">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-zinc-400"><FolderSimple size={12} weight="bold" /> Clips from</span>
          <select
            value={projectId ?? ''}
            onChange={(e) => onProjectChange(e.target.value || null)}
            data-testid="sidebar-project"
            className="mt-1 w-full rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2 py-1.5 text-xs text-[#0F172A] dark:text-white"
          >
            <option value="">No project</option>
            {projectId && !projects.some((p) => p.id === projectId) && <option value={projectId}>A project you no longer see</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.parentId ? '  ↳ ' : ''}{p.title}</option>
            ))}
          </select>
        </label>
        {tab !== 'images' && (
        <label className="relative block">
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={PLACEHOLDER[tab]} aria-label="Search clips" className="w-full rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] pl-7 pr-2 py-1.5 text-xs text-[#0F172A] dark:text-white" />
        </label>
        )}
        <div className="flex gap-1" role="tablist">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-testid={`sidebar-tab-${id}`}
              onClick={() => setTab(id)}
              className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold cursor-pointer ${tab === id ? 'bg-[#325FEC]/12 text-[#325FEC] dark:text-[#8DB4FF]' : 'text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              <Icon size={13} weight="bold" /> {label} <span className="font-normal opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5" data-testid="sidebar-list">
        {!projectId && <p className="px-2 py-6 text-center text-xs text-slate-500">Pick a project above to see its clips.</p>}
        {projectId && tab === 'cites' && verifiedPending.length > 0 && (
          <button type="button" onClick={() => onList(verifiedPending)} data-testid="sidebar-add-verified" className="w-full rounded-lg border border-emerald-600/40 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600/10 cursor-pointer">
            Add all verified to References ({verifiedPending.length})
          </button>
        )}
        {projectId && loading && <p className="px-2 py-6 text-center text-xs text-slate-500" aria-busy="true">Loading clips…</p>}
        {projectId && !loading && error && <p role="alert" className="px-2 py-4 text-xs text-red-600">{error}</p>}
        {projectId && !loading && !error && list.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            {query ? 'Nothing matches that search.' : tab === 'text' ? 'No text clips in this project yet.' : tab === 'images' ? 'No images or tables clipped yet.' : 'No clip in this project carries a citation yet.'}
          </p>
        )}
        {list.slice(0, MAX_ROWS).map(({ atom, info }) => {
          const inText = used.has(atom.id);
          return (
            <div
              key={`${tab}-${atom.id}`}
              data-testid="sidebar-row"
              data-clip-id={atom.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(mode === 'cite' ? CITE_MIME : CLIP_MIME, atom.id);
                e.dataTransfer.setData('text/plain', info.text.slice(0, 500)); // some browsers need data to start a drag
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className="group relative rounded-lg border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2.5 py-2 pr-9 text-[12px] leading-snug cursor-grab active:cursor-grabbing hover:border-[#325FEC]/50"
            >
              <button
                type="button"
                onClick={() => (tab === 'cites' && !inText && !listed.includes(atom.id) ? onList([atom.id]) : onInsert(atom.id, mode))}
                aria-label={tab === 'cites' ? (inText || listed.includes(atom.id) ? 'Insert citation' : 'Add to References') : 'Insert into the paper'}
                title={tab === 'cites' ? (inText || listed.includes(atom.id) ? 'Insert citation at the cursor' : 'Add to References first') : 'Insert at the cursor'}
                data-testid="sidebar-insert"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[#D9E1EC] dark:border-[#27272A] bg-white dark:bg-[#27272A] text-[#325FEC] dark:text-[#8DB4FF] opacity-0 shadow-sm transition-opacity hover:bg-[#325FEC]/10 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
              >
                <Plus size={12} weight="bold" />
              </button>
              <div className="flex items-start gap-2">
                {tab === 'cites' ? (
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[7.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-500">Citation</span>
                    <span className="flex items-center gap-1 font-semibold text-[#0F172A] dark:text-white">
                      {sourceLabel(info)}
                      {isVerified(info) && statusLabel(info) && <span data-testid="sidebar-status-badge" className={`rounded px-1 text-[9px] font-semibold ${statusLabel(info) === 'No updates on record' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{statusLabel(info)}</span>}
                      {isWeb(atom, info) && <Globe size={12} className="text-slate-500" aria-label="Web source" />}
                    </span>
                    <span className="block text-slate-600 dark:text-zinc-400 line-clamp-2">{info.record?.title}</span>
                  </span>
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className={`block font-mono text-[7.5px] font-semibold uppercase tracking-wide ${tab === 'images' ? 'text-slate-500 dark:text-zinc-500' : KIND_TONE[info.kind]}`}>
                      {tab === 'images' ? (info.media?.kind === 'table' ? 'Table' : 'Image') : KIND_WORD[info.kind]}
                    </span>
                    <span className="block">
                      {info.media?.kind === 'image' && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={info.media.src} alt={info.media.caption || 'Clipped image'} className="mb-1 max-h-24 w-full rounded object-cover" />
                      )}
                      <span className="block break-words text-[#0F172A] dark:text-zinc-200 line-clamp-4">
                        {info.media?.kind === 'table' ? `Table: ${info.media.caption || clipPreview(atom, 60)}` : info.media?.kind === 'image' ? info.media.caption || 'Image' : clipPreview(atom)}
                      </span>
                      {info.record && <span className="block mt-0.5 text-[11px] text-slate-500 dark:text-zinc-500">{sourceLabel(info)}{info.page ? `, p. ${info.page}` : ''}</span>}
                    </span>
                  </span>
                )}
              </div>
              {inText && (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle size={11} weight="bold" /> In the text
                </span>
              )}
            </div>
          );
        })}
        {list.length > MAX_ROWS && <p className="px-2 py-2 text-center text-[11px] text-slate-500">Showing the first {MAX_ROWS}. Search to narrow the list.</p>}
      </div>
    </aside>
  );
};
