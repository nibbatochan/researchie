'use client';

import React, { useEffect } from 'react';
import { X, Plus, Trash } from '@phosphor-icons/react';
import type { ResearchProject } from '@/lib/types/research';

// What is inside a project folder, as a plain list: the main project, its sub-projects as a tree, and sub-projects
// added in the last 24 hours under a line. Add sub project and Close sit at the top. Delete goes through the same
// safeguard as every other project delete (the page owns that dialog); it shows on hover only.

interface Props {
  folder: ResearchProject;
  subProjects: ResearchProject[];
  /** False for a shared folder the person cannot change: no add, no delete. */
  canManage: boolean;
  onOpenProject: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => void;
  /** Opens the new sub-project form for this folder. */
  onAddSubProject?: () => void;
  onClose: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const createdAt = (p: ResearchProject): number => Date.parse(p.createdAt || p.created_at || '') || 0;

export const FolderContentsModal: React.FC<Props> = ({ folder, subProjects, canManage, onOpenProject, onDeleteProject, onAddSubProject, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cutoff = Date.now() - DAY_MS;
  const tree = subProjects.filter((p) => createdAt(p) < cutoff);
  const fresh = subProjects.filter((p) => createdAt(p) >= cutoff);
  const clips = (n: number) => `${n} ${n === 1 ? 'clip' : 'clips'}`;

  // One line of the list. Open is small; delete appears on hover.
  const line = (p: ResearchProject, isMain: boolean) => (
    <div
      data-testid={isMain ? 'folder-main-row' : 'folder-sub-row'}
      className="group flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-200"
    >
      <span className={`min-w-0 flex-1 truncate text-[#0F172A] dark:text-white ${isMain ? 'text-[13px] font-semibold' : 'text-[13px]'}`} title={p.title}>
        {p.title}
      </span>
      <span className="flex-shrink-0 text-[11px] text-slate-500 dark:text-zinc-500">{clips(p.atomCount || 0)}</span>
      {canManage && onDeleteProject && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onDeleteProject(p.id);
          }}
          aria-label={`Delete ${p.title}`}
          title={`Delete ${p.title}`}
          className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer transition-opacity duration-200"
        >
          <Trash size={14} />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onOpenProject(p.id);
          onClose();
        }}
        className="flex-shrink-0 h-6 px-2.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[11px] font-medium cursor-pointer transition-colors duration-200"
      >
        Open
      </button>
    </div>
  );

  const sectionTitle = 'mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Contents of ${folder.title}`}
        data-testid="folder-contents-modal"
        className="animate-popIn w-full md:w-[60vw] md:min-w-[40rem] max-w-5xl h-[75vh] min-h-[32rem] max-h-[88vh] flex flex-col rounded-2xl bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] shadow-xl overflow-hidden"
      >
        {/* Top: the folder name, Add sub project, and Close */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#D2DCEA] dark:border-[#27272A]">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#325FEC] dark:text-[#518FFF]">Project folder</p>
            <h2 className="font-display font-semibold text-sm text-[#0F172A] dark:text-white truncate">{folder.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canManage && onAddSubProject && (
              <button
                type="button"
                onClick={onAddSubProject}
                data-testid="folder-add-subproject"
                className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-[#325FEC] hover:bg-[#274AC4] text-white text-[11px] font-semibold cursor-pointer transition-colors duration-200"
              >
                <Plus size={10} weight="bold" />
                <span>Add sub project</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors duration-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* The list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h3 className={sectionTitle}>Main project</h3>
          {line(folder, true)}

          <h3 className={`${sectionTitle} mt-5`}>Sub-projects</h3>
          {tree.length === 0 ? (
            <p className="px-2 text-xs text-slate-500 dark:text-zinc-500">No sub-projects yet.</p>
          ) : (
            <ul className="ml-2 space-y-0.5 border-l border-[#D2DCEA] dark:border-[#27272A] pl-5">
              {tree.map((sp) => (
                <li key={sp.id} className="relative">
                  <span aria-hidden className="absolute -left-5 top-1/2 w-4 h-px bg-[#D2DCEA] dark:bg-[#27272A]" />
                  {line(sp, false)}
                </li>
              ))}
            </ul>
          )}

          {fresh.length > 0 && (
            <>
              <hr className="my-4 border-t border-[#D2DCEA] dark:border-[#27272A]" />
              <h3 className={sectionTitle}>New in the last 24 hours</h3>
              <ul className="space-y-0.5">
                {fresh.map((sp) => (
                  <li key={sp.id}>{line(sp, false)}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Bottom: what the buttons do */}
        <p className="px-5 py-2.5 border-t border-[#D2DCEA] dark:border-[#27272A] text-[11px] leading-relaxed text-slate-500 dark:text-zinc-500">
          Open goes into that project. Each sub-project keeps its own clips. Hover a row to see its delete button. Add sub project creates a new sub-project in this folder.
        </p>
      </div>
    </div>
  );
};
