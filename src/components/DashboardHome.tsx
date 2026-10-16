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

// ─── Illustration: loose clips joined into one answer ────────────────
// Neutral cards, one blue accent. Colours switch with the theme through classes.
export const DashboardHeroIllustration: React.FC<{ className?: string; onDark?: boolean }> = ({
  className = 'w-full h-full',
  onDark = false,
}) => {
  // On the navy hero the cards stay light in both themes.
  const card = onDark ? 'fill-white stroke-white/20' : 'fill-white dark:fill-[#1B2132] stroke-[#DDE3EE] dark:stroke-white/10';
  const line = onDark ? 'fill-[#D5DEF3]' : 'fill-[#E2E7F0] dark:fill-white/15';
  const link = onDark ? 'stroke-[#8DB4FF]/70' : 'stroke-[#B9C6E6] dark:stroke-white/25';
  const halo = onDark ? 'fill-[#518FFF]/25' : 'fill-[#325FEC]/10 dark:fill-[#518FFF]/15';
  const soft = onDark ? 'fill-[#E6ECFA]' : 'fill-[#EEF2FA] dark:fill-white/10';
  const dot = onDark ? 'fill-[#B9C6E6]' : 'fill-[#B9C6E6] dark:fill-white/30';
  const hill = onDark ? 'fill-[#C9D5F0]' : 'fill-[#C9D5F0] dark:fill-white/20';
  const pill = onDark ? 'fill-[#94A3B8]' : 'fill-[#94A3B8] dark:fill-white/40';
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

const HAIRLINE = 'border-[#E8ECF3] dark:border-white/10';
const MUTED = 'text-slate-500 dark:text-zinc-400';

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

  // The folder that holds the most recent project gets the one blue card
  const featuredFolderId = recentProjects[0]?.parentId || recentProjects[0]?.id || null;

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
                className={`cta-soft ${featured ? '!bg-white/15 !border-white/30 !text-white hover:!bg-white/25' : ''}`}
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
                  : 'cta-primary !pl-4 !text-xs'
              }
            >
              <span>Open Folder</span>
              <span className={featured ? "flex items-center" : "cta-icon !w-6 !h-6"}>
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
                <DashboardHeroIllustration onDark />
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-4 items-start">
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
