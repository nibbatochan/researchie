'use client';

import { PaperOutlineView } from './PaperOutlineView';
import { EmptyFeedIllustration } from './illustrations';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CaretLeft,
  CaretRight,
  FolderSimple,
  MagnifyingGlass, 
  BookmarkSimple, 
  Rows, 
  ListDashes, 
  ChatCircleText, 
  Checks, 
  X,
  CaretDown,
  SquaresFour,
  Quotes,
  Code,
  Image as ImageIcon,
  LinkSimple,
  FileText,
  Check,
  Export,
  Tag,
  Graph,
  BookOpen,
  Plus,
  CalendarBlank,
  Clock,
  Funnel,
  Trash,
  ShieldCheck,
  ShareNetwork,
  Compass,
  PushPin
} from '@phosphor-icons/react';
import { isPinned, sortPinnedFirst } from '@/lib/atoms/pin';
import { ResearchAtom, ResearchProject, AtomType } from '@/lib/types/research';
import { AtomCard } from './AtomCard';
import { ExportProjectModal } from './ExportProjectModal';
import { ResearchieAISidebar, AISidebarTab } from './ResearchieAISidebar';
import { ResearchieAIFAB } from './ResearchieAIFAB';
import { ResearchCanvas } from './ResearchCanvas';
import { PDFReaderView } from './PDFReaderView';
import { TimelineSkeleton } from './SkeletonLoader';

interface ProjectTimelineProps {
  project: ResearchProject | null;
  atoms: ResearchAtom[];
  loading?: boolean;
  /** Every project, with its sub-projects, for choosing where a Research AI note is saved. */
  projects?: ResearchProject[];
  onDeleteAtom?: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  onOpenManualModal?: () => void;
  onCreateAtom?: (newAtom: {
    projectId: string;
    type: AtomType;
    title?: string;
    content: { text?: string; description?: string; targetUrl?: string; imageUrl?: string; markdownContent?: string };
    metadata?: {
      sourceUrl?: string;
      pageTitle?: string;
      documentType?: 'pdf' | 'web';
      documentName?: string;
      documentId?: string;
      pageNumber?: number;
      totalDocumentPages?: number;
      evidenceKind?: 'quote' | 'ai-summary' | 'mine';
      origin?: 'research-ai';
      sourceAtomIds?: string[];
      references?: string[];
    };
    tags?: string[];
  }) => void;
  workspaceMode?: 'feed' | 'canvas' | 'reader';
  onWorkspaceModeChange?: (mode: 'feed' | 'canvas' | 'reader') => void;
  targetDocId?: string;
  targetPage?: number;
  targetHighlightText?: string;
  onOpenPdfReader?: (docId?: string, pageNumber?: number, text?: string) => void;
  onOpenTrashModal?: () => void;
  trashCount?: number;
  onOpenShareModal?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

// ─── Timeline Empty State Vector Illustration ────────────────────────
export const TimelineEmptyIllustration = EmptyFeedIllustration;

// A long timeline shows this many clips at a time, with Previous and Next under the list.
const TIMELINE_PAGE_SIZE = 25;

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Types', icon: SquaresFour },
  { id: 'quote', label: 'Quotes', icon: Quotes },
  { id: 'block', label: 'Web Blocks', icon: Code },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'link', label: 'Links', icon: LinkSimple },
  { id: 'note', label: 'Notes', icon: FileText },
];

const DATE_FILTER_OPTIONS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today (24h)' },
  { id: 'week', label: 'Past 7 Days' },
  { id: 'month', label: 'Past 30 Days' },
];

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({
  project,
  atoms,
  loading = false,
  onDeleteAtom,
  onTogglePin,
  onOpenManualModal,
  onCreateAtom,
  projects,
  workspaceMode = 'feed',
  onWorkspaceModeChange,
  targetDocId,
  targetPage,
  targetHighlightText,
  onOpenPdfReader,
  onOpenTrashModal,
  trashCount = 0,
  onOpenShareModal,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  // Pinned mode: show only pinned atoms. Pinned atoms always sit at the top of the feed either way.
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'clean' | 'detailed'>('clean');
  const [isPaperOpen, setIsPaperOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  // Sync with workspaceMode prop
  useEffect(() => {
    if (workspaceMode === 'canvas') {
      // Keep canvas active
    }
  }, [workspaceMode]);

  // Multi-Atom Selection for Synthesis
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  // Goes up each time Export is pressed on the canvas; the canvas, which holds the data, opens the dialog.
  const [canvasExportSignal, setCanvasExportSignal] = useState(0);
  // AI Assistant Sidebar & FAB State
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [aiSidebarTab, setAiSidebarTab] = useState<AISidebarTab>('ask');

  // Close filter dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setIsDateDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: atoms.length,
      quote: 0,
      block: 0,
      image: 0,
      link: 0,
      note: 0,
    };
    atoms.forEach((atom) => {
      if (atom.type === 'quote' || atom.type === 'text') counts.quote++;
      else if (atom.type === 'block') counts.block++;
      else if (atom.type === 'image') counts.image++;
      else if (atom.type === 'link') counts.link++;
      else if (atom.type === 'note') counts.note++;
    });
    return counts;
  }, [atoms]);

  // Global Keyboard Shortcut Alt+P to toggle AI Sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.altKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.code === 'KeyP')) {
        e.preventDefault();
        setIsAISidebarOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clips that arrive while the feed is open (from the extension) fade in. Nothing animates on first load, on a
  // project switch, or when a filter or search brings older clips back.
  const knownAtoms = useRef<{ projectId: string; ids: Set<string> }>({ projectId: '', ids: new Set() });
  const freshAtomIds = useMemo(() => {
    const known = knownAtoms.current;
    if (known.projectId !== (project?.id ?? "") || known.ids.size === 0) return new Set<string>();
    return new Set(atoms.filter((a) => !known.ids.has(a.id)).map((a) => a.id));
  }, [atoms, (project?.id ?? "")]);
  useEffect(() => {
    knownAtoms.current = { projectId: (project?.id ?? ""), ids: new Set(atoms.map((a) => a.id)) };
  }, [atoms, (project?.id ?? "")]);

  const filteredAtoms = useMemo(() => {
    return sortPinnedFirst(atoms.filter((atom) => {
      if (pinnedOnly && !isPinned(atom)) return false;

      // 1. Type filtering
      const matchesType = 
        filterType === 'all' || 
        atom.type === filterType || 
        (filterType === 'quote' && (atom.type === 'quote' || atom.type === 'text'));
      if (!matchesType) return false;

      // 2. Date filtering
      if (customStartDate || customEndDate) {
        const atomTime = new Date(atom.capturedAt || atom.created_at || '').getTime();
        if (!isNaN(atomTime)) {
          if (customStartDate) {
            const start = new Date(customStartDate).getTime();
            if (atomTime < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate + 'T23:59:59.999').getTime();
            if (atomTime > end) return false;
          }
        }
      } else if (dateFilter !== 'all') {
        const atomTime = new Date(atom.capturedAt || atom.created_at || '').getTime();
        if (!isNaN(atomTime)) {
          const now = Date.now();
          const diffMs = now - atomTime;
          if (dateFilter === 'today' && diffMs > 24 * 60 * 60 * 1000) return false;
          if (dateFilter === 'week' && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
          if (dateFilter === 'month' && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // 3. Tag filtering
      if (selectedTag) {
        const matchesTag = (atom.tags || []).some(
          (t) => t.trim().replace(/^#+/, '').toLowerCase() === selectedTag.toLowerCase()
        );
        if (!matchesTag) return false;
      }

      // 4. Search query filtering
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchText = (atom.content.text || atom.content.rawText)?.toLowerCase().includes(q);
      const matchTitle = atom.title?.toLowerCase().includes(q);
      const matchUrl = atom.metadata?.sourceUrl?.toLowerCase().includes(q);
      const matchDesc = atom.content.description?.toLowerCase().includes(q);
      const matchMarkdown = atom.content.markdownContent?.toLowerCase().includes(q);
      const matchHtml = (atom.content.sanitizedHtml || (atom.content as any).standaloneHtml)?.toLowerCase().includes(q);
      const matchTags = (atom.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchOcr = atom.content.ocrText?.toLowerCase().includes(q);

      return matchText || matchTitle || matchUrl || matchDesc || matchMarkdown || matchHtml || matchTags || matchOcr;
    }));
  }, [atoms, filterType, pinnedOnly, dateFilter, searchQuery, selectedTag, customStartDate, customEndDate]);

  const selectedAtomsList = useMemo(() => {
    return atoms.filter((a) => selectedIds.has(a.id));
  }, [atoms, selectedIds]);

  const atomsMap = useMemo(() => {
    const map = new Map<string, ResearchAtom>();
    atoms.forEach((a) => map.set(a.id, a));
    return map;
  }, [atoms]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAtoms.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAtoms.map((a) => a.id)));
    }
  };

  // A note the researcher rewrote is theirs ("mine"); a note straight from the AI stays an AI summary. The clips it cites
  // travel with it (sourceAtomIds), so dropping it in a paper cites them.
  // `origin` marks a note that came from Research AI, so the timeline and the paper can name it; `references` is its list,
  // shown under Get citation rather than in the text. `extra.projectId` saves to a chosen project or sub-project.
  const handleSaveSynthesis = (title: string, markdown: string, tags: string[], sourceAtomIds: string[] = [], extra?: { projectId?: string; references?: string[] }) => {
    if (!project || !onCreateAtom) return;
    onCreateAtom({
      projectId: extra?.projectId ?? (project.id === 'all' ? 'proj-ai-main' : project.id),
      type: 'note',
      title,
      content: {
        description: markdown.slice(0, 300) + '...',
        markdownContent: markdown,
      },
      metadata: {
        origin: 'research-ai',
        evidenceKind: tags.includes('user-written') ? 'mine' : 'ai-summary',
        ...(sourceAtomIds.length > 0 ? { sourceAtomIds } : {}),
        ...(extra?.references?.length ? { references: extra.references } : {}),
      },
      tags,
    });
  };

  // A new search, filter or project starts again at the first page.
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [searchQuery, filterType, pinnedOnly, dateFilter, selectedTag, project?.id]);
  const pageCount = Math.max(1, Math.ceil(filteredAtoms.length / TIMELINE_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageAtoms = filteredAtoms.slice(currentPage * TIMELINE_PAGE_SIZE, (currentPage + 1) * TIMELINE_PAGE_SIZE);

  const selectedFilterObj = FILTER_OPTIONS.find((f) => f.id === filterType) || FILTER_OPTIONS[0];
  const SelectedFilterIcon = selectedFilterObj.icon;

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500 dark:text-zinc-500 bg-[#F8F9FB] dark:bg-[#09090B]">
        <div>
          <BookmarkSimple size={36} className="mx-auto mb-2 text-slate-400 dark:text-zinc-700" />
          <p className="font-display font-medium text-slate-700 dark:text-zinc-300 text-xs">Select a workspace to view notes & clips</p>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Or create a new workspace from the sidebar.</p>
        </div>
      </div>
    );
  }

  // State for canvas minimap toggle
  const [showCanvasMinimap, setShowCanvasMinimap] = useState(false);

  return (
    <div className="grid-edges flex-1 flex flex-col h-full overflow-hidden bg-[#E3EAF6] dark:bg-[#09090B] transition-colors">
      {/* Sticky Toolbar */}
      <div className="px-3 py-1.5 md:px-5 md:py-2 border-b border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#09090B]/95 backdrop-blur-md sticky top-0 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        {/* Project Title and Round Tags Button at the Left */}
        <div className="min-w-0 flex items-center gap-2">
          {project.parentId && (
            <span className="text-xs font-mono text-slate-400 dark:text-zinc-500 hidden sm:inline-flex items-center gap-1">
              <span className="inline-flex items-center gap-1"><FolderSimple size={12} weight="bold" /><span>Folder</span></span>
              <span>/</span>
            </span>
          )}
          <h1 
            title={workspaceMode === 'reader' && project.id === 'all' ? 'Document Library' : project.title}
            className="text-xs md:text-sm font-display font-semibold text-[#0F172A] dark:text-[#FAFAFA] tracking-tight truncate max-w-[130px] sm:max-w-[200px] md:max-w-[280px] lg:max-w-md"
          >
            {workspaceMode === 'reader' && project.id === 'all' ? 'Document Library' : project.title}
          </h1>

          {workspaceMode === 'feed' && selectedTag && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-full bg-[#EEF3F8] dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#D9E1EC] dark:border-[#27272A]">
              <span>tag: {selectedTag}</span>
              <button 
                onClick={() => setSelectedTag(null)}
                className="hover:text-red-500 ml-0.5 cursor-pointer font-bold"
                title="Clear tag filter"
              >
                ×
              </button>
            </span>
          )}
        </div>

        {/* Search, Filter, View & Export Controls */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
          {/* In Canvas Mode: Single Minimap Toggle and Single Export (Figma-style) */}
          {workspaceMode === 'canvas' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCanvasMinimap((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium border transition-all ${
                  showCanvasMinimap
                    ? 'bg-[#325FEC] text-white border-[#325FEC]'
                    : 'bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] text-slate-700 dark:text-zinc-300 border-[#D9E1EC] dark:border-[#27272A]'
                }`}
                title="Toggle Canvas Minimap"
              >
                <Compass size={13} weight="bold" />
                <span>Minimap</span>
              </button>

              <button
                type="button"
                onClick={() => setCanvasExportSignal((n) => n + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] text-slate-700 dark:text-zinc-300 border border-[#D9E1EC] dark:border-[#27272A] transition-all"
                title="Export Canvas (PNG, JPEG, SVG)"
              >
                <Export size={13} className="text-slate-500 dark:text-zinc-400" />
                <span>Export</span>
              </button>
            </div>
          ) : workspaceMode !== 'reader' && (
            <>
              <div className="relative flex-1 sm:w-64 md:w-72 max-w-md flex items-center">
                <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in project..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-6 py-1 bg-[#EEF3F8] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-lg text-xs text-[#0F172A] dark:text-[#FAFAFA] placeholder-slate-400 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-[#0F172A] dark:hover:text-zinc-200"
                    title="Clear search"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Pinned mode toggle: next to the type filter. Click again to turn it off. */}
              <button
                type="button"
                onClick={() => setPinnedOnly((on) => !on)}
                aria-pressed={pinnedOnly}
                title={pinnedOnly ? 'Showing pinned only. Click to show everything' : 'Show pinned only'}
                className={`inline-flex items-center justify-center flex-shrink-0 rounded-lg px-2 py-1 border transition-colors cursor-pointer ${
                  pinnedOnly
                    ? 'bg-blue-50/80 dark:bg-[#1C1C20] border-[#325FEC] dark:border-[#518FFF] text-[#325FEC] dark:text-[#518FFF]'
                    : 'bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] border-[#D9E1EC] dark:border-[#27272A] text-slate-500 dark:text-zinc-400'
                }`}
              >
                <PushPin size={13} weight={pinnedOnly ? 'fill' : 'regular'} />
              </button>

              {/* Type Filter Dropdown with Live Counts */}
              <div className="relative inline-block flex-shrink-0" ref={filterDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="inline-flex items-center gap-1.5 bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] border border-[#D9E1EC] dark:border-[#27272A] text-[#0F172A] dark:text-zinc-200 rounded-lg px-2.5 py-1 text-xs font-sans focus:outline-none transition-colors"
                >
                  <SelectedFilterIcon size={13} className="text-slate-500 dark:text-zinc-400 flex-shrink-0" />
                  <span>{selectedFilterObj.label}</span>
                  <CaretDown size={10} className="text-slate-400 ml-0.5" />
                </button>

                {isFilterDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] rounded-xl shadow-xl py-1 z-30 animate-popIn">
                    {FILTER_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = filterType === opt.id;
                      const count = typeCounts[opt.id] ?? 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setFilterType(opt.id);
                            setIsFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-sans flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] font-medium'
                              : 'text-slate-700 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] hover:text-[#0F172A] dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={13} className={isSelected ? 'text-[#325FEC] dark:text-[#518FFF]' : 'text-slate-400'} />
                            <span>{opt.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-zinc-800 rounded-md text-slate-500 dark:text-zinc-400">
                              {count}
                            </span>
                            {isSelected && <Check size={12} weight="bold" className="text-[#325FEC] dark:text-[#518FFF]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Date Filter Dropdown with Search & Range */}
              <div className="relative inline-block flex-shrink-0" ref={dateDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                  className={`inline-flex items-center gap-1.5 bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] border text-[#0F172A] dark:text-zinc-200 rounded-lg px-2.5 py-1 text-xs font-sans focus:outline-none transition-colors ${
                    dateFilter !== 'all' || customStartDate || customEndDate
                      ? 'border-[#325FEC] text-[#325FEC] dark:border-[#518FFF] dark:text-[#518FFF] bg-blue-50/50' 
                      : 'border-[#D9E1EC] dark:border-[#27272A]'
                  }`}
                  title="Filter by capture date or date range"
                >
                  <CalendarBlank size={13} className={dateFilter !== 'all' || customStartDate || customEndDate ? 'text-[#325FEC] dark:text-[#518FFF]' : 'text-slate-500 dark:text-zinc-400'} />
                  <span className="truncate max-w-[130px]">
                    {customStartDate || customEndDate
                      ? customStartDate && customEndDate
                        ? `${customStartDate} → ${customEndDate}`
                        : customStartDate
                        ? `From ${customStartDate}`
                        : `To ${customEndDate}`
                      : DATE_FILTER_OPTIONS.find((d) => d.id === dateFilter)?.label || 'Date'}
                  </span>
                  <CaretDown size={10} className="text-slate-400 ml-0.5 flex-shrink-0" />
                </button>

                {isDateDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] rounded-xl shadow-xl py-1.5 z-30 animate-popIn">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                      Presets
                    </div>
                    {DATE_FILTER_OPTIONS.map((opt) => {
                      const isSelected = dateFilter === opt.id && !customStartDate && !customEndDate;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setDateFilter(opt.id as any);
                            setCustomStartDate('');
                            setCustomEndDate('');
                            setIsDateDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-sans flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-50/80 dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] font-medium'
                              : 'text-slate-700 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] hover:text-[#0F172A] dark:hover:text-white'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check size={12} weight="bold" className="text-[#325FEC] dark:text-[#518FFF]" />}
                        </button>
                      );
                    })}

                    <div className="pt-2 mt-1.5 border-t border-[#D9E1EC] dark:border-[#27272A] px-3 pb-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5">
                        Date or Range
                      </div>
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-zinc-400 block mb-0.5">Start Date</label>
                          <input 
                            type="date"
                            value={customStartDate}
                            onChange={(e) => {
                              setCustomStartDate(e.target.value);
                              setDateFilter('custom');
                            }}
                            className="w-full text-xs px-2 py-1 bg-[#EEF3F8] dark:bg-[#1C1C20] border border-[#D9E1EC] dark:border-[#27272A] rounded-md text-[#0F172A] dark:text-zinc-200 focus:outline-none focus:border-[#325FEC]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-zinc-400 block mb-0.5">End Date</label>
                          <input 
                            type="date"
                            value={customEndDate}
                            onChange={(e) => {
                              setCustomEndDate(e.target.value);
                              setDateFilter('custom');
                            }}
                            className="w-full text-xs px-2 py-1 bg-[#EEF3F8] dark:bg-[#1C1C20] border border-[#D9E1EC] dark:border-[#27272A] rounded-md text-[#0F172A] dark:text-zinc-200 focus:outline-none focus:border-[#325FEC]"
                          />
                        </div>
                        {(customStartDate || customEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomStartDate('');
                              setCustomEndDate('');
                              setDateFilter('all');
                            }}
                            className="mt-1 text-[11px] text-red-500 hover:text-red-600 font-medium text-left cursor-pointer"
                          >
                            Clear Date Filter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Trash / Recently Deleted Trigger */}
          {trashCount > 0 && onOpenTrashModal && (
            <button
              onClick={onOpenTrashModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans font-medium bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/40 transition-colors shadow-xs flex-shrink-0 cursor-pointer"
              title="View and restore recently deleted clips"
            >
              <Trash size={13} weight="bold" />
              <span>Trash ({trashCount})</span>
            </button>
          )}

          {/* Paper outline: plan where clips go in a paper (feed mode, real projects only) */}
          {workspaceMode === 'feed' && project?.id !== 'all' && (
            <button
              onClick={() => setIsPaperOpen((v) => !v)}
              data-testid="paper-outline-btn"
              aria-pressed={isPaperOpen}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium border transition-all shadow-xs flex-shrink-0 ${isPaperOpen ? 'bg-[#EEF3F8] dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF] border-[#325FEC]' : 'bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] text-slate-700 dark:text-zinc-300 border-[#D9E1EC] dark:border-[#27272A]'}`}
              title="Plan your paper: sections, parts, and where each clip goes"
            >
              <span>Paper</span>
            </button>
          )}

          {/* Export Project Button (Only in Feed Mode, hidden in Canvas Mode) */}
          {workspaceMode !== 'canvas' && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] text-slate-700 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white border border-[#D9E1EC] dark:border-[#27272A] transition-all shadow-xs flex-shrink-0"
              title="Export to PDF, Markdown, citations, or JSON"
            >
              <Export size={13} className="text-slate-500 dark:text-zinc-400" />
              <span>Export</span>
            </button>
          )}

          {/* Share & Multi-seat Collaboration Button */}
          {onOpenShareModal && project?.id !== 'all' && (
            <button
              onClick={onOpenShareModal}
              data-testid="share-project-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-sans font-medium bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] text-slate-700 dark:text-zinc-300 hover:text-[#0F172A] dark:hover:text-white border border-[#D9E1EC] dark:border-[#27272A] transition-all shadow-xs flex-shrink-0 cursor-pointer"
              title="Share Stream or Manage Team Access"
            >
              <ShareNetwork size={13} className="text-slate-500 dark:text-zinc-400" />
              <span>Share</span>
              {project?.pendingRequests ? (
                <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#325FEC] text-white text-[10px] leading-4 text-center" title="People waiting for access">{project.pendingRequests}</span>
              ) : null}
            </button>
          )}

          {/* View Mode Switch (for feed) */}
          {workspaceMode === 'feed' && (
            <div className="flex items-center bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] rounded-lg p-0.5 text-xs font-mono flex-shrink-0">
              <button
                onClick={() => setViewMode('clean')}
                className={`p-1 rounded ${
                  viewMode === 'clean' ? 'bg-[#EEF3F8] dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF]' : 'text-slate-400 hover:text-[#0F172A] dark:hover:text-zinc-200'
                }`}
                title="Compact View"
              >
                <Rows size={12} />
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={`p-1 rounded ${
                  viewMode === 'detailed' ? 'bg-[#EEF3F8] dark:bg-[#1C1C20] text-[#325FEC] dark:text-[#518FFF]' : 'text-slate-400 hover:text-[#0F172A] dark:hover:text-zinc-200'
                }`}
                title="Detailed Bento Card View"
              >
                <ListDashes size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Status Bar */}
      {workspaceMode === 'feed' && (searchQuery || filterType !== 'all' || pinnedOnly || dateFilter !== 'all' || selectedTag) && (
        <div className="px-3 py-1.5 md:px-5 bg-[#FAFBFD]/90 dark:bg-[#121214]/90 border-b border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between text-[11px] font-sans text-slate-600 dark:text-zinc-400">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-800 dark:text-zinc-200">
              Showing <span className="text-[#325FEC] dark:text-[#518FFF] font-bold">{filteredAtoms.length}</span> of {atoms.length} items
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700">
                <span>"{searchQuery}"</span>
                <button onClick={() => setSearchQuery('')} className="hover:text-red-500 font-bold ml-0.5">×</button>
              </span>
            )}
            {pinnedOnly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EEF3F8] dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#D9E1EC] dark:border-[#27272A]">
                <span>pinned only</span>
                <button onClick={() => setPinnedOnly(false)} className="hover:text-red-500 font-bold ml-0.5">×</button>
              </span>
            )}
            {filterType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EEF3F8] dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#D9E1EC] dark:border-[#27272A]">
                <span>type: {selectedFilterObj.label}</span>
                <button onClick={() => setFilterType('all')} className="hover:text-red-500 font-bold ml-0.5">×</button>
              </span>
            )}
            {dateFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EEF3F8] dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#D9E1EC] dark:border-[#27272A]">
                <span>date: {DATE_FILTER_OPTIONS.find((d) => d.id === dateFilter)?.label}</span>
                <button onClick={() => setDateFilter('all')} className="hover:text-red-500 font-bold ml-0.5">×</button>
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EEF3F8] dark:bg-[#18181B] text-slate-700 dark:text-zinc-300 border border-[#D9E1EC] dark:border-[#27272A]">
                <span>#{selectedTag}</span>
                <button onClick={() => setSelectedTag(null)} className="hover:text-red-500 font-bold ml-0.5">×</button>
              </span>
            )}
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
              setPinnedOnly(false);
              setDateFilter('all');
              setSelectedTag(null);
            }}
            className="text-[11px] text-slate-400 hover:text-red-500 underline font-medium cursor-pointer flex-shrink-0"
          >
            Reset all
          </button>
        </div>
      )}

      {/* Select Mode Action Bar */}
      {isSelectMode && (
        <div className="px-4 py-2 bg-slate-100 dark:bg-[#0E0E10] border-b border-slate-200 dark:border-[#222225] flex items-center justify-between text-xs font-sans animate-popIn">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 hover:text-[#325FEC] dark:hover:text-[#518FFF] transition-colors"
            >
              <Checks size={14} />
              <span>{selectedIds.size === filteredAtoms.length ? 'Deselect All' : 'Select All'}</span>
            </button>
            <span className="text-slate-400">•</span>
            <span className="text-[#325FEC] dark:text-[#518FFF] font-semibold">{selectedIds.size} selected</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={() => {
                  setAiSidebarTab('summarize');
                  setIsAISidebarOpen(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#325FEC] hover:bg-[#274AC4] text-white font-semibold text-xs transition-colors shadow-sm"
              >
                <ChatCircleText size={12} weight="fill" />
                <span>Generate Summary ({selectedIds.size})</span>
              </button>
            )}
            <button
              onClick={() => {
                setIsSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="p-1 text-slate-400 hover:text-[#0F172A] dark:hover:text-zinc-200"
              title="Close selection mode"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Row (Stream, Spatial Canvas, or PDF Reader on left + AI Sidebar on right) */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
        {workspaceMode === 'reader' ? (
          <div className="flex-1 min-w-0 h-full overflow-hidden relative">
            <PDFReaderView
              projectId={project.id}
              projectTitle={project.title}
              targetDocId={targetDocId}
              targetPage={targetPage}
              targetHighlightText={targetHighlightText}
              onClose={() => onWorkspaceModeChange?.('feed')}
              onCreateAtom={onCreateAtom}
            />
          </div>
        ) : workspaceMode === 'feed' && isPaperOpen && project && project.id !== 'all' ? (
          <div className="flex-1 min-w-0 h-full overflow-hidden relative flex flex-col">
            <PaperOutlineView projectId={project.id} atoms={atoms} onClose={() => setIsPaperOpen(false)} onCreateClip={onCreateAtom ? (clip) => onCreateAtom(clip as Parameters<typeof onCreateAtom>[0]) : undefined} />
          </div>
        ) : workspaceMode === 'canvas' ? (
          <div className="flex-1 min-w-0 h-full overflow-hidden relative">
            <ResearchCanvas
              project={project}
              atoms={atoms}
              onDeleteAtom={onDeleteAtom}
              onCreateAtom={onCreateAtom}
              onOpenPdfReader={onOpenPdfReader}
              showMinimap={showCanvasMinimap}
              onToggleMinimap={() => setShowCanvasMinimap((prev) => !prev)}
              exportOpenSignal={canvasExportSignal}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={onToggleSidebar}
              onOpenAISidebar={(tab, initialSelection) => {
                if (initialSelection && initialSelection.length > 0) {
                  setSelectedIds(new Set(initialSelection.map((a) => a.id)));
                }
                setAiSidebarTab(tab);
                setIsAISidebarOpen(true);
              }}
            />
          </div>
        ) : (
          /* Stream Area */
          <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 transition-all duration-300">
            {loading ? (
              <TimelineSkeleton count={4} mode={viewMode} />
            ) : filteredAtoms.length === 0 ? (
              <div className="animate-popIn max-w-md mx-auto my-12 text-center p-8 rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] shadow-sm">
                <TimelineEmptyIllustration />
                <h3 className="text-sm md:text-base font-display font-semibold text-[#0F172A] dark:text-[#FAFAFA]">
                  {searchQuery || selectedTag ? 'No matching clips found' : 'No clips saved yet'}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  {searchQuery || selectedTag
                    ? 'Try adjusting your search query, tag filters, or filter dropdown.'
                    : 'Select text on any webpage and save, or press Alt+C for screenshot, Alt+B for DOM blocks.'}
                </p>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#EEF3F8] dark:bg-[#18181B] hover:bg-[#E4ECF6] text-xs text-[#325FEC] dark:text-[#518FFF] border border-[#D9E1EC] dark:border-[#27272A] transition-colors"
                  >
                    <span>Clear active tag filter ({selectedTag})</span>
                  </button>
                )}

                {onOpenManualModal && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      onClick={onOpenManualModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-[#325FEC] hover:bg-[#274AC4] text-white shadow-sm transition-all"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Add a Clip</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-4xl mx-auto flex flex-col gap-[26px]">
                {pageAtoms.map((atom) => (
                  <React.Fragment key={atom.id}>
                    <div className={freshAtomIds.has(atom.id) ? 'animate-clipIn' : undefined}>
                    <AtomCard
                      atom={atom}
                      viewMode={viewMode === 'clean' ? 'clean' : 'detailed'}
                      searchQuery={searchQuery}
                      onDelete={onDeleteAtom}
                      onTogglePin={onTogglePin}
                      selectable={isSelectMode || (isAISidebarOpen && aiSidebarTab === 'summarize')}
                      isSelected={selectedIds.has(atom.id)}
                      onToggleSelect={handleToggleSelect}
                      onTagClick={(t) => setSelectedTag(t === selectedTag ? null : t)}
                      onOpenPdfReader={onOpenPdfReader}
                    />
                    </div>
                  </React.Fragment>
                ))}
                {pageCount > 1 && (
                  <nav aria-label="Timeline pages" data-testid="timeline-pager" className="flex items-center justify-between gap-3 pt-2 text-xs text-slate-600 dark:text-zinc-400">
                    <button
                      type="button"
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 0}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D9E1EC] dark:border-[#27272A] font-semibold hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] disabled:opacity-40 disabled:cursor-default cursor-pointer"
                    >
                      <CaretLeft size={13} /> Previous
                    </button>
                    <span>Page {currentPage + 1} of {pageCount}</span>
                    <button
                      type="button"
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage >= pageCount - 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D9E1EC] dark:border-[#27272A] font-semibold hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] disabled:opacity-40 disabled:cursor-default cursor-pointer"
                    >
                      Next <CaretRight size={13} />
                    </button>
                  </nav>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right-Side Chat & Synthesis Assistant Sidebar (Only in Feed & Canvas modes; Doc mode uses Doc Assistant) */}
        {workspaceMode !== 'reader' && (
          <ResearchieAISidebar
            isOpen={isAISidebarOpen}
            activeTab={aiSidebarTab}
            onClose={() => setIsAISidebarOpen(false)}
            onTabChange={(tab) => setAiSidebarTab(tab)}
            project={project}
            atoms={atoms}
            selectedAtoms={selectedAtomsList}
            onSaveAsNote={handleSaveSynthesis}
            projects={projects}
            onSelectAllAtoms={handleSelectAll}
            onClearSelection={() => setSelectedIds(new Set())}
            onOpenPdfReader={onOpenPdfReader}
          />
        )}
      </div>

      {/* Floating Action Button (Bottom Right) - Hidden in Doc Mode & Canvas Mode and hidden when sidebar is open */}
      {workspaceMode !== 'reader' && workspaceMode !== 'canvas' && !isAISidebarOpen && (
        <ResearchieAIFAB
          isOpen={isAISidebarOpen}
          clipCount={atoms.length}
          onOpenSidebar={(tab) => {
            setAiSidebarTab(tab);
            setIsAISidebarOpen(true);
          }}
          onToggleSidebar={() => setIsAISidebarOpen((prev) => !prev)}
        />
      )}

      {/* Export Project & Citations Modal (Feed Mode) */}
      <ExportProjectModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        atoms={atoms}
        selectedAtoms={selectedAtomsList}
      />

    </div>
  );
};
