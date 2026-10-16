'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  ArrowRight,
  ArrowUpRight,
  Clock,
  FileText,
  MagnifyingGlass,
  TreeStructure,
  Trash,
  ShareNetwork,
  PuzzlePiece,
} from '@phosphor-icons/react';
import { ResearchProject, ResearchAtom } from '@/lib/types/research';
import { GetExtensionModal } from './GetExtensionModal';
import { ProjectAvatar } from './ProjectAvatar';

interface DashboardHomeProps {
  projects: ResearchProject[];
  atoms: ResearchAtom[];
  onSelectProject: (projectId: string, mode?: 'feed' | 'canvas' | 'reader') => void;
  onOpenCreateModal: (parentId?: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onOpenDocuments?: () => void;
  onOpenShareModal?: (project: ResearchProject) => void;
}

// ─── Illustration: loose clips joined into one answer ────────────────
// Neutral cards, one blue accent. Colours switch with the theme through classes.
export const DashboardHeroIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    {/* links */}
    <path d="M86 58 C 112 62, 122 82, 140 98" className="stroke-[#B9C6E6] dark:stroke-white/25" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M206 54 C 184 62, 168 80, 148 98" className="stroke-[#B9C6E6] dark:stroke-white/25" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M80 152 C 106 146, 124 126, 138 108" className="stroke-[#B9C6E6] dark:stroke-white/25" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M212 148 C 190 144, 166 124, 150 108" className="stroke-[#B9C6E6] dark:stroke-white/25" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />

    {/* centre */}
    <circle cx="144" cy="102" r="22" className="fill-[#325FEC]/10 dark:fill-[#518FFF]/15" />
    <circle cx="144" cy="102" r="15" className="fill-[#325FEC]" />
    <path d="M137 103 L142 108 L152 96" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

    {/* text clip */}
    <g transform="rotate(-5 66 56)">
      <rect x="26" y="34" width="80" height="48" rx="9" className="fill-white dark:fill-[#1B2132] stroke-[#DDE3EE] dark:stroke-white/10" />
      <rect x="35" y="44" width="30" height="4.5" rx="2.25" className="fill-[#325FEC]" />
      <rect x="35" y="54" width="60" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
      <rect x="35" y="62" width="48" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
      <rect x="35" y="70" width="26" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
    </g>
    {/* image clip */}
    <g transform="rotate(4 214 52)">
      <rect x="176" y="28" width="76" height="50" rx="9" className="fill-white dark:fill-[#1B2132] stroke-[#DDE3EE] dark:stroke-white/10" />
      <rect x="184" y="36" width="60" height="26" rx="5" className="fill-[#EEF2FA] dark:fill-white/10" />
      <circle cx="197" cy="45" r="4" className="fill-[#B9C6E6] dark:fill-white/30" />
      <path d="M184 62 L204 48 L218 57 L230 50 L244 60 V62 Z" className="fill-[#C9D5F0] dark:fill-white/20" />
      <rect x="184" y="67" width="34" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
    </g>
    {/* link clip */}
    <g transform="rotate(3 64 152)">
      <rect x="22" y="130" width="82" height="46" rx="9" className="fill-white dark:fill-[#1B2132] stroke-[#DDE3EE] dark:stroke-white/10" />
      <circle cx="36" cy="144" r="6" className="fill-[#EEF2FA] dark:fill-white/10" />
      <rect x="47" y="140" width="44" height="4.5" rx="2.25" className="fill-[#94A3B8] dark:fill-white/40" />
      <rect x="32" y="156" width="62" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
      <rect x="32" y="164" width="40" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
    </g>
    {/* quote clip with citation */}
    <g transform="rotate(-3 220 150)">
      <rect x="180" y="126" width="84" height="48" rx="9" className="fill-white dark:fill-[#1B2132] stroke-[#DDE3EE] dark:stroke-white/10" />
      <rect x="189" y="136" width="14" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
      <rect x="189" y="144" width="62" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
      <rect x="189" y="152" width="50" height="3.5" rx="1.75" className="fill-[#E2E7F0] dark:fill-white/15" />
      <rect x="225" y="160" width="28" height="9" rx="4.5" className="fill-[#325FEC]" />
    </g>
  </svg>
);

// ─── Illustration: one folder style, used in empty states ───────────
export const FolderIllustration: React.FC<{ color?: string; className?: string }> = ({
  color = '#325FEC',
  className = 'w-14 h-14',
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path
      d="M8 18C8 14.6863 10.6863 12 14 12H24.5858C26.1771 12 27.7033 12.6321 28.8284 13.7574L32.2426 17.1716C33.3677 18.2967 34.8939 18.9289 36.4853 18.9289H50C53.3137 18.9289 56 21.6152 56 24.9289V46C56 49.3137 53.3137 52 50 52H14C10.6863 52 8 49.3137 8 46V18Z"
      fill={color}
      fillOpacity="0.16"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <rect x="14" y="20" width="36" height="26" rx="3" fill="#FFFFFF" stroke="#D2DCEA" strokeWidth="1.5" />
    <path d="M19 27H35" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 33H45" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M6 28C6 24.6863 8.68629 22 12 22H52C55.3137 22 58 24.6863 58 28V46C58 49.3137 55.3137 52 52 52H12C8.68629 52 6 49.3137 6 46V28Z"
      fill={color}
      fillOpacity="0.9"
    />
  </svg>
);

const DAY_MS = 24 * 60 * 60 * 1000;

type FolderFilter = 'all' | 'nested' | 'shared' | 'empty';

// Surfaces: off-white in light mode, a faint lift in dark mode. One border colour everywhere.
const SURFACE = 'bg-white/80 dark:bg-white/[0.04] border border-[#E1E6EF] dark:border-white/10';
const HAIRLINE = 'border-[#E8ECF3] dark:border-white/10';
const MUTED = 'text-slate-500 dark:text-zinc-400';
const LABEL = 'text-[10px] font-mono uppercase tracking-[0.12em] text-slate-400 dark:text-zinc-500';

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  projects,
  onSelectProject,
  onOpenCreateModal,
  onDeleteProject,
  onOpenDocuments,
  onOpenShareModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [filter, setFilter] = useState<FolderFilter>('all');

  // Partition projects into main projects and sub-projects
  const { allMainProjects, subProjectsByParent } = useMemo(() => {
    const mainList: ResearchProject[] = [];
    const subMap = new Map<string, ResearchProject[]>();

    projects.forEach((p) => {
      if (p.id === 'all') return;
      if (!p.parentId) {
        mainList.push(p);
      } else {
        const parentList = subMap.get(p.parentId) || [];
        parentList.push(p);
        subMap.set(p.parentId, parentList);
      }
    });

    return { allMainProjects: mainList, subProjectsByParent: subMap };
  }, [projects]);

  const lastTouched = (p: ResearchProject) =>
    new Date(p.lastAccessedAt || p.updatedAt || p.createdAt || 0).getTime();

  // Recent: the 3 most recently opened or updated
  const recentProjects = useMemo(() => {
    return [...projects]
      .filter((p) => p.id !== 'all')
      .sort((a, b) => lastTouched(b) - lastTouched(a))
      .slice(0, 3);
  }, [projects]);

  // The folder that holds the most recent project gets the one blue card
  const featuredFolderId = recentProjects[0]?.parentId || recentProjects[0]?.id || null;

  const folderClips = (main: ResearchProject) =>
    (main.atomCount || 0) + (subProjectsByParent.get(main.id) || []).reduce((sum, sp) => sum + (sp.atomCount || 0), 0);

  const isShared = (p: ResearchProject) => p.role === 'editor' || p.role === 'viewer';

  const stats = useMemo(() => {
    const real = projects.filter((p) => p.id !== 'all');
    return {
      folders: allMainProjects.length,
      subs: real.filter((p) => p.parentId).length,
      clips: real.reduce((sum, p) => sum + (p.atomCount || 0), 0),
      activeToday: real.filter((p) => Date.now() - lastTouched(p) < DAY_MS).length,
    };
  }, [projects, allMainProjects]);

  const filterCounts = useMemo(
    () => ({
      all: allMainProjects.length,
      nested: allMainProjects.filter((m) => (subProjectsByParent.get(m.id) || []).length > 0).length,
      shared: allMainProjects.filter(isShared).length,
      empty: allMainProjects.filter((m) => folderClips(m) === 0).length,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allMainProjects, subProjectsByParent]
  );

  const filteredMainProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMainProjects.filter((mp) => {
      const subs = subProjectsByParent.get(mp.id) || [];
      if (filter === 'nested' && subs.length === 0) return false;
      if (filter === 'shared' && !isShared(mp)) return false;
      if (filter === 'empty' && folderClips(mp) !== 0) return false;
      if (!q) return true;
      const matchSelf =
        mp.title.toLowerCase().includes(q) ||
        mp.description?.toLowerCase().includes(q) ||
        (mp.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchSubs = subs.some((sp) => sp.title.toLowerCase().includes(q) || sp.description?.toLowerCase().includes(q));
      return matchSelf || matchSubs;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMainProjects, subProjectsByParent, searchQuery, filter]);

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return 'Recently';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / DAY_MS);

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getParentTitle = (parentId?: string | null) => {
    if (!parentId) return null;
    const parent = projects.find((p) => p.id === parentId);
    return parent ? parent.title : null;
  };

  const sectionTitle = 'font-display font-bold text-[17px] tracking-tight text-[#0F172A] dark:text-white';

  // ─── Recent card: plain, equal size ───
  const renderRecent = (p: ResearchProject) => {
    const parentTitle = getParentTitle(p.parentId);
    const open = () => onSelectProject(p.id, 'feed');

    return (
      <div
        key={p.id}
        role="button"
        tabIndex={0}
        data-testid="project-card"
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        className={`group rounded-2xl p-4 cursor-pointer flex flex-col gap-3 transition-colors hover:border-[#325FEC]/50 dark:hover:border-[#518FFF]/50 ${SURFACE}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <ProjectAvatar title={p.title} folderIcon={p.folderIcon} seed={p.id} color={p.color || '#325FEC'} size={28} />
            <span className={`${LABEL} truncate`} title={parentTitle || 'Main project'}>
              {parentTitle ? `Sub-project · ${parentTitle}` : 'Main project'}
            </span>
          </div>
          <span className={`text-[10px] font-mono flex-shrink-0 ${MUTED}`}>{formatRelativeTime(p.lastAccessedAt || p.updatedAt)}</span>
        </div>

        <div className="space-y-1 min-h-[3.75rem]">
          <h3 title={p.title} className="font-display font-semibold text-[15px] leading-snug tracking-tight text-[#0F172A] dark:text-white line-clamp-1">
            {p.title}
          </h3>
          <p title={p.description || ''} className={`text-xs leading-relaxed line-clamp-2 ${MUTED}`}>
            {p.description || 'No description provided.'}
          </p>
        </div>

        <div className={`flex items-center justify-between pt-3 border-t ${HAIRLINE}`}>
          <span className={`text-[11px] font-mono ${MUTED}`}>{p.atomCount || 0} clips</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#325FEC] dark:text-[#8DB4FF]">
            <span>Resume</span>
            <ArrowRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    );
  };

  // ─── Folder card: a folder with paper peeking out, content on the front panel ───
  const renderFolderCard = (mainProj: ResearchProject) => {
    const subProjects = subProjectsByParent.get(mainProj.id) || [];
    const total = folderClips(mainProj);
    const canManage = !isShared(mainProj);
    const featured = mainProj.id === featuredFolderId;

    const back = featured ? 'bg-[#5B8DF0]' : 'bg-[#E3E7EF] dark:bg-[#232A3B]';
    const paper1 = featured ? 'bg-white/90' : 'bg-white dark:bg-[#2E364B]';
    const paper2 = featured ? 'bg-[#E4EDFF]' : 'bg-[#F5F7FA] dark:bg-[#353E55]';
    const front = featured
      ? 'bg-gradient-to-b from-[#7FA6F6] to-[#518FFF] border-white/30 text-white'
      : 'bg-gradient-to-b from-white to-[#EFF1F6] dark:from-[#1D2333] dark:to-[#161B29] border-[#E1E6EF] dark:border-white/10 text-[#0F172A] dark:text-white';
    const sub = featured ? 'text-white/80' : MUTED;
    const iconBtn = featured
      ? 'text-white/80 hover:text-white hover:bg-white/15'
      : 'text-slate-400 hover:text-[#325FEC] hover:bg-[#325FEC]/10 dark:hover:text-[#8DB4FF]';

    return (
      <div key={mainProj.id} className="group relative pt-14">
        {/* The folder behind: tab, back, two sheets of paper */}
        <div className="absolute inset-x-0 top-0 h-24 pointer-events-none">
          <div className={`absolute left-0 top-0 h-9 w-28 rounded-t-2xl ${back}`} />
          <div className={`absolute inset-x-0 top-5 bottom-0 rounded-t-3xl ${back}`} />
          <div className={`absolute inset-x-5 top-8 bottom-0 rounded-t-2xl -rotate-[1.2deg] origin-bottom-left shadow-sm ${paper1}`} />
          <div className={`absolute inset-x-4 top-10 bottom-0 rounded-t-2xl shadow-sm ${paper2}`} />
        </div>

        <div className={`relative rounded-3xl border p-4 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.25)] transition-transform group-hover:-translate-y-0.5 ${front}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <h3
                onClick={() => onSelectProject(mainProj.id, 'feed')}
                title={mainProj.title}
                className="font-display font-semibold text-[15px] leading-snug tracking-tight cursor-pointer line-clamp-2"
              >
                {mainProj.title}
              </h3>
              <p className={`text-xs ${sub}`}>
                {subProjects.length} sub-projects <span className="opacity-50">·</span> {total} clips
              </p>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1 -mt-1">
              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenShareModal(mainProj);
                  }}
                  className={`inline-flex items-center p-1.5 rounded-lg transition-colors cursor-pointer ${iconBtn}`}
                  title={`Share ${mainProj.title}`}
                >
                  <ShareNetwork size={14} />
                  {mainProj.pendingRequests ? (
                    <span
                      className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-[#325FEC] text-white text-[10px] leading-4 text-center"
                      title="People waiting for access"
                    >
                      {mainProj.pendingRequests}
                    </span>
                  ) : null}
                </button>
              )}
              {onDeleteProject && canManage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(mainProj.id);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${featured ? iconBtn : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'}`}
                  title={`Delete ${mainProj.title}`}
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Sub-projects */}
          <div className="mt-3 space-y-1">
            {subProjects.length === 0 ? (
              <p className={`py-2 text-xs ${sub}`}>No sub-projects yet</p>
            ) : (
              <div className="max-h-[7.25rem] overflow-y-auto space-y-1 pr-0.5">
                {subProjects.map((sp) => (
                  <div
                    key={sp.id}
                    data-testid="subproject-card"
                    onClick={() => onSelectProject(sp.id, 'feed')}
                    title={sp.title}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer transition-colors ${
                      featured ? 'hover:bg-white/15' : 'hover:bg-[#325FEC]/[0.06] dark:hover:bg-white/[0.06]'
                    }`}
                  >
                    <ProjectAvatar title={sp.title} folderIcon={sp.folderIcon} seed={sp.id} color={sp.color || '#325FEC'} size={20} />
                    <span className="text-xs font-medium truncate flex-1">{sp.title}</span>
                    <span className={`text-[10px] font-mono flex-shrink-0 ${sub}`}>{sp.atomCount || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`mt-3 pt-3 flex items-center justify-between gap-2 border-t ${featured ? 'border-white/25' : HAIRLINE}`}>
            {canManage ? (
              <button
                onClick={() => onOpenCreateModal(mainProj.id)}
                className={`cta-soft ${featured ? '!text-white/90 hover:!bg-white/15 hover:!text-white' : ''}`}
                title="Add a sub-project"
              >
                <Plus size={13} weight="bold" />
                <span>Sub-Project</span>
              </button>
            ) : (
              <span className={`text-[11px] ${sub}`}>{mainProj.role === 'viewer' ? 'Can view' : 'Can edit'}</span>
            )}

            <button
              onClick={() => onSelectProject(mainProj.id, 'feed')}
              className={
                featured
                  ? 'inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white text-[#325FEC] text-xs font-semibold shadow-sm hover:bg-[#F2F6FF] transition-colors cursor-pointer'
                  : 'cta-primary !h-8 !text-xs'
              }
            >
              <span>Open Folder</span>
              <span className="cta-icon">
                <ArrowRight size={12} weight="bold" />
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const filterChips: { id: FolderFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'nested', label: 'With sub-projects' },
    { id: 'shared', label: 'Shared' },
    { id: 'empty', label: 'Empty' },
  ];

  const statCells: { label: string; value: number }[] = [
    { label: 'Folders', value: stats.folders },
    { label: 'Sub-projects', value: stats.subs },
    { label: 'Clips', value: stats.clips },
    { label: 'Active today', value: stats.activeToday },
  ];

  return (
    <div className="flex-1 overflow-y-auto text-[#0F172A] dark:text-[#FAFAFA] transition-colors p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top bar: lines up with the logo in the sidebar */}
        <div className="flex items-center justify-between h-8 -mt-1">
          <div className={`${LABEL} hidden sm:block`}>Home</div>
          <button
            type="button"
            onClick={() => setExtensionOpen(true)}
            title="Download the Chrome extension"
            aria-label="Download the Chrome extension"
            data-testid="get-extension-button"
            className="group inline-flex items-center gap-2 h-8 pl-3 pr-3 rounded-xl text-xs font-sans font-semibold bg-white dark:bg-white/[0.06] hover:border-[#9FB4E8] text-slate-700 dark:text-zinc-100 border border-[#D9DFEA] dark:border-white/15 shadow-sm transition-colors cursor-pointer"
          >
            <PuzzlePiece size={14} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" />
            <span>Download extension</span>
            <ArrowUpRight size={11} weight="bold" className="text-slate-400" />
          </button>
        </div>
        <GetExtensionModal isOpen={extensionOpen} onClose={() => setExtensionOpen(false)} />

        {/* ─── Intro: welcome, two actions, four numbers ─── */}
        <section className={`rounded-3xl overflow-hidden ${SURFACE}`}>
          <div className="grid md:grid-cols-[1fr_300px] gap-6 items-center p-7 md:p-9">
            <div className="space-y-5">
              <div className="space-y-2">
                <div className={LABEL}>Research workspace hub</div>
                <h1 className="font-display font-bold text-[28px] md:text-[32px] leading-[1.15] tracking-tight">
                  Welcome back to your Knowledge Engine
                </h1>
                <p className={`text-sm leading-relaxed max-w-lg ${MUTED}`}>
                  Organize your research in hierarchical project folders, capture evidence clips across the web, and synthesize multi-document findings.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button onClick={() => onOpenCreateModal()} className="cta-primary">
                  <Plus size={14} weight="bold" />
                  <span>New Project Folder</span>
                </button>
                {onOpenDocuments && (
                  <button type="button" onClick={onOpenDocuments} className="cta-glass">
                    <span className="cta-icon">
                      <FileText size={14} weight="bold" />
                    </span>
                    <span>Document Library</span>
                  </button>
                )}
              </div>
            </div>

            <div className="hidden md:block h-44">
              <DashboardHeroIllustration />
            </div>
          </div>

          <div className={`grid grid-cols-2 md:grid-cols-4 border-t ${HAIRLINE}`}>
            {statCells.map((c, i) => (
              <div
                key={c.label}
                className={`px-7 py-4 ${i > 0 ? `md:border-l ${HAIRLINE}` : ''} ${i % 2 === 1 ? `border-l ${HAIRLINE}` : ''} ${i > 1 ? `border-t md:border-t-0 ${HAIRLINE}` : ''}`}
              >
                <div className="font-display font-semibold text-2xl tracking-tight leading-none">{c.value}</div>
                <div className={`${LABEL} mt-1.5`}>{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Recent ─── */}
        {recentProjects.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock size={17} weight="bold" className="text-slate-400 dark:text-zinc-500" />
                <h2 className={sectionTitle}>Recent</h2>
              </div>
              <span className={`text-[11px] font-mono ${MUTED}`}>{recentProjects.length} active workspaces</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{recentProjects.map((p) => renderRecent(p))}</div>
          </section>
        )}

        {/* ─── Project Folders ─── */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TreeStructure size={17} weight="bold" className="text-slate-400 dark:text-zinc-500" />
              <h2 className={sectionTitle}>Project Folders</h2>
            </div>

            <div className="relative w-full md:w-72">
              <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter folders and sub-projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 bg-white dark:bg-white/[0.05] border border-[#D9DFEA] dark:border-white/10 focus:border-[#325FEC] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {filterChips.map((c) => {
              const active = filter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilter(c.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0F172A] text-white border-[#0F172A] dark:bg-white dark:text-[#0F172A] dark:border-white'
                      : 'bg-white/70 dark:bg-white/[0.04] text-slate-600 dark:text-zinc-300 border-[#D9DFEA] dark:border-white/10 hover:border-[#9FB4E8]'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className={`font-mono text-[10px] ${active ? 'opacity-70' : 'text-slate-400 dark:text-zinc-500'}`}>{filterCounts[c.id]}</span>
                </button>
              );
            })}
          </div>

          {filteredMainProjects.length === 0 ? (
            <div className={`rounded-3xl py-12 px-6 text-center space-y-3 ${SURFACE} !border-dashed`}>
              <div className="mx-auto w-14 h-14">
                <FolderIllustration className="w-14 h-14" />
              </div>
              <div className="font-display font-semibold text-sm">
                {allMainProjects.length === 0 ? 'No project folders yet' : 'No folders match this filter'}
              </div>
              <p className={`text-xs ${MUTED}`}>
                {allMainProjects.length === 0
                  ? 'Create your first folder, then clip into it from any page.'
                  : 'Clear the search or pick another filter.'}
              </p>
              {allMainProjects.length === 0 && (
                <button onClick={() => onOpenCreateModal()} className="cta-primary mx-auto">
                  <Plus size={14} weight="bold" />
                  <span>New Project Folder</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-4 items-start">
              {filteredMainProjects.map((m) => renderFolderCard(m))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
