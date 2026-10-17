'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, UserPlus, UsersThree, EnvelopeSimple, SignOut, LinkSimple, Copy, Check } from '@phosphor-icons/react';
import type { ResearchProject } from '@/lib/types/research';

// Share (accounts deployment only, S-54). People with access, their roles, invitations, and who can change them.
// Every rule is checked on the server; this screen only shows what the person may do and reports what happened.
// No email is sent: an invitation waits until that address signs in, and the owner is told so here.

type Role = 'owner' | 'editor' | 'viewer';
interface Person {
  userId: string;
  name: string;
  email: string;
}
interface Member extends Person {
  role: 'editor' | 'viewer';
}
interface PendingInvite {
  id: string;
  email: string;
  role: 'editor' | 'viewer';
  createdAt: string;
}
interface AccessRequest extends Person {
  id: string;
  message: string;
  createdAt: string;
}
interface Access {
  requests: AccessRequest[];
  link: { role: 'editor' | 'viewer'; createdAt: string } | null;
  role: Role;
  owner: Person;
  members: Member[];
  invites: PendingInvite[];
}

const field =
  'px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] text-[#0F172A] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500';

const ROLE_NOTE: Record<Role, string> = {
  owner: 'Owner',
  editor: 'Can edit',
  viewer: 'Can view',
};

export const ShareAccessModal: React.FC<{
  isOpen: boolean;
  project: ResearchProject | null;
  currentUserId?: string;
  onClose: () => void;
  /** Called after access to this project changed for the signed-in person (they left), so the app can reload. */
  onLeft?: () => void;
}> = ({ isOpen, project, currentUserId, onClose, onLeft }) => {
  const [access, setAccess] = useState<Access | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [busy, setBusy] = useState(false);
  // The link secret is shown once, right after it is made; only its hash is kept.
  const [newLink, setNewLink] = useState<string | null>(null);
  const [linkRole, setLinkRole] = useState<'editor' | 'viewer'>('viewer');
  const [copied, setCopied] = useState(false);
  // The role each waiting request would get if approved (viewer unless the owner picks editor).
  const [askRole, setAskRole] = useState<Record<string, 'editor' | 'viewer'>>({});
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const projectId = project?.id;

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoadError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/share`, { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Could not load who has access.');
      setAccess(json.data);
    } catch (e: any) {
      setAccess(null);
      setLoadError(e.message || 'Could not load who has access.');
    }
  }, [projectId]);

  useEffect(() => {
    if (!isOpen) return;
    setAccess(null);
    setMessage(null);
    setEmail('');
    setNewLink(null);
    void load();
  }, [isOpen, load]);

  async function act(body: Record<string, unknown>, done: (json: any) => string | null) {
    if (!projectId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'That did not work.');
      const text = done(json);
      if (text) setMessage({ text, error: false });
      await load();
    } catch (e: any) {
      setMessage({ text: e.message || 'That did not work.', error: true });
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen || !project) return null;

  const isOwner = access?.role === 'owner';
  const row = 'flex items-center gap-2 py-2 border-b border-[#E2E5EB] dark:border-[#27272A] last:border-b-0';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-backdropIn" role="dialog" aria-modal="true" aria-label={`Share ${project.title}`}>
      <div className="animate-popIn w-full max-w-md max-h-[calc(100vh-32px)] overflow-y-auto bg-[#FAFBFD] dark:bg-[#121214] border border-[#D2DCEA] dark:border-[#27272A] rounded-2xl shadow-2xl p-5 space-y-4 font-sans">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white flex items-center gap-1.5">
              <UsersThree size={16} className="text-[#325FEC] dark:text-[#518FFF]" />
              <span>Share</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate" title={project.title}>{project.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {loadError && <p className="text-xs text-red-600 dark:text-red-400">{loadError}</p>}
        {!access && !loadError && <p className="text-xs text-slate-500 dark:text-zinc-400">Loading…</p>}

        {access && (
          <>
            {/* Invite (owner only) */}
            {isOwner ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!email.trim()) return;
                  void act({ action: 'invite', email, role }, (j) => {
                    setEmail('');
                    return j.kind === 'invited'
                      ? 'Invitation saved. No email is sent: they will see this project when they sign in with that address.'
                      : j.kind === 'updated'
                        ? 'Their access was updated.'
                        : 'Added. The project is under "Shared with me" for them.';
                  });
                }}
                className="space-y-1.5"
              >
                <label className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <EnvelopeSimple size={13} className="text-slate-500" />
                  <span>Invite by email</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="off"
                    className={`${field} flex-1 min-w-0`}
                  />
                  <select value={role} onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')} className={field} aria-label="Role">
                    <option value="viewer">Can view</option>
                    <option value="editor">Can edit</option>
                  </select>
                  <button type="submit" disabled={busy || !email.trim()} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-xs font-medium cursor-pointer">
                    <UserPlus size={13} />
                    <span>Invite</span>
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                You have <b>{ROLE_NOTE[access.role].toLowerCase()}</b> access. Only the owner can change who else has it.
              </p>
            )}

            {/* Requests (owner only) */}
            {isOwner && access.requests.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold tracking-wide text-slate-500 dark:text-zinc-400 uppercase mb-1">Asking for access</div>
                <ul>
                  {access.requests.map((r) => (
                    <li key={r.id} className={`${row} flex-wrap`} data-testid="share-request">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-[#0F172A] dark:text-white truncate">{r.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{r.email}</div>
                        {r.message && <div className="text-[11px] text-slate-600 dark:text-zinc-300 mt-0.5 break-words">“{r.message}”</div>}
                      </div>
                      <select
                        value={askRole[r.id] ?? 'viewer'}
                        onChange={(e) => setAskRole((prev) => ({ ...prev, [r.id]: e.target.value as 'editor' | 'viewer' }))}
                        className={field}
                        aria-label={`Role for ${r.email}`}
                      >
                        <option value="viewer">Can view</option>
                        <option value="editor">Can edit</option>
                      </select>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act({ action: 'request-approve', requestId: r.id, role: askRole[r.id] ?? 'viewer' }, () => 'Approved. The project is under "Shared with me" for them.')}
                        className="px-2.5 py-1 bg-[#325FEC] hover:bg-[#274AC4] disabled:opacity-50 text-white rounded-lg text-[11px] font-medium cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act({ action: 'request-deny', requestId: r.id }, () => 'Request denied.')}
                        className="px-2.5 py-1 border border-[#CBD5E1] dark:border-[#3F3F46] rounded-lg text-[11px] text-slate-700 dark:text-zinc-300 cursor-pointer"
                      >
                        Deny
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Link (owner only) */}
            {isOwner && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <LinkSimple size={13} className="text-slate-500" />
                  <span>Link</span>
                </div>
                {newLink ? (
                  <div className="space-y-1">
                    <code className="block p-1.5 rounded bg-[#F4F6F9] dark:bg-[#202024] font-mono text-[10px] text-slate-600 dark:text-zinc-400 break-all select-all" data-testid="share-link-url">{newLink}</code>
                    <div className="flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(newLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 font-medium text-[#325FEC] dark:text-[#518FFF] cursor-pointer"
                      >
                        {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
                        {copied ? 'Copied' : 'Copy link'}
                      </button>
                      <span className="text-amber-700 dark:text-amber-300">Shown once. Copy it now.</span>
                    </div>
                  </div>
                ) : null}
                {access.link ? (
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                    <span>Link is on: {access.link.role === 'editor' ? 'anyone with it can edit (after signing in)' : 'anyone with it can view'}.</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void act({ action: 'link-revoke' }, () => { setNewLink(null); return 'Link turned off. It stops working at once.'; })}
                      className="text-red-600 dark:text-red-400 cursor-pointer flex-shrink-0"
                    >
                      Turn off
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Off. Only the people below can open this project.</p>
                )}
                <div className="flex items-center gap-2">
                  <select value={linkRole} onChange={(e) => setLinkRole(e.target.value as 'editor' | 'viewer')} className={field} aria-label="What the link allows">
                    <option value="viewer">Anyone can view</option>
                    <option value="editor">Signed-in people can edit</option>
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act({ action: 'link-create', role: linkRole }, (j) => {
                        setNewLink(`${window.location.origin}/share/${j.token}`);
                        setCopied(false);
                        return access.link ? 'New link made. The old one no longer works.' : null;
                      })
                    }
                    className="px-3 py-1.5 border border-[#CBD5E1] dark:border-[#3F3F46] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] rounded-lg text-xs font-medium text-slate-700 dark:text-zinc-300 cursor-pointer"
                  >
                    {access.link ? 'Make a new link' : 'Create link'}
                  </button>
                </div>
              </div>
            )}

            {/* People */}
            <div>
              <div className="text-[10px] font-semibold tracking-wide text-slate-500 dark:text-zinc-400 uppercase mb-1">People with access</div>
              <ul>
                <li className={row}>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#0F172A] dark:text-white truncate">{access.owner.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{access.owner.email}</div>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">Owner</span>
                </li>
                {access.members.map((m) => (
                  <li key={m.userId} className={row} data-testid="share-member">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-[#0F172A] dark:text-white truncate">
                        {m.name}
                        {m.userId === currentUserId ? ' (you)' : ''}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">{m.email}</div>
                    </div>
                    {isOwner ? (
                      <>
                        <select
                          value={m.role}
                          disabled={busy}
                          onChange={(e) => void act({ action: 'role', userId: m.userId, role: e.target.value }, () => 'Role changed.')}
                          className={field}
                          aria-label={`Role for ${m.email}`}
                        >
                          <option value="viewer">Can view</option>
                          <option value="editor">Can edit</option>
                        </select>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act({ action: 'remove', userId: m.userId }, () => 'Removed. They lose access at once.')}
                          aria-label={`Remove ${m.email}`}
                          title="Remove"
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">{ROLE_NOTE[m.role]}</span>
                        {m.userId === currentUserId && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              await act({ action: 'remove', userId: m.userId }, () => null);
                              onLeft?.();
                              onClose();
                            }}
                            title="Leave this project"
                            className="inline-flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 cursor-pointer"
                          >
                            <SignOut size={12} />
                            <span>Leave</span>
                          </button>
                        )}
                      </>
                    )}
                  </li>
                ))}
                {access.members.length === 0 && access.invites.length === 0 && (
                  <li className="py-2 text-[11px] text-slate-500 dark:text-zinc-400">Only you, for now.</li>
                )}
              </ul>
            </div>

            {/* Pending invitations (owner only) */}
            {isOwner && access.invites.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold tracking-wide text-slate-500 dark:text-zinc-400 uppercase mb-1">Waiting for them to sign in</div>
                <ul>
                  {access.invites.map((i) => (
                    <li key={i.id} className={row} data-testid="share-invite">
                      <div className="min-w-0 flex-1 text-xs text-[#0F172A] dark:text-white truncate">{i.email}</div>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400">{ROLE_NOTE[i.role]}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void act({ action: 'cancel-invite', inviteId: i.id }, () => 'Invitation cancelled.')}
                        aria-label={`Cancel the invitation for ${i.email}`}
                        title="Cancel invitation"
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {message && <p className={`text-[11px] ${message.error ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{message.text}</p>}
      </div>
    </div>
  );
};
