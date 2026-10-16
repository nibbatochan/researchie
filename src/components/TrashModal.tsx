'use client';

import React from 'react';
import { Trash, ArrowCounterClockwise, X, FileText, Quotes, Code, Image as ImageIcon, LinkSimple, ShieldCheck } from '@phosphor-icons/react';
import { ResearchAtom } from '@/lib/types/research';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedAtoms: { atom: ResearchAtom; deletedAt: string }[];
  onRestoreAtom: (atom: ResearchAtom) => void;
  onPermanentlyDeleteAtom?: (atomId: string) => void;
  onEmptyTrash?: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  deletedAtoms,
  onRestoreAtom,
  onPermanentlyDeleteAtom,
  onEmptyTrash,
}) => {
  if (!isOpen) return null;

  const getAtomIcon = (type: string) => {
    switch (type) {
      case 'quote':
      case 'text':
        return Quotes;
      case 'block':
        return Code;
      case 'image':
        return ImageIcon;
      case 'link':
        return LinkSimple;
      case 'note':
      default:
        return FileText;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-popIn">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#EEF3F8] dark:bg-[#18181B] border-b border-[#D9E1EC] dark:border-[#27272A]">
          <div className="flex items-center gap-2">
            <Trash size={18} className="text-red-500" weight="bold" />
            <h3 className="font-display font-bold text-sm text-[#0F172A] dark:text-white">
              Recently Deleted Clips ({deletedAtoms.length})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {deletedAtoms.length > 0 && onEmptyTrash && (
              <button
                type="button"
                onClick={onEmptyTrash}
                className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                Empty Trash
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {deletedAtoms.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-zinc-500 space-y-2">
              <Trash size={32} className="mx-auto opacity-40" />
              <p className="text-xs font-sans">Trash is empty. No deleted clips in buffer.</p>
            </div>
          ) : (
            deletedAtoms.map(({ atom, deletedAt }) => {
              const Icon = getAtomIcon(atom.type);
              const previewText =
                atom.content.text ||
                atom.content.rawText ||
                atom.content.description ||
                atom.title ||
                'Untitled Clip';

              return (
                <div
                  key={atom.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF3F8] dark:bg-[#27272A] flex items-center justify-center flex-shrink-0">
                      <Icon size={16} className="text-[#325FEC] dark:text-[#518FFF]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-[#0F172A] dark:text-white truncate">
                        {atom.title || previewText.slice(0, 50)}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                        <span className="capitalize">{atom.type}</span>
                        <span>•</span>
                        <span>Deleted {new Date(deletedAt).toLocaleTimeString()}</span>
                        {atom.metadata?.sourceUrl && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">
                              {new URL(atom.metadata.sourceUrl).hostname}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onRestoreAtom(atom)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-[#325FEC] dark:text-[#518FFF] hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
                      title="Restore clip"
                    >
                      <ArrowCounterClockwise size={13} weight="bold" />
                      <span>Restore</span>
                    </button>

                    {onPermanentlyDeleteAtom && (
                      <button
                        type="button"
                        onClick={() => onPermanentlyDeleteAtom(atom.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Permanently purge"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#EEF3F8] dark:bg-[#18181B] border-t border-[#D9E1EC] dark:border-[#27272A] flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} weight="bold" className="text-[#325FEC] dark:text-[#518FFF]" /><span>Soft-deleted items are safely stored in your session buffer.</span></span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#FAFBFD] dark:bg-[#27272A] text-slate-700 dark:text-zinc-200 border border-[#D9E1EC] dark:border-transparent transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
