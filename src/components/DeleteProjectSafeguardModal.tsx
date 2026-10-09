'use client';

import React, { useState, useMemo } from 'react';
import { Warning, Trash, Archive, X, Check, ArrowRight, ShieldWarning, FolderSimple } from '@phosphor-icons/react';
import { ResearchProject, ResearchAtom } from '@/lib/types/research';

interface DeleteProjectSafeguardModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ResearchProject | null;
  subProjects?: ResearchProject[];
  atoms: ResearchAtom[];
  onConfirmDelete: (projectId: string, moveAtomsToUnfiled?: boolean) => void;
}

export const DeleteProjectSafeguardModal: React.FC<DeleteProjectSafeguardModalProps> = ({
  isOpen,
  onClose,
  project,
  subProjects = [],
  atoms,
  onConfirmDelete,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [strategy, setStrategy] = useState<'archive_clips' | 'hard_purge'>('archive_clips');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !project) return null;

  // Calculate affected atoms count
  const affectedAtoms = atoms.filter(
    (a) => a.projectId === project.id || subProjects.some((sp) => sp.id === a.projectId)
  );

  const isConfirmed =
    confirmationInput.trim().toLowerCase() === 'delete' ||
    confirmationInput.trim().toLowerCase() === project.title.toLowerCase();

  const handleExecute = () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    setTimeout(() => {
      onConfirmDelete(project.id, strategy === 'archive_clips');
      setIsDeleting(false);
      onClose();
      setConfirmationInput('');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-popIn">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldWarning size={20} weight="bold" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Delete Project
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Confirm deletion of {project.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs font-sans text-zinc-800 dark:text-zinc-200">
          <p className="text-sm">
            Are you sure you want to delete <span className="font-semibold text-zinc-950 dark:text-white">{project.title}</span>?
          </p>

          {/* Collapsible Details Disclosure */}
          {(affectedAtoms.length > 0 || subProjects.length > 0) && (
            <details className="group border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40 p-2.5">
              <summary className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer list-none select-none">
                <span className="flex items-center gap-1.5 text-xs">
                  <FolderSimple size={14} className="text-[#325FEC]" weight="fill" />
                  <span>Impact Details ({affectedAtoms.length} clips, {subProjects.length} sub-projects)</span>
                </span>
                <span className="text-[11px] text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                <p>• <strong>{affectedAtoms.length}</strong> total clips associated with this workspace</p>
                {subProjects.length > 0 && (
                  <p>• <strong>{subProjects.length}</strong> sub-projects ({subProjects.map(sp => sp.title).join(', ')})</p>
                )}
              </div>
            </details>
          )}

          {/* Retention Options */}
          <div className="space-y-2">
            <span className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Clips Retention:
            </span>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="strategy"
                  checked={strategy === 'archive_clips'}
                  onChange={() => setStrategy('archive_clips')}
                  className="accent-[#325FEC]"
                />
                <span className="text-xs">
                  <strong>Preserve clips:</strong> Move {affectedAtoms.length} clips to Global Feed
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                <input
                  type="radio"
                  name="strategy"
                  checked={strategy === 'hard_purge'}
                  onChange={() => setStrategy('hard_purge')}
                  className="accent-rose-600"
                />
                <span className="text-xs text-rose-600 dark:text-rose-400">
                  <strong>Delete all:</strong> Permanently erase project and clips
                </span>
              </label>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
            <label className="block text-[11px] text-zinc-600 dark:text-zinc-400">
              Type <strong className="text-rose-600 dark:text-rose-400 font-mono">delete</strong> or <strong className="text-zinc-900 dark:text-white font-mono">"{project.title}"</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type delete to confirm"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:border-rose-500 rounded-xl text-xs font-mono text-zinc-900 dark:text-white outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!isConfirmed || isDeleting}
            onClick={handleExecute}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all shadow-xs ${
              isConfirmed && !isDeleting
                ? strategy === 'archive_clips'
                  ? 'bg-[#325FEC] hover:bg-[#274AC4]'
                  : 'bg-rose-600 hover:bg-rose-700'
                : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 cursor-not-allowed'
            }`}
          >
            {isDeleting ? 'Deleting...' : strategy === 'archive_clips' ? 'Delete Project (Keep Clips)' : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
