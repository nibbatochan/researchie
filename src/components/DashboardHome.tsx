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
  ShareNetwork
} from '@phosphor-icons/react';
import { ResearchProject, ResearchAtom } from '@/lib/types/research';

interface DashboardHomeProps {
  projects: ResearchProject[];
  atoms: ResearchAtom[];
  onSelectProject: (projectId: string, mode?: 'feed' | 'canvas' | 'reader') => void;
  onOpenCreateModal: (parentId?: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onOpenDocuments?: () => void;
  onOpenShareModal?: (project: ResearchProject) => void;
}

// ─── Hero Banner Graphic Illustration in Design System Style ─────────
export const DashboardHeroIllustration: React.FC<{ className?: string }> = ({ 
  className = 'w-36 h-28' 
}) => (
  <svg 
    viewBox="0 0 160 110" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
    aria-hidden="true"
  >
    {/* Base Soft Platform Shadow */}
    <ellipse cx="80" cy="98" rx="65" ry="7" fill="#CBD5E1" fillOpacity="0.35" className="dark:fill-black dark:fill-opacity-50" />
    
    {/* Back Research Document Sheet */}
    <rect x="30" y="16" width="56" height="74" rx="6" fill="#FAFBFD" className="dark:fill-[#18181B]" stroke="#D2DCEA" strokeWidth="1.5" />
    <path d="M40 30H72" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" className="dark:stroke-[#3F3F46]" />
    <path d="M40 38H78" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" className="dark:stroke-[#3F3F46]" />
    <path d="M40 46H66" stroke="#325FEC" strokeWidth="2" strokeLinecap="round" />

    {/* Primary Folder Stack */}
    <path 
      d="M48 34C48 30.6863 50.6863 28 54 28H70.5858C72.1771 28 73.7033 28.6321 74.8284 29.7574L78.2426 33.1716C79.3677 34.2967 80.8939 34.9289 82.4853 34.9289H118C121.314 34.9289 124 37.6152 124 40.9289V84C124 87.3137 121.314 90 118 90H54C50.6863 90 48 87.3137 48 84V34Z" 
      fill="#325FEC" 
      fillOpacity="0.12" 
      stroke="#325FEC" 
      strokeWidth="2" 
      strokeLinejoin="round" 
    />
    
    {/* Inner Paper Sheet in Folder */}
    <rect x="56" y="38" width="58" height="42" rx="4" fill="#FAFBFD" className="dark:fill-[#202024]" stroke="#D2DCEA" strokeWidth="1.5" />
    <path d="M64 48H96" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" className="dark:stroke-[#3F3F46]" />
    <path d="M64 55H88" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round" className="dark:stroke-[#3F3F46]" />

    {/* Front Folder Lip */}
    <path 
      d="M44 48C44 44.6863 46.6863 42 50 42H124C127.314 42 130 44.6863 130 48V84C130 87.3137 127.314 90 124 90H50C46.6863 90 44 87.3137 44 84V48Z" 
      fill="#FAFBFD" 
      className="dark:fill-[#121214]" 
      stroke="#325FEC" 
      strokeWidth="2" 
      strokeLinejoin="round" 
    />

    {/* Floating Evidence Badge */}
    <rect x="20" y="56" width="30" height="18" rx="4" fill="#EEF3F8" className="dark:fill-[#18181B]" stroke="#D2DCEA" strokeWidth="1.2" />
    <path d="M26 65H44" stroke="#325FEC" strokeWidth="2" strokeLinecap="round" />
    <circle cx="106" cy="66" r="10" fill="#325FEC" />
    <path d="M102 66L105 69L111 63" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

  return (
    <div className="flex-1 overflow-y-auto bg-[#EAEEF4] dark:bg-[#09090B] text-[#0F172A] dark:text-[#FAFAFA] transition-colors p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* ─── TOP HERO: UNBOXED, LEFT-ALIGNED (120px Top Padding) ── */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 pt-[120px] pb-1">
          {/* Illustration First */}
          <div className="flex-shrink-0 flex items-center justify-start">
            <DashboardHeroIllustration className="w-32 h-24 md:w-40 md:h-28" />
          </div>

          {/* Hero Content Next */}
          <div className="space-y-2 max-w-2xl flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#325FEC] dark:text-[#518FFF] font-semibold">
                Research Workspace Hub
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-[#0F172A] dark:text-white tracking-tight">
              Welcome back to your Knowledge Engine
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
              Organize your research in hierarchical project folders, capture evidence clips across the web, and synthesize multi-document findings.
            </p>

            <div className="pt-1.5 flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => onOpenCreateModal()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-[#325FEC] hover:bg-[#274AC4] text-white shadow-sm transition-all cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>New Project Folder</span>
              </button>

              {onOpenDocuments && (
                <button
                  type="button"
                  onClick={onOpenDocuments}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-[#FAFBFD] dark:bg-[#121214] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] text-slate-700 dark:text-zinc-200 border border-[#D2DCEA] dark:border-[#27272A] shadow-xs transition-all cursor-pointer"
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
                  Recently accessed
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
                        <div className="flex items-center gap-1.5 min-w-0">
                          {parentTitle ? (
                            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 truncate flex items-center gap-1">
                              <FolderSimple size={12} weight="bold" className="text-[#325FEC] dark:text-[#518FFF] flex-shrink-0" />
                              <span>{parentTitle}</span>
                              <span>/</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase flex items-center gap-1">
                              <FolderSimple size={12} weight="bold" className="text-slate-400 dark:text-zinc-500 flex-shrink-0" />
                              <span>Main Project</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 flex-shrink-0">
                          {formatRelativeTime(p.lastAccessedAt || p.updatedAt)}
                        </span>
                      </div>

                      <h3 className="font-display font-semibold text-sm text-[#0F172A] dark:text-white group-hover:text-[#325FEC] dark:group-hover:text-[#518FFF] transition-colors line-clamp-1">
                        {p.title}
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
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

          {/* 3 Cards Per Row Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMainProjects.map((mainProj) => {
              const subProjects = subProjectsByParent.get(mainProj.id) || [];
              const totalFolderAtoms = (mainProj.atomCount || 0) + subProjects.reduce((sum, sp) => sum + (sp.atomCount || 0), 0);

              return (
                <div
                  key={mainProj.id}
                  className="bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] hover:border-[#325FEC]/60 dark:hover:border-[#518FFF]/60 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between group relative"
                >
                  {/* Top: Folder Illustration, Project Info & Delete Button */}
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <FolderIllustration color={mainProj.color || '#325FEC'} className="w-14 h-14 flex-shrink-0" />
                      
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-[#EEF3F8] dark:bg-[#18181B] text-slate-600 dark:text-zinc-400 border border-[#D2DCEA] dark:border-[#27272A]">
                          {subProjects.length} sub-projects
                        </span>

                        {onOpenShareModal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenShareModal(mainProj);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#325FEC] dark:hover:text-[#518FFF] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                            title={`Share ${mainProj.title}`}
                          >
                            <ShareNetwork size={14} />
                          </button>
                        )}

                        {onDeleteProject && !mainProj.role?.match(/^(editor|viewer)$/) && (
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

                    <div className="space-y-1">
                      <h3
                        onClick={() => onSelectProject(mainProj.id, 'feed')}
                        className="font-display font-bold text-base text-[#0F172A] dark:text-white group-hover:text-[#325FEC] dark:group-hover:text-[#518FFF] cursor-pointer transition-colors line-clamp-1"
                      >
                        {mainProj.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {mainProj.description || 'Main research project folder.'}
                      </p>
                    </div>

                    {/* Sub-Projects Preview (Scrollable if many) */}
                    <div className="pt-2 border-t border-[#D2DCEA]/50 dark:border-[#27272A] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        <span>Sub-Projects Preview</span>
                        <span>{totalFolderAtoms} clips</span>
                      </div>

                      {subProjects.length === 0 ? (
                        <div className="py-2 text-center text-xs text-slate-400 dark:text-zinc-500 italic">
                          No sub-projects yet
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {subProjects.map((sp) => (
                            <div
                              key={sp.id}
                              data-testid="subproject-card"
                              onClick={() => onSelectProject(sp.id, 'feed')}
                              className="flex items-center justify-between p-2 rounded-xl bg-[#EEF3F8]/60 hover:bg-[#EEF3F8] dark:bg-[#18181B]/60 dark:hover:bg-[#1C1C20] border border-[#D2DCEA]/60 dark:border-[#27272A] cursor-pointer transition-colors text-xs"
                            >
                              <span className="font-medium text-[#0F172A] dark:text-zinc-200 truncate pr-2">
                                {sp.title}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 flex-shrink-0">
                                {sp.atomCount || 0} clips
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-[#D2DCEA]/60 dark:border-[#27272A] flex items-center justify-between gap-2">
                    {!mainProj.role?.match(/^(editor|viewer)$/) ? (
                    <button
                      onClick={() => onOpenCreateModal(mainProj.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans font-medium bg-[#EEF3F8] hover:bg-[#E2EAF4] dark:bg-[#18181B] dark:hover:bg-[#222226] text-slate-700 dark:text-zinc-300 border border-[#D2DCEA] dark:border-[#27272A] transition-colors cursor-pointer"
                      title="Add a sub-project"
                    >
                      <Plus size={13} weight="bold" />
                        <span>Sub-Project</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">{mainProj.role === 'viewer' ? 'Can view' : 'Can edit'}</span>
                    )}

                      <button
                        onClick={() => onSelectProject(mainProj.id, 'feed')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans font-semibold bg-[#325FEC] hover:bg-[#274AC4] text-white transition-all shadow-xs cursor-pointer"
                      >
                        <span>Open Folder</span>
                        <ArrowRight size={12} weight="bold" />
                      </button>
                    </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};
