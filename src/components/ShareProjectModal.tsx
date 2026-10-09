'use client';

import React, { useState } from 'react';
import {
  X,
  ShareNetwork,
  Globe,
  LinkSimple,
  Copy,
  Check,
  UserPlus,
  ShieldCheck,
  Trash,
  Sparkle,
  LockSimple,
  EnvelopeSimple,
  UsersThree,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { ResearchProject, Collaborator, ProjectSharingSettings } from '@/lib/types/research';

interface ShareProjectModalProps {
  isOpen: boolean;
  project: ResearchProject | null;
  onClose: () => void;
  onUpdateSharing?: (projectId: string, settings: ProjectSharingSettings) => void;
}

const DEFAULT_COLLABORATORS: Collaborator[] = [
  {
    id: 'collab-owner',
    name: 'Dr. Alex Chen',
    email: 'researcher@researchie.ai',
    role: 'owner',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    status: 'active',
  },
  {
    id: 'collab-2',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@ethology.org',
    role: 'editor',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    invitedAt: '2026-09-28T10:00:00Z',
    status: 'active',
  },
  {
    id: 'collab-3',
    name: 'Marcus Vance',
    email: 'm.vance@stanford.edu',
    role: 'viewer',
    invitedAt: '2026-09-29T14:30:00Z',
    status: 'pending',
  },
];

export const ShareProjectModal: React.FC<ShareProjectModalProps> = ({
  isOpen,
  project,
  onClose,
  onUpdateSharing,
}) => {
  const [isPublic, setIsPublic] = useState(project?.sharing?.isPublic ?? true);
  const [allowDuplication, setAllowDuplication] = useState(project?.sharing?.allowDuplication ?? true);
  const [allowGuestComments, setAllowGuestComments] = useState(project?.sharing?.allowGuestComments ?? true);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(
    project?.sharing?.collaborators && project.sharing.collaborators.length > 0
      ? project.sharing.collaborators
      : DEFAULT_COLLABORATORS
  );

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [copiedLink, setCopiedLink] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/share/${project.id}`
    : `/share/${project.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setFeedbackToast('Public link copied to clipboard!');
    setTimeout(() => {
      setCopiedLink(false);
      setFeedbackToast(null);
    }, 2500);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newCollaborator: Collaborator = {
      id: `collab-${Date.now()}`,
      email: inviteEmail.trim(),
      role: inviteRole,
      invitedAt: new Date().toISOString(),
      status: 'pending',
    };

    const updated = [...collaborators, newCollaborator];
    setCollaborators(updated);
    setInviteEmail('');
    setFeedbackToast(`Invitation sent to ${inviteEmail}!`);
    setTimeout(() => setFeedbackToast(null), 3000);

    if (onUpdateSharing) {
      onUpdateSharing(project.id, {
        isPublic,
        allowDuplication,
        allowGuestComments,
        collaborators: updated,
      });
    }
  };

  const handleRemoveCollaborator = (id: string) => {
    const updated = collaborators.filter((c) => c.id !== id);
    setCollaborators(updated);
    if (onUpdateSharing) {
      onUpdateSharing(project.id, {
        isPublic,
        allowDuplication,
        allowGuestComments,
        collaborators: updated,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-xl bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-popIn">
        
        {/* Header */}
        <div className="p-5 pb-4 border-b border-[#D2DCEA] dark:border-[#27272A] bg-white dark:bg-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#325FEC]/10 dark:bg-[#325FEC]/20 text-[#325FEC] flex items-center justify-center flex-shrink-0">
              <ShareNetwork size={18} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm text-[#0F172A] dark:text-white truncate max-w-xs">
                  Share & Collaborate
                </span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color || '#325FEC' }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh] font-sans text-xs">
          
          {/* 1. Public Shareable Stream Link Box */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-[#325FEC]" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block text-xs">
                    Public Stream Link
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Anyone with this link can view research clips and snapshots.
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#325FEC]"></div>
              </label>
            </div>

            {isPublic && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center">
                    <LinkSimple size={13} className="absolute left-3 text-slate-400" />
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      className="w-full pl-8 pr-3 py-1.5 bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-xs font-mono text-slate-700 dark:text-zinc-300 select-all outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] text-white font-medium rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer flex-shrink-0"
                  >
                    {copiedLink ? <Check size={13} weight="bold" /> : <Copy size={13} />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                  <a
                    href={`/share/${project.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl bg-white dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] text-slate-600 dark:text-zinc-400 hover:text-[#325FEC] transition-colors"
                    title="Preview Public Page"
                  >
                    <ArrowSquareOut size={16} />
                  </a>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowDuplication}
                      onChange={(e) => setAllowDuplication(e.target.checked)}
                      className="accent-[#325FEC] rounded"
                    />
                    <span>Allow guests to duplicate workspace</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 2. Invite Team Collaborators Form */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-3">
            <div className="flex items-center gap-2">
              <UsersThree size={16} className="text-[#325FEC]" />
              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                Invite Collaborators
              </span>
            </div>

            <form onSubmit={handleSendInvite} className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <EnvelopeSimple size={14} className="absolute left-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="colleague@stanford.edu or team email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] focus:border-[#325FEC] rounded-xl text-xs text-slate-800 dark:text-zinc-200 outline-none"
                />
              </div>

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="px-2.5 py-1.5 bg-[#F4F6F9] dark:bg-[#202024] border border-[#D2DCEA] dark:border-[#27272A] rounded-xl text-xs text-slate-700 dark:text-zinc-300 outline-none cursor-pointer"
              >
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>

              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-900 dark:bg-zinc-100 hover:bg-slate-800 text-white dark:text-zinc-900 font-medium rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer flex-shrink-0"
              >
                <UserPlus size={13} weight="bold" />
                <span>Invite</span>
              </button>
            </form>
          </div>

          {/* 3. Active Collaborators List */}
          <div className="p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A] space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 block px-0.5">
              Team Members With Access ({collaborators.length})
            </span>

            <div className="divide-y divide-[#D2DCEA]/60 dark:divide-[#27272A]/60">
              {collaborators.map((member) => (
                <div key={member.id} className="py-2 flex items-center justify-between first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-[#D2DCEA] dark:border-[#27272A] flex-shrink-0">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name || member.email} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#325FEC] text-white flex items-center justify-center font-bold text-[10px]">
                          {(member.name || member.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {member.name || member.email.split('@')[0]}
                        </span>
                        {member.status === 'pending' && (
                          <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                            pending
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate block">
                        {member.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-[10px] font-mono capitalize px-2 py-0.5 rounded-full ${
                        member.role === 'owner'
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-[#325FEC] dark:text-[#518FFF] font-bold'
                          : member.role === 'editor'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      {member.role}
                    </span>

                    {member.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(member.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Remove member"
                      >
                        <Trash size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback Toast */}
          {feedbackToast && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <Check size={13} weight="bold" />
              <span>{feedbackToast}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#F4F6F9] dark:bg-[#151518] border-t border-[#D2DCEA] dark:border-[#27272A] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] text-white font-medium rounded-xl text-xs shadow-xs transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
