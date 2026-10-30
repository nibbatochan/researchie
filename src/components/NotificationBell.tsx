'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  X,
  UsersThree,
  ShieldCheck,
  UserMinus,
  SignOut,
  UserCirclePlus,
  CheckCircle,
  XCircle,
  LinkSimple,
} from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth/authContext';

// The notification box next to Settings (S-125). It lists what happened on shared projects (shared with you, an
// access request, an answer, a changed or removed role) and keeps each one until the person removes it. A new
// one that arrives while the app is open also appears as a small card, so nobody has to open the box to notice.
// Accounts deployment only: locally there is one user and nothing to be told.

interface Item {
  id: string;
  kind: string;
  title: string;
  body: string;
  projectId: string | null;
  createdAt: string;
  read: boolean;
}

const ICON: Record<string, React.ElementType> = {
  shared: UsersThree,
  role_changed: ShieldCheck,
  removed: UserMinus,
  left: SignOut,
  access_requested: UserCirclePlus,
  request_approved: CheckCircle,
  request_denied: XCircle,
  joined_via_link: LinkSimple,
};

// What the main button of a notification does. Kinds that say a person lost access have no button.
const ACTION: Record<string, { label: string; share: boolean } | undefined> = {
  shared: { label: 'Open project', share: false },
  role_changed: { label: 'Open project', share: false },
  request_approved: { label: 'Open project', share: false },
  access_requested: { label: 'Review request', share: true },
  joined_via_link: { label: 'See who has access', share: true },
};

// Changes that alter the sidebar's "Shared with me" list.
const CHANGES_PROJECTS = new Set(['shared', 'role_changed', 'removed', 'request_approved']);

// What the box shows when it opens (see /api/notifications/panel).
interface PanelClip {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  capturedAt: string | null;
}
interface PanelRequest {
  id: string;
  projectId: string;
  projectTitle: string;
  who: string;
  message: string;
  createdAt: string;
}

const POLL_MS = 30_000;
const TOAST_MS = 7_000;

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

interface Props {
  /** Open a project (and, when `share` is true, its Share dialog). */
  onOpenProject: (projectId: string, share: boolean) => void;
  /** Called when something arrived that changes which projects this person can see. */
  onProjectsMayHaveChanged?: () => void;
  /** Where the box opens from: the collapsed sidebar is narrow, so it opens to the right. */
  compact?: boolean;
}

export const NotificationBell: React.FC<Props> = ({ onOpenProject, onProjectsMayHaveChanged, compact = false }) => {
  const { authRequired } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Item | null>(null);
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const known = useRef<Set<string> | null>(null); // ids already seen, so only new ones pop up
  const openRef = useRef(false);
  openRef.current = open;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changed = useRef(onProjectsMayHaveChanged);
  changed.current = onProjectsMayHaveChanged;
  // Items that were unread when the box opened stay highlighted until it closes.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [recent, setRecent] = useState<PanelClip[]>([]);
  const [requests, setRequests] = useState<PanelRequest[]>([]);

  const loadPanel = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/panel', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) return;
      setRecent(json.activity ?? []);
      setRequests(json.requests ?? []);
    } catch {
      /* the box keeps what it had */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (!json.success) return;
      const list: Item[] = json.data ?? [];
      if (known.current === null) {
        known.current = new Set(list.map((i) => i.id)); // first load: nothing pops up for old ones
      } else {
        const arrived = list.filter((i) => !known.current!.has(i.id));
        arrived.forEach((i) => known.current!.add(i.id));
        if (arrived.length > 0) {
          if (arrived.some((i) => CHANGES_PROJECTS.has(i.kind))) changed.current?.();
          if (!openRef.current) {
            setToast(arrived[0]);
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
          }
        }
      }
      setItems(list);
    } catch {
      /* the box keeps what it had */
    }
  }, []);

  useEffect(() => {
    if (!authRequired) return;
    void load();
    const tick = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const timer = setInterval(tick, POLL_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [authRequired, load]);

  // Close on a click outside or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!authRequired) return null;

  const unread = items.filter((i) => !i.read).length;

  const toggle = () => {
    if (open) return setOpen(false);
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ left: compact ? r.right + 8 : Math.max(8, r.left - 120), bottom: Math.max(8, window.innerHeight - r.top + 8) });
    setFreshIds(new Set(items.filter((i) => !i.read).map((i) => i.id)));
    setOpen(true);
    void loadPanel();
    setToast(null);
    if (unread > 0) {
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      void fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'read-all' }),
      });
    }
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    known.current?.add(id);
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
  };

  const clearAll = async () => {
    setItems([]);
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'clear' }),
    }).catch(() => {});
  };

  const act = (item: Item) => {
    const a = ACTION[item.kind];
    if (!a || !item.projectId) return;
    setOpen(false);
    setToast(null);
    onOpenProject(item.projectId, a.share);
  };

  const renderItem = (item: Item, inToast = false) => {
    const Icon = ICON[item.kind] ?? Bell;
    const a = ACTION[item.kind];
    return (
      <div className="flex gap-2.5 min-w-0">
        <span className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-[#325FEC]/10 text-[#325FEC] dark:text-[#8DB4FF] flex items-center justify-center">
          <Icon size={15} weight="bold" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#0F172A] dark:text-white leading-snug">{item.title}</p>
          {item.body && <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug mt-0.5">{item.body}</p>}
          <div className="flex items-center gap-3 mt-1.5">
            {a && item.projectId && (
              <button
                type="button"
                onClick={() => act(item)}
                className="text-[11px] font-semibold text-[#325FEC] dark:text-[#8DB4FF] hover:underline cursor-pointer"
              >
                {a.label}
              </button>
            )}
            {!inToast && <span className="text-[10px] text-slate-400 dark:text-zinc-500">{ago(item.createdAt)}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        data-testid="notification-bell"
        aria-label={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
        title="Notifications"
        className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] transition-colors cursor-pointer"
      >
        <Bell size={compact ? 16 : 14} weight={unread > 0 ? 'fill' : 'regular'} />
        {unread > 0 && (
          <span
            data-testid="notification-count"
            className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-[#325FEC] text-white text-[9px] font-semibold flex items-center justify-center leading-none"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && anchor && (
        <div
          ref={boxRef}
          role="dialog"
          aria-label="Notifications"
          data-testid="notification-box"
          style={{ left: anchor.left, bottom: anchor.bottom }}
          className="fixed z-[90] w-[22rem] max-w-[calc(100vw-16px)] max-h-[26rem] flex flex-col rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] shadow-2xl animate-popIn"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#D2DCEA] dark:border-[#27272A]">
            <h2 className="flex items-center gap-2 text-sm font-display font-bold text-[#0F172A] dark:text-white">
              <Bell size={15} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" aria-hidden />
              Notifications
            </h2>
            {items.length > 0 && (
              <button type="button" onClick={() => void clearAll()} className="text-[11px] font-semibold text-slate-500 hover:text-red-600 dark:text-zinc-400 cursor-pointer">
                Clear all
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <section aria-labelledby="notif-recent" className="px-4 pt-3 pb-2">
              <h3 id="notif-recent" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Recent activity</h3>
              {recent.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-zinc-400">No clips yet. Clips you save from the web app or the extension show here.</p>
              ) : (
                <ul className="mt-1.5 space-y-0.5">
                  {recent.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        data-testid="notification-recent-clip"
                        onClick={() => {
                          setOpen(false);
                          onOpenProject(c.projectId, false);
                        }}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[#EEF3F8] dark:hover:bg-[#18181B] cursor-pointer"
                      >
                        <span className="min-w-0 truncate text-xs text-[#0F172A] dark:text-white">{c.title}</span>
                        <span className="flex-shrink-0 max-w-[40%] truncate text-[10px] text-slate-400 dark:text-zinc-500">
                          {c.projectTitle}
                          {c.capturedAt ? ` · ${ago(c.capturedAt)}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="notif-requests" className="px-4 pt-2 pb-3 border-t border-[#E3EAF3] dark:border-[#1F1F23]">
              <h3 id="notif-requests" className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Sharing requests</h3>
              {requests.length === 0 ? (
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-zinc-400">Nobody is waiting for access to your projects.</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {requests.map((r) => (
                    <li key={r.id} data-testid="notification-request" className="px-2 py-1.5 rounded-lg bg-[#EEF3F8]/60 dark:bg-white/[0.03]">
                      <p className="text-xs text-[#0F172A] dark:text-white leading-snug">
                        <span className="font-semibold">{r.who}</span> wants access to “{r.projectTitle}”
                      </p>
                      {r.message && <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug mt-0.5 line-clamp-2">{r.message}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            onOpenProject(r.projectId, true);
                          }}
                          className="text-[11px] font-semibold text-[#325FEC] dark:text-[#8DB4FF] hover:underline cursor-pointer"
                        >
                          Review request
                        </button>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">{ago(r.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {items.length > 0 && (
              <section aria-labelledby="notif-updates" className="border-t border-[#E3EAF3] dark:border-[#1F1F23]">
                <h3 id="notif-updates" className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">Sharing updates</h3>
                <ul>
                  {items.map((item) => (
                  <li
                    key={item.id}
                    data-testid="notification-item"
                    className={`group relative px-4 py-3 border-b border-[#E3EAF3] dark:border-[#1F1F23] last:border-b-0 ${
                      freshIds.has(item.id) ? 'bg-[#325FEC]/[0.06]' : ''
                    }`}
                  >
                    {renderItem(item)}
                    <button
                      type="button"
                      onClick={() => void remove(item.id)}
                      aria-label="Remove this notification"
                      title="Remove"
                      className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      {toast && !open && (
        <div
          role="status"
          data-testid="notification-toast"
          className="fixed bottom-6 right-6 z-[90] w-[22rem] max-w-[calc(100vw-32px)] rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#18181B] shadow-2xl p-4 animate-slideUp"
        >
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X size={12} />
          </button>
          {renderItem(toast, true)}
        </div>
      )}
    </>
  );
};
