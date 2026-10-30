'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash, DotsThree, PencilSimple } from '@phosphor-icons/react';
import type { ResearchProject } from '@/lib/types/research';

// What is inside a project folder, as a plain list: the main project, its sub-projects as a tree, and sub-projects
// added in the last 24 hours under a line. Double-click a name to rename it. The three dots open Rename and Delete.
// Delete goes through the same safeguard as every other project delete (the page owns that dialog).

interface Props {
  folder: ResearchProject;
  subProjects: ResearchProject[];
  /** False for a shared folder the person cannot change: no add, rename or delete. */
  canManage: boolean;
  onOpenProject: (projectId: string) => void;
  onDeleteProject?: (projectId: string) => void;
  /** Saves a new name. Throws when the server refuses, and the row goes back to its old name. */
  onRenameProject?: (projectId: string, title: string) => Promise<void>;
  /** Opens the new sub-project form for this folder. */
  onAddSubProject?: () => void;
  onClose: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const createdAt = (p: ResearchProject): number => Date.parse(p.createdAt || p.created_at || '') || 0;

interface RowProps {
  project: ResearchProject;
  isMain: boolean;
  canManage: boolean;
  onOpen: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  onRename?: (projectId: string, title: string) => Promise<void>;
  onClose: () => void;
}

// One line of the list. Double-click the name to edit it in place; the three dots hold Rename and Delete.
const FolderRow: React.FC<RowProps> = ({ project: p, isMain, canManage, onOpen, onDelete, onRename, onClose }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canEdit = canManage && !!onRename;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // The menu closes on a click anywhere else.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const startEdit = () => {
    setMenuOpen(false);
    setDraft(p.title);
    setEditing(true);
  };

  const finish = async (save: boolean) => {
    setEditing(false);
    const next = draft.trim();
    if (!save || !next || next === p.title || !onRename) {
      setDraft(p.title);
      return;
    }
    try {
      await onRename(p.id, next);
    } catch {
      setDraft(p.title);
    }
  };

  return (
    <div
      data-testid={isMain ? 'folder-main-row' : 'folder-sub-row'}
      className="group flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors duration-200"
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          aria-label={`Rename ${p.title}`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void finish(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void finish(true);
            if (e.key === 'Escape') void finish(false);
          }}
          className={`min-w-0 flex-1 px-1.5 py-0.5 rounded bg-white dark:bg-[#18181B] border border-[#325FEC] dark:border-[#518FFF] text-[#0F172A] dark:text-white focus:outline-none ${isMain ? 'text-[13px] font-semibold' : 'text-[13px]'}`}
        />
      ) : (
        <span
          className={`min-w-0 flex-1 truncate text-[#0F172A] dark:text-white ${isMain ? 'text-[13px] font-semibold' : 'text-[13px]'} ${canEdit ? 'cursor-text' : ''}`}
          title={canEdit ? `${p.title} (double-click to rename)` : p.title}
          onDoubleClick={() => canEdit && startEdit()}
        >
          {p.title}
        </span>
      )}
      <span className="flex-shrink-0 text-[11px] text-slate-500 dark:text-zinc-500">{(p.atomCount || 0) === 1 ? '1 clip' : `${p.atomCount || 0} clips`}</span>

      {canManage && (onRename || onDelete) && (
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`More for ${p.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="More"
            className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors duration-200"
          >
            <DotsThree size={16} weight="bold" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-1 z-10 min-w-[9rem] p-1 rounded-lg border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#18181B] shadow-lg text-xs">
              {onRename && (
                <button type="button" role="menuitem" onClick={startEdit} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-slate-700 dark:text-zinc-200 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] cursor-pointer">
                  <PencilSimple size={13} />
                  <span>Rename</span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onClose();
                    onDelete(p.id);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                >
                  <Trash size={13} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onOpen(p.id);
          onClose();
        }}
        className="flex-shrink-0 h-6 px-2.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[11px] font-medium cursor-pointer transition-colors duration-200"
      >
        Open
      </button>
    </div>
  );
};

export const FolderContentsModal: React.FC<Props> = ({
  folder,
  subProjects,
  canManage,
  onOpenProject,
  onDeleteProject,
  onRenameProject,
  onAddSubProject,
  onClose,
}) => {
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

  const row = (p: ResearchProject, isMain: boolean) => (
    <FolderRow
      key={p.id}
      project={p}
      isMain={isMain}
      canManage={canManage}
      onOpen={onOpenProject}
      onDelete={canManage ? onDeleteProject : undefined}
      onRename={canManage ? onRenameProject : undefined}
      onClose={onClose}
    />
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
          {row(folder, true)}

          <h3 className={`${sectionTitle} mt-5`}>Sub-projects</h3>
          {tree.length === 0 ? (
            <p className="px-2 text-xs text-slate-500 dark:text-zinc-500">No sub-projects yet.</p>
          ) : (
            <ul className="ml-2 space-y-0.5 border-l border-[#D2DCEA] dark:border-[#27272A] pl-5">
              {tree.map((sp) => (
                <li key={sp.id} className="relative">
                  <span aria-hidden className="absolute -left-5 top-1/2 w-4 h-px bg-[#D2DCEA] dark:bg-[#27272A]" />
                  {row(sp, false)}
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
                  <li key={sp.id}>{row(sp, false)}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Bottom: what the buttons do */}
        <p className="px-5 py-2.5 border-t border-[#D2DCEA] dark:border-[#27272A] text-[11px] leading-relaxed text-slate-500 dark:text-zinc-500">
          Open goes into that project. Double-click a name to rename it. The three dots hold Rename and Delete. Each sub-project keeps its own clips.
        </p>
      </div>
    </div>
  );
};
