'use client';

import React, { useState, useMemo } from 'react';
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
  const { setIsSettingsModalOpen, calculateStorageUsage } = useSettings();

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

    return {
      allParentProjects: parentList,
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

          {/* Dashboard Home Icon */}
          <button
            type="button"
            onClick={() => onWorkspaceModeChange?.('dashboard')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all cursor-pointer ${
              workspaceMode === 'dashboard'
                ? 'bg-[#325FEC] text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20]'
            }`}
            title="Dashboard Hub"
          >
            <House size={16} weight="bold" />
          </button>

          <div className="w-6 h-px bg-[#D2DCEA] dark:bg-[#27272A]" />

          {/* Project Icons */}
          {workspaceMode !== 'dashboard' && (
            <div className="flex flex-col items-center gap-1.5 max-h-[42vh] overflow-y-auto scrollbar-none w-full">
              {projects.filter((p) => p.id !== 'all').map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProject(p.id)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all cursor-pointer ${
                    activeProjectId === p.id
                      ? 'bg-[#325FEC] text-white shadow-xs scale-105'
                      : 'text-slate-700 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] border border-[#D2DCEA] dark:border-[#27272A]'
                  }`}
                  style={{
                    borderLeftColor: activeProjectId === p.id ? undefined : p.color,
                    borderLeftWidth: activeProjectId === p.id ? undefined : '3px',
                  }}
                  title={`${p.title} (${p.atomCount || 0} clips)`}
                >
                  {p.title.charAt(0).toUpperCase()}
                </button>
              ))}

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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Cloud Engine Live" />
            </div>
            <span className="text-[10px] font-mono text-slate-400 block -mt-0.5">stream architecture</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] transition-colors cursor-pointer"
          title="Collapse Sidebar"
        >
          <SidebarSimple size={15} />
        </button>
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
          filteredParents.map((parent) => {
            const isParentActive = activeProjectId === parent.id;
            const subProjects = subProjectsByParent.get(parent.id) || [];
            const hasSubProjects = subProjects.length > 0;
            const isFolderCollapsed = !searchQuery.trim() && collapsedFolderIds.has(parent.id);

            return (
              <div key={parent.id} className="space-y-1">
                {/* Parent Project Card Row */}
                <div
                  onClick={() => onSelectProject(parent.id)}
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

                    {/* Common Blue Folder Icon */}
                    <div className="relative flex items-center justify-center flex-shrink-0">
                      {isFolderCollapsed ? (
                        <FolderSimple size={15} weight="fill" className="text-[#325FEC] dark:text-[#518FFF]" />
                      ) : (
                        <FolderOpen size={15} weight="fill" className="text-[#325FEC] dark:text-[#518FFF]" />
                      )}
                    </div>

                    <span className="truncate font-medium">{parent.title}</span>
                  </div>

                  {/* Actions & Count */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 group-hover:hidden">
                      {parent.atomCount || 0}
                    </span>

                    {/* Hover Quick Actions */}
                    <div className="hidden group-hover:flex items-center gap-0.5">
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
                      const isChildActive = activeProjectId === child.id;
                      return (
                        <div
                          key={child.id}
                          onClick={() => onSelectProject(child.id)}
                          className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                            isChildActive
                              ? 'border border-[#325FEC] dark:border-[#518FFF] bg-transparent text-[#0F172A] dark:text-white font-semibold'
                              : 'text-slate-700 dark:text-zinc-300 hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <div className="flex items-center min-w-0">
                            <span className="truncate">{child.title}</span>
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
                            {onDeleteProject && (
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
            );
          })
        )}
      </div>

      {/* Footer Navigation Dock */}
      <div className="px-3.5 py-2.5 border-t border-[#D2DCEA] dark:border-[#27272A] bg-[#F4F6F9] dark:bg-[#09090B]/60 space-y-2">
        {/* Workspace Mode Switcher */}
        {onWorkspaceModeChange && (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-1 p-1 rounded-xl bg-[#EEF3F8] dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A]">
              {[
                { id: 'dashboard' as const, label: 'Dashboard', icon: House },
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
                        ? 'bg-[#FAFBFD] dark:bg-[#121214] text-[#325FEC] dark:text-[#518FFF] shadow-xs font-semibold flex-1'
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
    </aside>
  );
};
