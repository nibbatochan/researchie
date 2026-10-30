'use client';

import React, { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import type { ResearchProject } from '@/lib/types/research';
import { AvatarPicker } from './AvatarPicker';
import { ProjectAvatar } from './ProjectAvatar';
import { PROJECT_SHAPES, ProjectIcon } from './ProjectIcon';

// Settings of one project folder: its name and its avatar (initials, a shape, or a photo). The folder colour is set
// when the project is created and stays the same.

type Mode = 'initials' | 'icon' | 'photo';

const modeOf = (folderIcon?: string | null): Mode =>
  folderIcon?.startsWith('photo:') ? 'photo' : folderIcon?.startsWith('icon:') ? 'icon' : 'initials';

export interface ProjectSettingsPatch {
  title?: string;
  folderIcon?: string | null;
}

interface Props {
  project: ResearchProject | null;
  onSave: (projectId: string, patch: ProjectSettingsPatch) => Promise<void>;
  onClose: () => void;
}

export const ProjectSettingsModal: React.FC<Props> = ({ project, onSave, onClose }) => {
  if (!project) return null;
  // Keyed by project, so opening another one starts from its own values.
  return <Form key={project.id} project={project} onSave={onSave} onClose={onClose} />;
};

const Form: React.FC<{ project: ResearchProject; onSave: Props['onSave']; onClose: () => void }> = ({ project, onSave, onClose }) => {
  const color = project.color || '#325FEC';
  const [title, setTitle] = useState(project.title);
  const [mode, setMode] = useState<Mode>(modeOf(project.folderIcon));
  const [shape, setShape] = useState(project.folderIcon?.startsWith('icon:') ? project.folderIcon.slice(5) : 'square');
  const [photo, setPhoto] = useState<string | null>(project.folderIcon?.startsWith('photo:') ? project.folderIcon.slice(6) : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const folderIcon = mode === 'photo' && photo ? `photo:${photo}` : mode === 'icon' ? `icon:${shape}` : 'initials';

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSave(project.id, { title: title.trim(), folderIcon });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Could not save the change.');
    } finally {
      setSaving(false);
    }
  };

  const modes: { id: Mode; label: string }[] = [
    { id: 'initials', label: 'Initials' },
    { id: 'icon', label: 'Icon' },
    { id: 'photo', label: 'Photo' },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label="Project settings" data-testid="project-settings" className="w-full max-w-md bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl p-6 shadow-2xl animate-popIn">
        <div className="flex items-center justify-between pb-4 border-b border-[#D2DCEA] dark:border-[#27272A] mb-4">
          <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">Project settings</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <ProjectAvatar title={title || project.title} folderIcon={folderIcon} seed={project.id} color={color} size={48} />
            <p className="text-xs text-slate-500 dark:text-zinc-400">Shown next to the name in the sidebar and on the folder.</p>
          </div>

          <div>
            <label htmlFor="project-settings-name" className="block text-xs font-mono text-slate-500 dark:text-zinc-400 mb-1.5 uppercase">
              Name
            </label>
            <input
              id="project-settings-name"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#EEF3F8] dark:bg-[#09090B] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-sm text-[#0F172A] dark:text-white focus:outline-none focus:border-[#325FEC] transition-colors"
            />
          </div>

          <div>
            <p className="text-xs font-mono text-slate-500 dark:text-zinc-400 mb-2 uppercase">Avatar</p>
            <div className="flex items-center gap-2 mb-3" role="radiogroup" aria-label="Avatar type">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    mode === m.id
                      ? 'border-[#325FEC] dark:border-[#518FFF] bg-white dark:bg-[#18181B] text-[#0F172A] dark:text-white'
                      : 'border-[#D2DCEA] dark:border-[#27272A] text-slate-500 dark:text-zinc-400 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'initials' && (
              <p className="text-xs text-slate-500 dark:text-zinc-400">The first two letters of the name, in the folder colour.</p>
            )}

            {mode === 'icon' && (
              <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Icon">
                {PROJECT_SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={shape === s.id}
                    aria-label={s.label}
                    title={s.label}
                    onClick={() => setShape(s.id)}
                    className={`h-10 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
                      shape === s.id
                        ? 'border-[#325FEC] dark:border-[#518FFF] bg-white dark:bg-[#18181B]'
                        : 'border-[#D2DCEA] dark:border-[#27272A] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20]'
                    }`}
                  >
                    <ProjectIcon shape={s.id} color={color} seed={project.id} size={20} />
                  </button>
                ))}
              </div>
            )}

            {mode === 'photo' && <AvatarPicker mode="photo" title={title} color={color} photo={photo} onPhoto={setPhoto} preview={false} />}
          </div>

          {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#D2DCEA] dark:border-[#27272A]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-mono text-slate-500 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !title.trim()}
              className="px-5 py-2 text-xs font-display font-semibold text-white bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
