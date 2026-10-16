'use client';

import React, { useState, useMemo } from 'react';
import {
  FolderSimple,
  Plus,
  ArrowRight,
  ArrowUpRight,
  Clock,
  FileText,
  MagnifyingGlass,
  Bookmarks,
  TreeStructure,
  Trash,
  ShareNetwork,
  PuzzlePiece,
  SquaresFour,
  Rows,
  Lightning,
  CheckCircle,
  WarningCircle,
  Stack,
  Command,
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

// ─── Illustration: clips linked into one knowledge graph (hero) ──────
export const DashboardHeroIllustration: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => (
  <svg viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    {/* Link lines between the clips and the centre node */}
    <path d="M78 66 C 120 70, 130 96, 160 120" stroke="#518FFF" strokeOpacity="0.7" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M250 62 C 214 74, 190 98, 164 118" stroke="#518FFF" strokeOpacity="0.7" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M70 188 C 108 176, 134 150, 158 126" stroke="#518FFF" strokeOpacity="0.7" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" />
    <path d="M258 178 C 226 172, 196 148, 168 126" stroke="#518FFF" strokeOpacity="0.7" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" />

    {/* Centre node: the question being answered */}
    <circle cx="162" cy="122" r="34" fill="#325FEC" fillOpacity="0.16" />
    <circle cx="162" cy="122" r="24" fill="#325FEC" />
    <circle cx="162" cy="122" r="24" stroke="#8DB4FF" strokeOpacity="0.8" strokeWidth="1.5" />
    <path d="M152 123 L159 130 L173 114" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

    {/* Clip card: text */}
    <g transform="rotate(-6 78 66)">
      <rect x="34" y="38" width="88" height="56" rx="10" fill="#FFFFFF" fillOpacity="0.96" />
      <rect x="44" y="49" width="38" height="5" rx="2.5" fill="#325FEC" />
      <rect x="44" y="60" width="68" height="4" rx="2" fill="#CBD5E1" />
      <rect x="44" y="69" width="58" height="4" rx="2" fill="#CBD5E1" />
      <rect x="44" y="78" width="30" height="4" rx="2" fill="#CBD5E1" />
    </g>
    {/* Clip card: image */}
    <g transform="rotate(5 250 62)">
      <rect x="208" y="34" width="84" height="58" rx="10" fill="#FFFFFF" fillOpacity="0.96" />
      <rect x="216" y="42" width="68" height="30" rx="6" fill="#DCE6FD" />
      <circle cx="230" cy="53" r="5" fill="#518FFF" />
      <path d="M216 72 L238 56 L254 66 L268 58 L284 70 V72 Z" fill="#325FEC" fillOpacity="0.55" />
      <rect x="216" y="79" width="40" height="4" rx="2" fill="#CBD5E1" />
    </g>
    {/* Clip card: link */}
    <g transform="rotate(4 70 188)">
      <rect x="26" y="160" width="90" height="52" rx="10" fill="#FFFFFF" fillOpacity="0.96" />
      <circle cx="42" cy="176" r="7" fill="#325FEC" fillOpacity="0.18" />
      <path d="M39 178 L45 174 M42 172 L42 172" stroke="#325FEC" strokeWidth="2" strokeLinecap="round" />
      <rect x="54" y="171" width="48" height="5" rx="2.5" fill="#0F172A" fillOpacity="0.75" />
      <rect x="36" y="190" width="70" height="4" rx="2" fill="#CBD5E1" />
      <rect x="36" y="199" width="44" height="4" rx="2" fill="#CBD5E1" />
    </g>
    {/* Clip card: quote with citation chip */}
    <g transform="rotate(-4 258 178)">
      <rect x="212" y="152" width="92" height="54" rx="10" fill="#FFFFFF" fillOpacity="0.96" />
      <path d="M222 168 h14 M222 177 h58 M222 186 h46" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
      <rect x="262" y="192" width="34" height="12" rx="6" fill="#325FEC" />
      <rect x="268" y="196.5" width="22" height="3" rx="1.5" fill="white" fillOpacity="0.9" />
    </g>

    {/* Sparks */}
    <circle cx="190" cy="42" r="3" fill="#8DB4FF" />
    <circle cx="124" cy="214" r="2.5" fill="#8DB4FF" fillOpacity="0.8" />
    <circle cx="300" cy="120" r="2.5" fill="#8DB4FF" fillOpacity="0.8" />
  </svg>
);

// ─── Illustration: one folder, one style, for every project ─────────
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
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
    <rect x="14" y="20" width="36" height="26" rx="3" fill="#FFFFFF" stroke="#D2DCEA" strokeWidth="1.5" />
    <path d="M19 27H35" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 33H45" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 39H31" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path
      d="M6 28C6 24.6863 8.68629 22 12 22H52C55.3137 22 58 24.6863 58 28V46C58 49.3137 55.3137 52 52 52H12C8.68629 52 6 49.3137 6 46V28Z"
      fill={color}
      fillOpacity="0.9"
    />
    <path d="M12 30H28" stroke="white" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Chips: one place for the colour meaning ────────────────────────
type Tone = 'blue' | 'cyan' | 'green' | 'amber' | 'slate';

const TONE_CLASSES: Record<Tone, string> = {
  blue: 'bg-[#E8EEFE] text-[#2848C8] border-[#CBD8FB] dark:bg-[#325FEC]/15 dark:text-[#8DB4FF] dark:border-[#325FEC]/30',
  cyan: 'bg-[#E3F4FD] text-[#0B6FA4] border-[#BFE3F7] dark:bg-[#0EA5E9]/15 dark:text-[#7DD3FC] dark:border-[#0EA5E9]/30',
  green: 'bg-[#E3F6EC] text-[#14724A] border-[#BFE8D2] dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  amber: 'bg-[#FDF1DC] text-[#9A5B06] border-[#F6DDAE] dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  slate: 'bg-white/70 text-slate-600 border-[#D2DCEA] dark:bg-white/5 dark:text-zinc-300 dark:border-white/10',
};

const Chip: React.FC<{ tone?: Tone; icon?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  tone = 'slate',
  icon,
  className = '',
  children,
}) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold leading-4 whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
  >
    {icon}
    {children}
  </span>
);

const DAY_MS = 24 * 60 * 60 * 1000;

type FolderFilter = 'all' | 'nested' | 'shared' | 'empty';

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
  const [view, setView] = useState<'grid' | 'list'>('grid');

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

  const folderClips = (main: ResearchProject) =>
    (main.atomCount || 0) + (subProjectsByParent.get(main.id) || []).reduce((sum, sp) => sum + (sp.atomCount || 0), 0);

  const isShared = (p: ResearchProject) => p.role === 'editor' || p.role === 'viewer';

  // Numbers for the stat tiles
  const stats = useMemo(() => {
    const real = projects.filter((p) => p.id !== 'all');
    const subCount = real.filter((p) => p.parentId).length;
    const clips = real.reduce((sum, p) => sum + (p.atomCount || 0), 0);
    const activeToday = real.filter((p) => Date.now() - lastTouched(p) < DAY_MS).length;
    const empty = real.filter((p) => (p.atomCount || 0) === 0).length;
    return { mains: allMainProjects.length, subCount, clips, activeToday, empty };
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

  // Folders after the chip filter and the search box
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

  // Status chip for a project: the colour says what needs attention
  const statusChip = (p: ResearchProject, clips: number) => {
    if (isShared(p)) return <Chip tone="blue">{p.role === 'viewer' ? 'Can view' : 'Can edit'}</Chip>;
    if (clips === 0) return <Chip tone="amber" icon={<WarningCircle size={11} weight="fill" />}>Empty</Chip>;
    if (Date.now() - lastTouched(p) < DAY_MS) return <Chip tone="green" icon={<CheckCircle size={11} weight="fill" />}>Active today</Chip>;
    return null;
  };

  const sectionTitle = 'font-display font-bold text-[15px] tracking-tight text-[#0F172A] dark:text-white';
  const eyebrow = 'text-[10px] font-mono uppercase tracking-[0.14em]';

  // ─── Recent card (featured = blue gradient, others tinted by type) ───
  const renderRecent = (p: ResearchProject, index: number) => {
    const parentTitle = getParentTitle(p.parentId);
    const clips = p.atomCount || 0;
    const featured = index === 0;
    const open = () => onSelectProject(p.id, 'feed');

    const shell = featured
      ? 'md:row-span-2 bg-[linear-gradient(145deg,#4F7DFF_0%,#325FEC_45%,#1F3FAE_100%)] text-white border border-white/15 shadow-[0_20px_40px_-16px_rgba(50,95,236,0.7)]'
      : parentTitle
        ? 'bg-[#E9F5FD]/90 dark:bg-[#0B2233]/80 border border-[#BFE3F7] dark:border-[#0EA5E9]/25 text-[#0F172A] dark:text-white hover:border-[#0EA5E9]/60'
        : 'bg-[#EDF2FE]/90 dark:bg-[#101C3A]/80 border border-[#CBD8FB] dark:border-[#325FEC]/30 text-[#0F172A] dark:text-white hover:border-[#325FEC]/60';

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
        className={`group relative overflow-hidden rounded-3xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between gap-5 ${shell} ${featured ? 'min-h-[220px]' : ''}`}
      >
        {featured && (
          <>
            <div className="pointer-events-none absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
                WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 100% 0%, #000 0%, transparent 70%)',
                maskImage: 'radial-gradient(ellipse 70% 70% at 100% 0%, #000 0%, transparent 70%)',
              }}
            />
          </>
        )}

        <div className="relative space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {parentTitle ? (
                <>
                  <Chip tone={featured ? 'slate' : 'cyan'} className={featured ? '!bg-white/15 !text-white !border-white/25' : ''}>
                    Sub-project
                  </Chip>
                  <span
                    title={parentTitle}
                    className={`inline-flex items-center gap-1 text-[10px] font-mono truncate max-w-[140px] ${featured ? 'text-white/75' : 'text-slate-500 dark:text-zinc-400'}`}
                  >
                    <FolderSimple size={11} weight="bold" className="flex-shrink-0" />
                    <span className="truncate">{parentTitle}</span>
                  </span>
                </>
              ) : (
                <Chip tone={featured ? 'slate' : 'blue'} className={featured ? '!bg-white/15 !text-white !border-white/25' : ''}>
                  Main Project
                </Chip>
              )}
            </div>
            <span className={`text-[10px] font-mono flex-shrink-0 ${featured ? 'text-white/70' : 'text-slate-400 dark:text-zinc-500'}`}>
              {formatRelativeTime(p.lastAccessedAt || p.updatedAt)}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <ProjectAvatar
              title={p.title}
              folderIcon={p.folderIcon}
              seed={p.id}
              color={featured ? '#325FEC' : p.color || '#325FEC'}
              size={featured ? 44 : 34}
              className="shadow-sm"
            />
            <div className="min-w-0 space-y-1">
              <h3
                title={p.title}
                className={`font-display font-bold tracking-tight leading-snug ${featured ? 'text-xl line-clamp-2' : 'text-sm line-clamp-1'}`}
              >
                {p.title}
              </h3>
              <p
                title={p.description || ''}
                className={`leading-relaxed ${featured ? 'text-[13px] line-clamp-3 text-white/80' : 'text-xs line-clamp-2 text-slate-500 dark:text-zinc-400'}`}
              >
                {p.description || 'No description provided.'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Chip
              tone="slate"
              icon={<Bookmarks size={11} />}
              className={featured ? '!bg-white/15 !text-white !border-white/25' : ''}
            >
              {clips} clips
            </Chip>
            {featured ? null : statusChip(p, clips)}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${featured ? 'text-white' : 'text-[#325FEC] dark:text-[#8DB4FF]'}`}
          >
            <span>Resume</span>
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full transition-transform group-hover:translate-x-0.5 ${featured ? 'bg-white text-[#325FEC]' : 'bg-[#325FEC] text-white'}`}
            >
              <ArrowRight size={12} weight="bold" />
            </span>
          </span>
        </div>
      </div>
    );
  };

  // ─── Project folder: grid card ───
  const renderFolderCard = (mainProj: ResearchProject) => {
    const subProjects = subProjectsByParent.get(mainProj.id) || [];
    const total = folderClips(mainProj);
    const mainShare = total > 0 ? Math.round(((mainProj.atomCount || 0) / total) * 100) : 0;
    const canManage = !isShared(mainProj);

    return (
      <div
        key={mainProj.id}
        className="group relative flex flex-col rounded-3xl border border-[#CBD8FB]/80 dark:border-white/10 bg-white/75 dark:bg-[#101624]/80 backdrop-blur-sm shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_10px_30px_-18px_rgba(50,95,236,0.35)] hover:border-[#325FEC]/50 dark:hover:border-[#518FFF]/50 transition-all"
      >
        {/* Header band: illustration beside the title */}
        <div className="flex items-start gap-3.5 p-5 pb-3 rounded-t-3xl bg-gradient-to-br from-[#EAF0FF] to-transparent dark:from-[#325FEC]/[0.12] dark:to-transparent">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white dark:bg-[#18202F] border border-[#CBD8FB] dark:border-white/10 flex items-center justify-center shadow-sm">
            <FolderIllustration color="#325FEC" className="w-10 h-10" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3
              onClick={() => onSelectProject(mainProj.id, 'feed')}
              title={mainProj.title}
              className="font-display font-bold text-[15px] leading-snug tracking-tight text-[#0F172A] dark:text-white group-hover:text-[#325FEC] dark:group-hover:text-[#8DB4FF] cursor-pointer transition-colors line-clamp-2"
            >
              {mainProj.title}
            </h3>
            <p
              title={mainProj.description || ''}
              className="text-xs font-normal text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed"
            >
              {mainProj.description || 'Main research project folder.'}
            </p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0 -mr-1.5 -mt-1">
            {onOpenShareModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenShareModal(mainProj);
                }}
                className="inline-flex items-center p-1.5 text-slate-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
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
                className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                title={`Delete ${mainProj.title}`}
              >
                <Trash size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Chips */}
        <div className="flex items-center gap-1.5 flex-wrap px-5 pb-3">
          <Chip tone="cyan" icon={<TreeStructure size={11} weight="bold" />}>
            {subProjects.length} sub-projects
          </Chip>
          <Chip tone="blue" icon={<Bookmarks size={11} weight="bold" />}>
            {total} clips
          </Chip>
          {statusChip(mainProj, total)}
        </div>

        {/* Sub-projects as tiles */}
        <div className="px-5 pb-4 flex-1">
          <div className={`flex items-center justify-between mb-2 ${eyebrow} text-slate-400 dark:text-zinc-500`}>
            <span>Sub-projects</span>
            <span>{subProjects.length}</span>
          </div>
          {subProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD8FB] dark:border-white/15 py-3 text-center text-xs text-slate-400 dark:text-zinc-500">
              No sub-projects yet
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[8.5rem] overflow-y-auto pr-0.5">
              {subProjects.map((sp) => (
                <div
                  key={sp.id}
                  data-testid="subproject-card"
                  onClick={() => onSelectProject(sp.id, 'feed')}
                  className="flex items-center gap-2 p-2 rounded-xl bg-[#EEF3FE] hover:bg-[#E2EBFD] dark:bg-white/5 dark:hover:bg-white/10 border border-[#D6E1FB] dark:border-white/10 cursor-pointer transition-colors min-w-0"
                  title={sp.title}
                >
                  <ProjectAvatar title={sp.title} folderIcon={sp.folderIcon} seed={sp.id} color={sp.color || '#325FEC'} size={24} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-[#0F172A] dark:text-zinc-100 truncate leading-tight">{sp.title}</div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">{sp.atomCount || 0} clips</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: clip split bar and actions */}
        <div className="px-5 pb-5 space-y-3">
          <div className="space-y-1.5">
            <div className="h-1.5 rounded-full bg-[#DCE6FD] dark:bg-white/10 overflow-hidden flex">
              <div className="h-full bg-[#325FEC]" style={{ width: `${mainShare}%` }} />
              <div className="h-full bg-[#7DD3FC]" style={{ width: total > 0 ? `${100 - mainShare}%` : '0%' }} />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-zinc-500">
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#325FEC]" />Folder</span>
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#7DD3FC]" />Sub-projects</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            {canManage ? (
              <button onClick={() => onOpenCreateModal(mainProj.id)} className="cta-soft" title="Add a sub-project">
                <Plus size={13} weight="bold" />
                <span>Sub-Project</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">{mainProj.role === 'viewer' ? 'Can view' : 'Can edit'}</span>
            )}

            <button onClick={() => onSelectProject(mainProj.id, 'feed')} className="cta-primary !pl-4 !text-xs">
              <span>Open Folder</span>
              <span className="cta-icon !w-6 !h-6">
                <ArrowRight size={12} weight="bold" />
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Project folder: list row ───
  const renderFolderRow = (mainProj: ResearchProject) => {
    const subProjects = subProjectsByParent.get(mainProj.id) || [];
    const total = folderClips(mainProj);
    return (
      <div
        key={mainProj.id}
        className="group flex items-center gap-4 px-4 py-3 rounded-2xl border border-[#CBD8FB]/80 dark:border-white/10 bg-white/75 dark:bg-[#101624]/80 hover:border-[#325FEC]/50 dark:hover:border-[#518FFF]/50 transition-all"
      >
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#EAF0FF] dark:bg-[#325FEC]/15 border border-[#CBD8FB] dark:border-white/10 flex items-center justify-center">
          <FolderIllustration color="#325FEC" className="w-8 h-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            onClick={() => onSelectProject(mainProj.id, 'feed')}
            title={mainProj.title}
            className="font-display font-bold text-sm tracking-tight text-[#0F172A] dark:text-white group-hover:text-[#325FEC] dark:group-hover:text-[#8DB4FF] cursor-pointer transition-colors truncate"
          >
            {mainProj.title}
          </h3>
          <p title={mainProj.description || ''} className="text-xs text-slate-500 dark:text-zinc-400 truncate">
            {mainProj.description || 'Main research project folder.'}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <Chip tone="cyan" icon={<TreeStructure size={11} weight="bold" />}>{subProjects.length} sub-projects</Chip>
          <Chip tone="blue" icon={<Bookmarks size={11} weight="bold" />}>{total} clips</Chip>
          {statusChip(mainProj, total)}
        </div>
        <button onClick={() => onSelectProject(mainProj.id, 'feed')} className="cta-primary !pl-4 !text-xs flex-shrink-0">
          <span>Open Folder</span>
          <span className="cta-icon !w-6 !h-6"><ArrowRight size={12} weight="bold" /></span>
        </button>
      </div>
    );
  };

  const filterChips: { id: FolderFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'nested', label: 'With sub-projects' },
    { id: 'shared', label: 'Shared' },
    { id: 'empty', label: 'Empty' },
  ];

  return (
    <div className="flex-1 overflow-y-auto text-[#0F172A] dark:text-[#FAFAFA] transition-colors p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Top bar: lines up with the logo in the sidebar */}
        <div className="flex items-center justify-between h-8 -mt-1">
          <div className={`${eyebrow} text-slate-500 dark:text-zinc-400 hidden sm:block`}>Workspace / Hub</div>
          <button
            type="button"
            onClick={() => setExtensionOpen(true)}
            title="Download the Chrome extension"
            aria-label="Download the Chrome extension"
            data-testid="get-extension-button"
            className="group inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-xs font-sans font-semibold bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-slate-800 dark:text-zinc-100 border border-[#CBD8FB] dark:border-white/15 backdrop-blur shadow-sm transition-all cursor-pointer"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#325FEC] text-white">
              <PuzzlePiece size={13} weight="bold" />
            </span>
            <span>Download extension</span>
            <ArrowUpRight size={12} weight="bold" className="text-slate-400 group-hover:text-[#325FEC] transition-colors" />
          </button>
        </div>
        <GetExtensionModal isOpen={extensionOpen} onClose={() => setExtensionOpen(false)} />

        {/* ─── HERO BENTO: welcome card + stat tiles ─── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0D1A3C_0%,#122A66_58%,#1D3F9E_100%)] text-white shadow-[0_30px_60px_-30px_rgba(15,26,60,0.9)]">
            <div className="pointer-events-none absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-[#325FEC]/40 blur-3xl" />
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(141,180,255,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(141,180,255,0.25) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
                WebkitMaskImage: 'radial-gradient(ellipse 60% 80% at 100% 50%, #000 0%, transparent 72%)',
                maskImage: 'radial-gradient(ellipse 60% 80% at 100% 50%, #000 0%, transparent 72%)',
              }}
            />
            <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-4 items-center p-7 md:p-9">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-70 animate-ping" />
                    <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </span>
                  <span className={`${eyebrow} text-white/80`}>Research workspace hub</span>
                </div>

                <div className="space-y-2">
                  <h1 className="font-display font-extrabold text-3xl md:text-[34px] leading-[1.1] tracking-tight">
                    Welcome back to your Knowledge Engine
                  </h1>
                  <p className="text-sm font-light text-white/75 leading-relaxed max-w-md">
                    Organize your research in hierarchical project folders, capture evidence clips across the web, and synthesize multi-document findings.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <button onClick={() => onOpenCreateModal()} className="cta-primary">
                    <span>New Project Folder</span>
                    <span className="cta-icon">
                      <Plus size={14} weight="bold" />
                    </span>
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

                <div className="flex items-center gap-2 text-[11px] text-white/55 font-mono">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15">
                    <Command size={10} weight="bold" />N
                  </span>
                  <span>new folder</span>
                  <span className="text-white/25">·</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15">Alt P</span>
                  <span>open feed</span>
                </div>
              </div>

              <div className="hidden md:block h-56">
                <DashboardHeroIllustration />
              </div>
            </div>
          </div>

          {/* Stat tiles */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            {/* Inverse tile: dark in light mode, light in dark mode */}
            <div className="relative rounded-3xl p-4 flex flex-col justify-between min-h-[128px] bg-[#0F1A3A] text-white dark:bg-[#F2F6FF] dark:text-[#0B1220] border border-transparent dark:border-white/60 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.12] dark:bg-[#325FEC]/[0.12] text-[#8DB4FF] dark:text-[#325FEC]">
                  <FolderSimple size={16} weight="fill" />
                </span>
                <span className={`${eyebrow} opacity-60`}>Folders</span>
              </div>
              <div>
                <div className="font-display font-extrabold text-4xl tracking-tight leading-none">{stats.mains}</div>
                <div className="text-[11px] font-mono opacity-60 mt-1.5">{stats.subCount} sub-projects</div>
              </div>
            </div>

            <div className="rounded-3xl p-4 flex flex-col justify-between min-h-[128px] bg-[#E8EEFE]/90 dark:bg-[#325FEC]/15 border border-[#CBD8FB] dark:border-[#325FEC]/30">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-[#325FEC]/25 text-[#325FEC] dark:text-[#8DB4FF]">
                  <Stack size={16} weight="fill" />
                </span>
                <span className={`${eyebrow} text-slate-500 dark:text-zinc-400`}>Clips</span>
              </div>
              <div>
                <div className="font-display font-extrabold text-4xl tracking-tight leading-none text-[#1E3A9E] dark:text-white">{stats.clips}</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-1.5">in all folders</div>
              </div>
            </div>

            <div className="rounded-3xl p-4 flex flex-col justify-between min-h-[128px] bg-[#E3F6EC]/90 dark:bg-emerald-500/[0.12] border border-[#BFE8D2] dark:border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                  <Lightning size={16} weight="fill" />
                </span>
                <span className={`${eyebrow} text-slate-500 dark:text-zinc-400`}>Active today</span>
              </div>
              <div>
                <div className="font-display font-extrabold text-4xl tracking-tight leading-none text-[#0F5A3A] dark:text-white">{stats.activeToday}</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-1.5">opened or updated</div>
              </div>
            </div>

            <div className="rounded-3xl p-4 flex flex-col justify-between min-h-[128px] bg-[#FDF1DC]/90 dark:bg-amber-500/[0.12] border border-[#F6DDAE] dark:border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-white dark:bg-amber-500/20 text-amber-600 dark:text-amber-300">
                  <WarningCircle size={16} weight="fill" />
                </span>
                <span className={`${eyebrow} text-slate-500 dark:text-zinc-400`}>Empty</span>
              </div>
              <div>
                <div className="font-display font-extrabold text-4xl tracking-tight leading-none text-[#7A4604] dark:text-white">{stats.empty}</div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-1.5">need their first clip</div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── RECENT: one featured card, two stacked ─── */}
        {recentProjects.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-1">
                <div className={`${eyebrow} text-[#325FEC] dark:text-[#8DB4FF]`}>Pick up where you left off</div>
                <div className="flex items-center gap-2">
                  <Clock size={17} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" />
                  <h2 className={sectionTitle + ' !text-lg'}>Recent</h2>
                </div>
              </div>
              <Chip tone="slate">{recentProjects.length} active workspaces</Chip>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:grid-rows-2">
              {recentProjects.map((p, i) => renderRecent(p, i))}
            </div>
          </section>
        )}

        {/* ─── PROJECT FOLDERS ─── */}
        <section className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className={`${eyebrow} text-[#325FEC] dark:text-[#8DB4FF]`}>Everything you are researching</div>
              <div className="flex items-center gap-2">
                <TreeStructure size={17} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" />
                <h2 className={sectionTitle + ' !text-lg'}>Project Folders</h2>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative w-full sm:w-64">
                <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter folders and sub-projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white/80 dark:bg-white/5 border border-[#CBD8FB] dark:border-white/10 focus:border-[#325FEC] rounded-full text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="inline-flex p-0.5 rounded-full bg-white/80 dark:bg-white/5 border border-[#CBD8FB] dark:border-white/10" role="group" aria-label="Folder view">
                {([
                  { id: 'grid' as const, icon: SquaresFour, label: 'Grid view' },
                  { id: 'list' as const, icon: Rows, label: 'List view' },
                ]).map((v) => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setView(v.id)}
                      aria-pressed={view === v.id}
                      aria-label={v.label}
                      title={v.label}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        view === v.id ? 'bg-[#325FEC] text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-[#325FEC]'
                      }`}
                    >
                      <Icon size={14} weight="bold" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filter chips with counts */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterChips.map((c) => {
              const active = filter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilter(c.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0F1A3A] text-white border-[#0F1A3A] dark:bg-white dark:text-[#0B1220] dark:border-white'
                      : 'bg-white/70 dark:bg-white/5 text-slate-600 dark:text-zinc-300 border-[#CBD8FB] dark:border-white/10 hover:border-[#325FEC]/50'
                  }`}
                >
                  <span>{c.label}</span>
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] leading-5 text-center font-mono ${
                      active ? 'bg-white/20 dark:bg-[#0B1220]/10' : 'bg-[#E8EEFE] dark:bg-white/10 text-[#2848C8] dark:text-zinc-200'
                    }`}
                  >
                    {filterCounts[c.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredMainProjects.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#CBD8FB] dark:border-white/15 bg-white/50 dark:bg-white/[0.03] py-12 px-6 text-center space-y-3">
              <div className="mx-auto w-16 h-16">
                <FolderIllustration className="w-16 h-16" />
              </div>
              <div className="font-display font-bold text-sm">
                {allMainProjects.length === 0 ? 'No project folders yet' : 'No folders match this filter'}
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {allMainProjects.length === 0
                  ? 'Create your first folder, then clip into it from any page.'
                  : 'Clear the search or pick another filter.'}
              </p>
              {allMainProjects.length === 0 && (
                <button onClick={() => onOpenCreateModal()} className="cta-primary mx-auto">
                  <span>New Project Folder</span>
                  <span className="cta-icon"><Plus size={14} weight="bold" /></span>
                </button>
              )}
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
              {filteredMainProjects.map((m) => renderFolderCard(m))}
            </div>
          ) : (
            <div className="space-y-2.5">{filteredMainProjects.map((m) => renderFolderRow(m))}</div>
          )}
        </section>
      </div>
    </div>
  );
};
