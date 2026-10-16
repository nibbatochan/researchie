'use client';

import React, { useState, useMemo } from 'react';
import {
  FolderSimple,
  FolderOpen,
  Plus,
  ArrowRight,
  Clock,
  Graph,
  FileText,
  MagnifyingGlass,
  Bookmarks,
  CaretRight,
  TreeStructure,
  Trash,
  ShareNetwork,
  PuzzlePiece
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
export const DashboardHeroIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  const card = 'fill-white dark:fill-[#1B2132] stroke-[#DDE3EE] dark:stroke-white/10';
  const line = 'fill-[#E2E7F0] dark:fill-white/15';
  const link = 'stroke-[#B9C6E6] dark:stroke-white/25';
  const halo = 'fill-[#325FEC]/10 dark:fill-[#518FFF]/15';
  const soft = 'fill-[#EEF2FA] dark:fill-white/10';
  const dot = 'fill-[#B9C6E6] dark:fill-white/30';
  const hill = 'fill-[#C9D5F0] dark:fill-white/20';
  const pill = 'fill-[#94A3B8] dark:fill-white/40';
  return (
  <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    {/* links */}
    <path d="M86 58 C 112 62, 122 82, 140 98" className={link} strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M206 54 C 184 62, 168 80, 148 98" className={link} strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M80 152 C 106 146, 124 126, 138 108" className={link} strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M212 148 C 190 144, 166 124, 150 108" className={link} strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />

    {/* centre */}
    <circle cx="144" cy="102" r="22" className={halo} />
    <circle cx="144" cy="102" r="15" className="fill-[#325FEC]" />
    <path d="M137 103 L142 108 L152 96" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

    {/* text clip */}
    <g transform="rotate(-5 66 56)">
      <rect x="26" y="34" width="80" height="48" rx="9" className={card} />
      <rect x="35" y="44" width="30" height="4.5" rx="2.25" className="fill-[#325FEC]" />
      <rect x="35" y="54" width="60" height="3.5" rx="1.75" className={line} />
      <rect x="35" y="62" width="48" height="3.5" rx="1.75" className={line} />
      <rect x="35" y="70" width="26" height="3.5" rx="1.75" className={line} />
    </g>
    {/* image clip */}
    <g transform="rotate(4 214 52)">
      <rect x="176" y="28" width="76" height="50" rx="9" className={card} />
      <rect x="184" y="36" width="60" height="26" rx="5" className={soft} />
      <circle cx="197" cy="45" r="4" className={dot} />
      <path d="M184 62 L204 48 L218 57 L230 50 L244 60 V62 Z" className={hill} />
      <rect x="184" y="67" width="34" height="3.5" rx="1.75" className={line} />
    </g>
    {/* link clip */}
    <g transform="rotate(3 64 152)">
      <rect x="22" y="130" width="82" height="46" rx="9" className={card} />
      <circle cx="36" cy="144" r="6" className={soft} />
      <rect x="47" y="140" width="44" height="4.5" rx="2.25" className={pill} />
      <rect x="32" y="156" width="62" height="3.5" rx="1.75" className={line} />
      <rect x="32" y="164" width="40" height="3.5" rx="1.75" className={line} />
    </g>
    {/* quote clip with citation */}
    <g transform="rotate(-3 220 150)">
      <rect x="180" y="126" width="84" height="48" rx="9" className={card} />
      <rect x="189" y="136" width="14" height="3.5" rx="1.75" className={line} />
      <rect x="189" y="144" width="62" height="3.5" rx="1.75" className={line} />
      <rect x="189" y="152" width="50" height="3.5" rx="1.75" className={line} />
      <rect x="225" y="160" width="28" height="9" rx="4.5" className="fill-[#325FEC]" />
    </g>
  </svg>
  );
};

// ─── Custom Styled Vector Folder Illustration in Design System ───────
export const FolderIllustration: React.FC<{ color?: string; className?: string }> = ({ 
  color = '#325FEC', 
  className = 'w-14 h-14' 
}) => (
  <svg 
    viewBox="0 0 64 64" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-hidden="true"
  >
    {/* Folder Back Tab */}
    <path 
      d="M8 18C8 14.6863 10.6863 12 14 12H24.5858C26.1771 12 27.7033 12.6321 28.8284 13.7574L32.2426 17.1716C33.3677 18.2967 34.8939 18.9289 36.4853 18.9289H50C53.3137 18.9289 56 21.6152 56 24.9289V46C56 49.3137 53.3137 52 50 52H14C10.6863 52 8 49.3137 8 46V18Z" 
      fill={color} 
      fillOpacity="0.12" 
      stroke={color} 
      strokeWidth="2.2" 
      strokeLinejoin="round" 
    />
    {/* Inner Paper Sheet */}
    <rect 
      x="14" 
      y="20" 
      width="36" 
      height="26" 
      rx="3" 
      fill="#FAFBFD" 
      className="dark:fill-[#18181B]" 
      stroke="#D2DCEA" 
      strokeWidth="1.5" 
    />
    {/* Paper Text Lines */}
    <path d="M19 27H35" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 33H45" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 39H31" stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Front Folder Lip */}
    <path 
      d="M6 28C6 24.6863 8.68629 22 12 22H52C55.3137 22 58 24.6863 58 28V46C58 49.3137 55.3137 52 52 52H12C8.68629 52 6 49.3137 6 46V28Z" 
      fill="#FAFBFD" 
      className="dark:fill-[#121214]" 
      stroke={color} 
      strokeWidth="2.2" 
      strokeLinejoin="round" 
    />
  </svg>
);

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  projects,
  atoms,
  onSelectProject,
  onOpenCreateModal,
  onDeleteProject,
  onOpenDocuments,
  onOpenShareModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [extensionOpen, setExtensionOpen] = useState(false);

  // Partition projects into Main Projects and Sub-Projects
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

    return {
      allMainProjects: mainList,
      subProjectsByParent: subMap,
    };
  }, [projects]);

  // Recently Accessed Projects (Top 3 most recently accessed/updated)
  const recentProjects = useMemo(() => {
    return [...projects]
      .filter((p) => p.id !== 'all')
      .sort((a, b) => {
        const timeA = new Date(a.lastAccessedAt || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.lastAccessedAt || b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 3);
  }, [projects]);

  // Filtered Main Projects for Search
  const filteredMainProjects = useMemo(() => {
    if (!searchQuery.trim()) return allMainProjects;
    const q = searchQuery.toLowerCase();
    return allMainProjects.filter((mp) => {
      const matchSelf = mp.title.toLowerCase().includes(q) || 
        mp.description?.toLowerCase().includes(q) || 
        (mp.tags || []).some((t) => t.toLowerCase().includes(q));
      const subs = subProjectsByParent.get(mp.id) || [];
      const matchSubs = subs.some(
        (sp) => sp.title.toLowerCase().includes(q) || sp.description?.toLowerCase().includes(q)
      );
      return matchSelf || matchSubs;
    });
  }, [allMainProjects, subProjectsByParent, searchQuery]);

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return 'Recently';
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // Find parent project name for breadcrumb
  const getParentTitle = (parentId?: string | null) => {
    if (!parentId) return null;
    const parent = projects.find((p) => p.id === parentId);
    return parent ? parent.title : null;
  };

  const isShared = (p: ResearchProject) => p.role === 'editor' || p.role === 'viewer';

  const folderClips = (main: ResearchProject) =>
    (main.atomCount || 0) + (subProjectsByParent.get(main.id) || []).reduce((sum, sp) => sum + (sp.atomCount || 0), 0);

  const HAIRLINE = 'border-[#E8ECF3] dark:border-white/10';
  const MUTED = 'text-slate-500 dark:text-zinc-400';

  // ─── Folder card: the same card for every folder; the papers show how full it is ───
  const renderFolderCard = (mainProj: ResearchProject) => {
    const subProjects = subProjectsByParent.get(mainProj.id) || [];
    const total = folderClips(mainProj);
    const canManage = !isShared(mainProj);
    // No clips: an empty folder. Then 1, 2 and 3 papers as it fills up.
    const papers = total === 0 ? 0 : total < 10 ? 1 : total < 50 ? 2 : 3;
    const iconBtn = 'text-slate-400 hover:text-[#325FEC] hover:bg-[#325FEC]/10 dark:hover:text-[#8DB4FF]';

    return (
      <div key={mainProj.id} className="group relative pt-20">
        {/* The folder behind: a blue tab and back, and a sheet of paper for each step of content */}
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none">
          <div className="absolute left-0 top-0 h-8 w-28 rounded-t-2xl bg-[#3E6DF2]" />
          <div className="absolute inset-x-0 top-3 bottom-0 rounded-t-3xl bg-gradient-to-b from-[#4C7BFA] to-[#325FEC] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" />
          {papers >= 3 && (
            <div className="absolute inset-x-8 top-7 bottom-0 rounded-t-xl rotate-[1.6deg] origin-bottom-right bg-[#E4E9F3] shadow-sm" />
          )}
          {papers >= 2 && (
            <div className="absolute inset-x-6 top-9 bottom-0 rounded-t-xl -rotate-[1.2deg] origin-bottom-left bg-white shadow-sm" />
          )}
          {papers >= 1 && (
            <div className="absolute inset-x-4 top-11 bottom-0 rounded-t-xl bg-[#F4F6FA] shadow-sm">
              <div className="mx-4 mt-3 space-y-1.5">
                <div className="h-1 w-1/4 rounded bg-[#325FEC]/60" />
                <div className="h-1 w-3/5 rounded bg-[#CBD3E3]" />
              </div>
            </div>
          )}
        </div>

        <div className="dark relative rounded-3xl border p-4 shadow-[0_16px_32px_-18px_rgba(0,0,0,0.7)] transition-transform group-hover:-translate-y-0.5 bg-gradient-to-b from-[#24418F] to-[#182E6E] border-white/15 text-white">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <h3
                onClick={() => onSelectProject(mainProj.id, 'feed')}
                title={mainProj.title}
                className="font-display font-semibold text-[15px] leading-snug tracking-tight cursor-pointer line-clamp-2"
              >
                {mainProj.title}
              </h3>
              <p className={`text-xs ${MUTED}`}>
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
                  className="p-1.5 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-red-500 hover:bg-red-500/10"
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
              <p className={`py-2 text-xs ${MUTED}`}>No sub-projects yet</p>
            ) : (
              <div className="max-h-[7.25rem] overflow-y-auto space-y-1 pr-0.5">
                {subProjects.map((sp) => (
                  <div
                    key={sp.id}
                    data-testid="subproject-card"
                    onClick={() => onSelectProject(sp.id, 'feed')}
                    title={sp.title}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer transition-colors hover:bg-[#325FEC]/[0.06] dark:hover:bg-white/[0.06]"
                  >
                    <ProjectAvatar title={sp.title} folderIcon={sp.folderIcon} seed={sp.id} color="#DCE6FF" size={20} className="!bg-white/10 !border-white/20" />
                    <span className="text-xs font-medium truncate flex-1">{sp.title}</span>
                    <span className={`text-[10px] font-mono flex-shrink-0 ${MUTED}`}>{sp.atomCount || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`mt-3 pt-3 flex items-center justify-between gap-2 border-t ${HAIRLINE}`}>
            {canManage ? (
              <button
                onClick={() => onOpenCreateModal(mainProj.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans font-medium border transition-colors cursor-pointer bg-white/10 hover:bg-white/15 text-blue-50 border-white/15"
                title="Add a sub-project"
              >
                <Plus size={13} weight="bold" />
                <span>Sub-Project</span>
              </button>
            ) : (
              <span className={`text-[11px] ${MUTED}`}>{mainProj.role === 'viewer' ? 'Can view' : 'Can edit'}</span>
            )}

            <button
              onClick={() => onSelectProject(mainProj.id, 'feed')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans font-semibold bg-[#325FEC] hover:bg-[#274AC4] text-white shadow-xs transition-colors cursor-pointer"
            >
              <span>Open Folder</span>
              <ArrowRight size={12} weight="bold" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto text-[#0F172A] dark:text-[#FAFAFA] transition-colors p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with Download Extension */}
        <div className="flex items-center justify-end h-8 -mx-4 -mt-4 px-4 mb-4">
          <button
            type="button"
            onClick={() => setExtensionOpen(true)}
            title="Download the Chrome extension"
            aria-label="Download the Chrome extension"
            data-testid="get-extension-button"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-sans font-semibold rounded-xl bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] border border-[#D2DCEA] dark:border-[#27272A] shadow-xs transition-all cursor-pointer"
          >
            <PuzzlePiece size={15} weight="bold" />
            <span>Download extension</span>
          </button>
        </div>
        <GetExtensionModal isOpen={extensionOpen} onClose={() => setExtensionOpen(false)} />

        {/* ─── TOP HERO: UNBOXED, LEFT-ALIGNED (120px Top Padding) ── */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 pt-[20px] pb-1">
          {/* Illustration First */}
          <div className="flex-shrink-0 flex items-center justify-start">
            <DashboardHeroIllustration className="w-48 h-36 md:w-80 md:h-56" />
          </div>

          {/* Hero Content Next */}
          <div className="space-y-3 max-w-2xl flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#325FEC] dark:text-[#518FFF] font-semibold">
                Research Workspace Hub
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-display font-bold text-[#0F172A] dark:text-white tracking-tight">
              Welcome back to your Knowledge Engine
            </h1>
            <p className="text-sm md:text-base text-slate-500 dark:text-zinc-400 leading-relaxed">
              Organize your research in hierarchical project folders, capture evidence clips across the web, and synthesize multi-document findings.
            </p>

            <div className="pt-1.5 flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onOpenCreateModal()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-sans font-semibold bg-[#325FEC] hover:bg-[#274AC4] text-white shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>New Project Folder</span>
              </button>

              {onOpenDocuments && (
                <button
                  type="button"
                  onClick={onOpenDocuments}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-sans font-semibold bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] text-slate-700 dark:text-zinc-200 border border-[#D2DCEA] dark:border-[#27272A] shadow-xs transition-all cursor-pointer"
                >
                  <FileText size={14} weight="bold" className="text-[#325FEC] dark:text-[#518FFF]" />
                  <span>Document Library</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── QUICK RESUME: RECENTLY ACCESSED WORKSPACES ──────────── */}
        {recentProjects.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
                <h2 className="text-sm md:text-base font-display font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
                  Recent
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                {recentProjects.length} active workspaces
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {recentProjects.map((p) => {
                const parentTitle = getParentTitle(p.parentId);
                const projAtoms = atoms.filter((a) => a.projectId === p.id);
                return (
                  <div
                    key={p.id}
                    data-testid="project-card"
                    onClick={() => onSelectProject(p.id, 'feed')}
                    className="group relative bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] hover:border-[#325FEC] dark:hover:border-[#518FFF] rounded-2xl p-5 cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          {parentTitle ? (
                            <>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1" title={parentTitle}>
                                <FolderSimple size={12} weight="bold" className="text-[#325FEC] dark:text-[#518FFF] flex-shrink-0" />
                                <span className="truncate">{parentTitle}</span>
                                <span>/</span>
                              </span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
                                Sub-project
                              </span>
                            </>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Main Project
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 flex-shrink-0">
                          {formatRelativeTime(p.lastAccessedAt || p.updatedAt)}
                        </span>
                      </div>

                      <h3 title={p.title} className="font-display font-semibold text-sm text-[#0F172A] dark:text-white group-hover:text-[#325FEC] dark:group-hover:text-[#518FFF] transition-colors line-clamp-1">
                        {p.title}
                      </h3>

                      <p title={p.description || ''} className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {p.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#D2DCEA]/60 dark:border-[#27272A] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#EEF3F8] dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#D2DCEA] dark:border-[#27272A]">
                          <Bookmarks size={11} className="text-[#325FEC] dark:text-[#518FFF]" />
                          <span>{p.atomCount || projAtoms.length} clips</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[#325FEC] dark:text-[#518FFF] font-medium text-xs group-hover:translate-x-0.5 transition-transform">
                        <span>Resume</span>
                        <ArrowRight size={12} weight="bold" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── MAIN PROJECT FOLDERS (3 CARDS PER ROW) ──────────────── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#D2DCEA] dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <TreeStructure size={18} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
              <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">
                Project Folders
              </h2>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full sm:w-72">
              <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter folders and sub-projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Folders: one card each */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4 items-start">
            {filteredMainProjects.map((m) => renderFolderCard(m))}
          </div>
        </section>

      </div>
    </div>
  );
};
