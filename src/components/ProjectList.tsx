'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  FolderSimple,
  FolderOpen,
  PuzzlePiece,
  Graph,
  ListDashes,
  BookOpen,
  SidebarSimple,
  CaretRight,
  CaretDown,
  House,
  TreeStructure,
  MagnifyingGlass,
  Gear,
  Trash,
  SlidersHorizontal,
  HardDrive
} from '@phosphor-icons/react';
import { ResearchProject, ResearchAtom } from '@/lib/types/research';
import { ThemeToggle } from './ThemeToggle';
import { ResearchieLogo } from './ResearchieLogo';
import { UserProfileButton } from './UserProfileButton';
import { ProjectAvatar } from './ProjectAvatar';
import { GetExtensionModal } from './GetExtensionModal';
import { useSettings } from '@/lib/settings/settingsContext';

interface ProjectListProps {
  projects: ResearchProject[];
  atoms?: ResearchAtom[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onOpenCreateModal: (parentId?: string) => void;
  onDeleteProject?: (id: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenExtensionGuide?: () => void;
  workspaceMode?: 'dashboard' | 'feed' | 'canvas' | 'reader';
  onWorkspaceModeChange?: (mode: 'dashboard' | 'feed' | 'canvas' | 'reader') => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  atoms = [],
  activeProjectId,
  onSelectProject,
  onOpenCreateModal,
  onDeleteProject,
  onOpenExtensionGuide,
  workspaceMode = 'feed',
  onWorkspaceModeChange,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [updatedProjectIds, setUpdatedProjectIds] = useState<Set<string>>(new Set());
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const previousAtomCountsRef = useRef<Record<string, number>>({});
  const { setIsSettingsModalOpen, calculateStorageUsage } = useSettings();

  // Track updates from plugin or backend polling
  useEffect(() => {
    projects.forEach((p) => {
      const prevCount = previousAtomCountsRef.current[p.id];
      if (prevCount !== undefined && (p.atomCount || 0) > prevCount && p.id !== activeProjectId) {
        setUpdatedProjectIds((prev) => new Set(prev).add(p.id));
      }
      previousAtomCountsRef.current[p.id] = p.atomCount || 0;
    });
  }, [projects, activeProjectId]);

  useEffect(() => {
    const handlePluginCapture = (e: any) => {
      const projId = e?.detail?.projectId || e?.data?.projectId;
      if (projId && projId !== activeProjectId) {
        setUpdatedProjectIds((prev) => new Set(prev).add(projId));
      }
    };
    window.addEventListener('researchie-plugin-capture', handlePluginCapture);
    window.addEventListener('message', handlePluginCapture);
    return () => {
      window.removeEventListener('researchie-plugin-capture', handlePluginCapture);
      window.removeEventListener('message', handlePluginCapture);
    };
  }, [activeProjectId]);

  const handleSelectProject = (id: string) => {
    setUpdatedProjectIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onSelectProject(id);
  };

  const storage = useMemo(() => calculateStorageUsage(atoms), [atoms, calculateStorageUsage]);

  // Group all main projects and sub-projects uniformly
  const { allParentProjects, subProjectsByParent } = useMemo(() => {
    const parentList: ResearchProject[] = [];
    const subMap = new Map<string, ResearchProject[]>();

    projects.forEach((p) => {
      if (p.id === 'all') return;
      const parentId = p.parentId || (p as any).parent_id;
      if (!parentId) {
        parentList.push(p);
      } else {
        const list = subMap.get(parentId) || [];
        list.push(p);
        subMap.set(parentId, list);
      }
    });

    const isShared = (p: ResearchProject) => p.role === 'editor' || p.role === 'viewer';
    return {
      allParentProjects: [...parentList.filter((p) => !isShared(p)), ...parentList.filter(isShared)],
      subProjectsByParent: subMap,
    };
  }, [projects]);

  // Filter projects by search query
  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return allParentProjects;
    const q = searchQuery.toLowerCase();
    return allParentProjects.filter((p) => {
      const matchParent = (p.title || '').toLowerCase().includes(q) || p.tags?.some((t) => t.toLowerCase().includes(q));
      const subProjects = subProjectsByParent.get(p.id) || [];
      const matchChild = subProjects.some((c) => (c.title || '').toLowerCase().includes(q) || c.tags?.some((t) => t.toLowerCase().includes(q)));
      return matchParent || matchChild;
    });
  }, [allParentProjects, subProjectsByParent, searchQuery]);

  const toggleFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const totalClips = useMemo(() => {
    if (atoms.length > 0) return atoms.length;
    return projects.reduce((acc, p) => acc + (p.atomCount || 0), 0);
  }, [atoms, projects]);

  // ─── Collapsed State Mini-Rail ─────────────────────────────────
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-[#FAFBFD] dark:bg-[#121214] border-r border-[#D2DCEA] dark:border-[#27272A] flex flex-col h-full flex-shrink-0 select-none items-center py-3 justify-between transition-all">
        {/* Top: Logo & Expand Button */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          <div
            onClick={() => onWorkspaceModeChange?.('dashboard')}
            className="w-8 h-8 rounded-xl bg-[#325FEC] flex items-center justify-center p-1.5 text-white shadow-xs cursor-pointer hover:scale-105 transition-transform"
            title="Go to Dashboard"
          >
            <ResearchieLogo className="w-full h-full text-white" />
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] transition-colors cursor-pointer"
            title="Expand Workspace Panel"
          >
            <SidebarSimple size={16} />
          </button>

          <div className="w-6 h-px bg-[#D2DCEA] dark:bg-[#27272A]" />

          {/* Project Icons */}
          {workspaceMode !== 'dashboard' && (
            <div className="flex flex-col items-center gap-1.5 max-h-[42vh] overflow-y-auto scrollbar-none w-full">
              {projects.filter((p) => p.id !== 'all' && !p.parentId).map((p) => {
                const isActive = activeProjectId === p.id;
                const kids = projects.filter((c) => c.parentId === p.id);
                return (
                  <React.Fragment key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelectProject(p.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isActive ? 'ring-2 ring-[#325FEC] dark:ring-[#518FFF] ring-offset-1 ring-offset-[#FAFBFD] dark:ring-offset-[#121214]' : 'hover:opacity-80'
                      }`}
                      title={`${p.title} (${p.atomCount || 0} clips)`}
                      aria-label={p.title}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <ProjectAvatar title={p.title} folderIcon={p.folderIcon} seed={p.id} color={p.color} size={32} />
                    </button>
                    {kids.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectProject(c.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          activeProjectId === c.id
                            ? 'ring-2 ring-[#325FEC] dark:ring-[#518FFF] ring-offset-1 ring-offset-[#FAFBFD] dark:ring-offset-[#121214]'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={`${p.title} / ${c.title} (${c.atomCount || 0} clips)`}
                        aria-label={c.title}
                      >
                        <ProjectAvatar title={c.title} folderIcon={c.folderIcon} seed={c.id} color={c.color} size={22} />
                      </button>
                    ))}
                  </React.Fragment>
                );
              })}

              <button
                type="button"
                onClick={() => onOpenCreateModal()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#325FEC] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] border border-dashed border-[#CBD5E1] dark:border-[#3F3F46] transition-colors cursor-pointer"
                title="New Stream (⌘N)"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Bottom: Modes, Settings & User */}
        <div className="flex flex-col items-center gap-2 w-full px-2">
          {/* Mode Icons - Only show when not on dashboard */}
          {workspaceMode !== 'dashboard' && onWorkspaceModeChange && (
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'feed' as const, icon: ListDashes },
                { id: 'canvas' as const, icon: Graph },
                { id: 'reader' as const, icon: BookOpen },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onWorkspaceModeChange(m.id)}
                    className={`p-1.5 rounded-lg transition-all ${
                      workspaceMode === m.id
                        ? 'bg-[#325FEC] text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20]'
                    }`}
                    title={m.id.charAt(0).toUpperCase() + m.id.slice(1)}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] transition-colors cursor-pointer"
            title="Settings (⌘,)"
          >
            <Gear size={16} />
          </button>
          <UserProfileButton isCollapsed={true} />
          <ThemeToggle />
        </div>
      </aside>
    );
  }

  // ─── Expanded Sidebar ──────────────────────────────────────────
  return (
    <aside className="w-full md:w-64 bg-[#FAFBFD] dark:bg-[#121214] border-r border-[#D2DCEA] dark:border-[#27272A] flex flex-col h-full flex-shrink-0 select-none transition-all">
      
      {/* Brand & Workspace Header */}
      <div className="px-4 py-3.5 border-b border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-between">
        <div
          onClick={() => onWorkspaceModeChange?.('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="Go to Dashboard"
        >
          <div className="w-7 h-7 rounded-xl bg-[#325FEC] flex items-center justify-center p-1.5 text-white shadow-xs group-hover:scale-105 transition-transform">
            <ResearchieLogo className="w-full h-full text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm tracking-tight text-[#0F172A] dark:text-white">
                researchie
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">stream architecture</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] transition-colors cursor-pointer"
            title="Collapse Sidebar"
          >
            <SidebarSimple size={15} />
          </button>
        </div>
      </div>

      {/* Stream Search & Quick Add */}
      <div className="px-3 pt-3 pb-1 space-y-2">
        <div className="relative flex items-center">
          <MagnifyingGlass size={13} className="absolute left-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search streams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] dark:focus:border-[#518FFF] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Workspaces ({filteredParents.length})
          </span>
          <button
            type="button"
            onClick={() => onOpenCreateModal()}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#325FEC] dark:text-[#518FFF] hover:underline cursor-pointer"
            title="Create New Stream (⌘N)"
          >
            <Plus size={11} weight="bold" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Streams & Folder Hierarchy Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin">
        {/* Project Tree */}
        {filteredParents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 px-3">
            {searchQuery ? 'No projects match your search.' : 'No research projects yet.'}
          </div>
        ) : (
          filteredParents.map((parent, parentIdx) => {
            const isSharedParent = parent.role === 'editor' || parent.role === 'viewer';
            const firstShared = isSharedParent && !filteredParents.slice(0, parentIdx).some((p) => p.role === 'editor' || p.role === 'viewer');
            const canManageParent = !isSharedParent;
            const isParentActive = workspaceMode !== 'dashboard' && activeProjectId === parent.id;
            const subProjects = subProjectsByParent.get(parent.id) || [];
            const hasSubProjects = subProjects.length > 0;
            const isFolderCollapsed = !searchQuery.trim() && collapsedFolderIds.has(parent.id);

            return (
              <React.Fragment key={parent.id}>
              {firstShared && (
                <div className="px-2.5 pt-3 pb-1 text-[10px] font-semibold tracking-wide uppercase text-slate-500 dark:text-zinc-400">Shared with me</div>
              )}
              <div className="space-y-1">
                {/* Parent Project Card Row */}
                <div
                  onClick={() => handleSelectProject(parent.id)}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                    isParentActive
                      ? 'bg-white dark:bg-[#18181B] text-[#0F172A] dark:text-white border border-[#325FEC] dark:border-[#518FFF] shadow-xs font-semibold'
                      : 'bg-transparent border border-transparent text-slate-800 dark:text-zinc-200 hover:bg-[#EEF3F8] dark:hover:bg-[#202024]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    {/* Folder Caret */}
                    {hasSubProjects ? (
                      <button
                        type="button"
                        onClick={(e) => toggleFolder(parent.id, e)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-black/10 transition-colors"
                        title={isFolderCollapsed ? 'Expand sub-projects' : 'Collapse sub-projects'}
                      >
                        {isFolderCollapsed ? <CaretRight size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />}
                      </button>
                    ) : (
                      <div className="w-3" />
                    )}

                    {/* Round Container with Initials */}
                    <ProjectAvatar title={parent.title} folderIcon={parent.folderIcon} seed={parent.id} color={parent.color} size={24} />

                    {/* Blue dot to the left of project name if updated from plugin */}
                    {updatedProjectIds.has(parent.id) && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#325FEC] dark:bg-[#518FFF] flex-shrink-0 animate-pulse"
                        title="New information updated from plugin"
                      />
                    )}

                    <span className="truncate font-medium">{parent.title}</span>
                  </div>

                  {/* Actions & Count */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isSharedParent && (
                      <span className="text-[9px] text-slate-500 dark:text-zinc-400">{parent.role === 'viewer' ? 'View' : 'Edit'}</span>
                    )}
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 group-hover:hidden">
                      {parent.atomCount || 0}
                    </span>

                    {/* Hover Quick Actions */}
                    <div className={`hidden ${canManageParent ? 'group-hover:flex' : ''} items-center gap-0.5`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCreateModal(parent.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/10 transition-colors"
                        title="Add Sub-project"
                      >
                        <Plus size={12} weight="bold" />
                      </button>
                      {onDeleteProject && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(parent.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-500/20 transition-colors"
                          title="Delete Project"
                        >
                          <Trash size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-Projects (Visual Tree with Guide Lines to the left, no dots) */}
                {!isFolderCollapsed && hasSubProjects && (
                  <div className="pl-3.5 space-y-1 ml-3 border-l-2 border-[#CBD5E1] dark:border-[#27272A]">
                    {subProjects.map((child) => {
                      const isChildActive = workspaceMode !== 'dashboard' && activeProjectId === child.id;
                      return (
                        <div
                          key={child.id}
                          onClick={() => handleSelectProject(child.id)}
                          className={`group flex items-center justify-between px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                            isChildActive
                              ? 'border border-[#325FEC] dark:border-[#518FFF] bg-transparent text-[#0F172A] dark:text-white font-semibold'
                              : 'text-slate-600 dark:text-zinc-400 hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center min-w-0 gap-1.5">
                            {updatedProjectIds.has(child.id) && (
                              <span
                                className="w-1 h-1 rounded-full bg-[#325FEC] dark:bg-[#518FFF] flex-shrink-0 animate-pulse"
                                title="New information updated from plugin"
                              />
                            )}
                            <ProjectAvatar title={child.title} folderIcon={child.folderIcon} seed={child.id} color={child.color} size={18} />
                            <span className="truncate" title={child.title}>{child.title}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[9px] font-mono px-1 rounded ${
                                isChildActive
                                    ? 'text-[#325FEC] dark:text-[#518FFF] font-semibold'
                                  : 'text-slate-400 dark:text-zinc-500 group-hover:hidden'
                              }`}
                            >
                              {child.atomCount || 0}
                            </span>
                            {onDeleteProject && canManageParent && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteProject(child.id);
                                }}
                                className="hidden group-hover:block p-0.5 text-slate-400 hover:text-red-600 rounded"
                                title="Delete Sub-project"
                              >
                                <Trash size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Footer Navigation Dock */}
      <div className="px-3.5 py-2.5 border-t border-[#D2DCEA] dark:border-[#27272A] bg-[#F4F6F9] dark:bg-[#09090B]/60 space-y-2">
        {/* Workspace Mode Switcher - Only show when a project is open (not on dashboard) */}
        {onWorkspaceModeChange && workspaceMode !== 'dashboard' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1 py-1">
              {[
                { id: 'feed' as const, label: 'Feed', icon: ListDashes },
                { id: 'canvas' as const, label: 'Canvas', icon: Graph },
                { id: 'reader' as const, label: 'Docs', icon: BookOpen },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = workspaceMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onWorkspaceModeChange(m.id)}
                    className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-xs font-sans transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EEF3F8] dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] font-semibold flex-1'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
                    }`}
                    title={m.label}
                  >
                    <Icon size={14} weight={isSelected ? 'bold' : 'regular'} />
                    {isSelected ? (
                      <span className="text-[11px] truncate">{m.label}</span>
                    ) : (
                      <span className="sr-only">{m.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* User Profile Pill */}
        <UserProfileButton isCollapsed={false} />

        {/* Utility Bar: Chrome Extension & Settings & Theme */}
        <div className="flex items-center justify-between pt-0.5">
          {onOpenExtensionGuide && (
            <button
              type="button"
              onClick={onOpenExtensionGuide}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-zinc-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] transition-colors cursor-pointer"
            >
              <PuzzlePiece size={13} className="text-[#325FEC]" />
              <span>Extension</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] transition-colors cursor-pointer"
              title="Workspace Settings (⌘,)"
            >
              <Gear size={14} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>
      <GetExtensionModal isOpen={extensionModalOpen} onClose={() => setExtensionModalOpen(false)} />
    </aside>
  );
};
