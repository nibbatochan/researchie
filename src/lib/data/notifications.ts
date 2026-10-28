// The notification box (S-125): what the sharing code tells people, and how they read and remove it.
// makeNotifications takes the database client so it can be tested with a fake, like the rest of the data layer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type NotificationKind =
  | 'shared'
  | 'role_changed'
  | 'removed'
  | 'left'
  | 'access_requested'
  | 'request_approved'
  | 'request_denied'
  | 'joined_via_link';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  projectId: string | null;
  createdAt: string;
  read: boolean;
}

export interface NewNotification {
  kind: NotificationKind;
  title: string;
  body?: string;
  projectId?: string | null;
}

/** Most notifications a person sees; older ones stay in the table but are not listed. */
export const NOTIFICATION_LIMIT = 50;

const map = (r: any): AppNotification => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body ?? '',
  projectId: r.project_id ?? null,
  createdAt: r.created_at,
  read: Boolean(r.read_at),
});

export function makeNotifications(db: Db) {
  /** Adds one for a person. Never throws: a notification must not make the action that caused it fail. */
  async function notify(userId: string, n: NewNotification): Promise<void> {
    if (!userId) return;
    try {
      const { error } = await db.from('notifications').insert({
        user_id: userId,
        kind: n.kind,
        title: n.title.slice(0, 200),
        body: (n.body ?? '').slice(0, 500),
        project_id: n.projectId ?? null,
      });
      if (error) console.warn('Notification not saved:', error.message ?? error.code);
    } catch (err) {
      console.warn('Notification not saved:', err);
    }
  }

  async function list(userId: string): Promise<{ items: AppNotification[]; unread: number }> {
    const { data } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(0, NOTIFICATION_LIMIT - 1);
    const items = (data ?? []).map(map);
    return { items, unread: items.filter((i: AppNotification) => !i.read).length };
  }

  async function markAllRead(userId: string): Promise<void> {
    await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
  }

  /** Removes one notification. Only its owner can. */
  async function dismiss(userId: string, id: string): Promise<boolean> {
    const { data } = await db.from('notifications').delete().eq('id', id).eq('user_id', userId).select('id');
    return Array.isArray(data) && data.length > 0;
  }

  async function clearAll(userId: string): Promise<void> {
    await db.from('notifications').delete().eq('user_id', userId);
  }

  return { notify, list, markAllRead, dismiss, clearAll };
}

export type Notifications = ReturnType<typeof makeNotifications>;
