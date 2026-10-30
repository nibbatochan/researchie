'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderSimple, TreeStructure } from '@phosphor-icons/react';
import { ResearchProject } from '@/lib/types/research';

// How a project shows in the sidebar: its initials or a photo.
// Stored in folderIcon as 'initials' or 'photo:<data URL>'.
type AvatarMode = 'initials' | 'photo';

import { AvatarPicker } from './AvatarPicker';

interface CreateProjectModalProps {
  isOpen: boolean;
  projects?: ResearchProject[];
  initialParentId?: string | null;
  onClose: () => void;
  onCreate: (project: { 
    title: string; 
    description: string; 
    color_badge: string;
    folderIcon?: string;
    parentId?: string | null;
  }) => Promise<void>;
}

const COLOR_OPTIONS = [
  '#325FEC', // Royal Blue (Brand Primary)
  '#518FFF', // Electric Cyan
  '#10B981', // Emerald
  '#0D9488', // Teal
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  projects = [],
  initialParentId = null,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('initials');
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setParentId(initialParentId || null);
    }
  }, [isOpen, initialParentId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Available main projects to be selected as parent
  const availableParents = projects.filter((p) => p.id !== 'all' && !p.parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const folderIcon =
      avatarMode === 'photo' && avatarPhoto
        ? `photo:${avatarPhoto}`
        : 'initials';
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        color_badge: color,
        folderIcon,
        parentId: parentId || null,
      });
      setTitle('');
      setDescription('');
      setColor(COLOR_OPTIONS[0]);
      setAvatarMode('initials');
      setAvatarPhoto(null);
      setParentId(null);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl p-6 shadow-2xl animate-popIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D2DCEA] dark:border-[#27272A] mb-4">
          <div className="flex items-center gap-2">
            <FolderSimple size={18} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
            <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">
              {parentId ? 'Create nested sub-project' : 'Create new research project'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Parent Folder Hierarchy Selector */}
          <div>
            <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase flex items-center gap-1">
              <TreeStructure size={13} className="text-[#325FEC]" />
              <span>Project Folder Location</span>
            </label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value ? e.target.value : null)}
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#325FEC] transition-colors"
            >
              <option value="">📁 Root Folder (Main Project Umbrella)</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  ↳ Nested under: {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
              {parentId ? 'Sub-Project Title *' : 'Project Title *'}
            </label>
            <input
              type="text"
              required
              placeholder={parentId ? 'e.g. AI Ethics & Modulation' : 'e.g. Artificial Intelligence & RAG'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-sm text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#325FEC] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
              Description / Research Focus
            </label>
            <textarea
              rows={2}
              placeholder="What core questions or hypotheses will this workspace investigate?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-xs text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#325FEC] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-2 uppercase">
              Avatar
            </label>
            <div className="flex items-center gap-2 mb-3" role="radiogroup" aria-label="Avatar type">
              {(['initials', 'photo'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={avatarMode === m}
                  onClick={() => setAvatarMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    avatarMode === m
                      ? 'border-[#325FEC] dark:border-[#518FFF] bg-white dark:bg-[#18181B] text-[#0F172A] dark:text-white'
                      : 'border-[#D2DCEA] dark:border-[#27272A] text-slate-500 dark:text-zinc-400 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20]'
                  }`}
                >
                  {m === 'initials' ? 'Initials' : 'Profile pic'}
                </button>
              ))}
            </div>

            <AvatarPicker mode={avatarMode} title={title} color={color} photo={avatarPhoto} onPhoto={setAvatarPhoto} />
            {avatarMode === 'initials' && (
              <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
                Shows the first two letters of the name in the folder colour, on a plain circle.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-2 uppercase">
              Folder Color Accent
            </label>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-[#325FEC] ring-offset-2 ring-offset-white dark:ring-offset-[#121214]' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D2DCEA] dark:border-[#27272A] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-5 py-2 text-xs font-display font-semibold text-white bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 rounded-xl transition-colors shadow-sm"
            >
              {loading ? 'Creating...' : parentId ? 'Create Sub-Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
