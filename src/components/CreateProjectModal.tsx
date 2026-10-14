'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderSimple, TreeStructure } from '@phosphor-icons/react';
import { ResearchProject } from '@/lib/types/research';
import { ProjectIcon, PROJECT_SHAPES, DEFAULT_SHAPE } from './ProjectIcon';

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
  const [shape, setShape] = useState<string>(DEFAULT_SHAPE);
  const [parentId, setParentId] = useState<string | null>(initialParentId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setParentId(initialParentId || null);
    }
  }, [isOpen, initialParentId]);

  if (!isOpen) return null;

  // Available main projects to be selected as parent
  const availableParents = projects.filter((p) => p.id !== 'all' && !p.parentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        color_badge: color,
        folderIcon: shape,
        parentId: parentId || null,
      });
      setTitle('');
      setDescription('');
      setColor(COLOR_OPTIONS[0]);
      setShape(DEFAULT_SHAPE);
      setParentId(null);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl p-6 shadow-2xl animate-popIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#D2DCEA] dark:border-[#27272A] mb-4">
          <div className="flex items-center gap-2">
            <FolderSimple size={18} className="text-[#325FEC] dark:text-[#518FFF]" weight="bold" />
            <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">
              {parentId ? 'Create Nested Sub-Project' : 'Create Research Project'}
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
              Project Shape
            </label>
            <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Project shape">
              {PROJECT_SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={shape === s.id}
                  aria-label={s.label}
                  title={s.label}
                  onClick={() => setShape(s.id)}
                  className={`h-9 rounded-lg flex items-center justify-center text-[#0F172A] dark:text-white border transition-colors ${
                    shape === s.id
                      ? 'border-2 border-[#325FEC] dark:border-[#518FFF] bg-white dark:bg-[#18181B]'
                      : 'border-[#D2DCEA] dark:border-[#27272A] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20]'
                  }`}
                >
                  <ProjectIcon shape={s.id} color={color} seed={s.id} size={20} />
                </button>
              ))}
            </div>
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
