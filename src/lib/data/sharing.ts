// Who has access to a project, and the changes the owner can make to that (S-54, docs/SHARING_DESIGN.md):
// members, invitations, and claiming an invitation when the invited address signs in.
// makeSharing takes the database client as a parameter so every rule can be tested with a fake.
import { randomBytes } from 'node:crypto';
import { hashToken } from '../auth/tokens.ts';
import { canManage, canRead, cleanEmail, isSharedRole, type Role, type SharedRole } from './roles.ts';
import { mapAtom, mapProject, readAllRows } from './cloud.ts';
import { makeNotifications } from './notifications.ts';
import type { ResearchAtom, ResearchProject } from '../types/research';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type SharingFailure = { ok: false; code: 'NOT_ALLOWED' | 'NOT_FOUND' | 'BAD_EMAIL' | 'BAD_ROLE' | 'SELF'; error: string };
export type SharingResult<T> = ({ ok: true } & T) | SharingFailure;

export interface Person {
  userId: string;
  name: string;
  email: string;
}
export interface Member extends Person {
  role: SharedRole;
}
export interface PendingInvite {
  id: string;
  email: string;
  role: SharedRole;
  createdAt: string;
}
export interface AccessRequest extends Person {
  id: string;
  message: string;
  createdAt: string;
}
export interface ShareLink {
  role: SharedRole;
  createdAt: string;
}
export interface AccessList {
  /** What the person asking may do here. */
  role: Role;
  owner: Person;
  members: Member[];
  /** Only the owner sees pending invitations. */
  invites: PendingInvite[];
  /** The link that is on, if any. Only the owner sees it. (The secret is never kept, so it cannot be shown again.) */
  link: ShareLink | null;
  /** People who asked for access and are waiting. Only the owner sees them. */
  requests: AccessRequest[];
}

/** Share links start with this, so a link can be told from a project id. */
export const LINK_PREFIX = 'shr_';

const fail = (code: SharingFailure['code'], error: string): SharingFailure => ({ ok: false, code, error });

const verb = (role: unknown) => (role === 'editor' ? 'edit' : 'view');

export function makeSharing(db: Db, roleOn: (userId: string, projectId: string) => Promise<Role | null>) {
  const notifications = makeNotifications(db);

  /** The project's title and owner, for the words in a notification. */
  async function projectInfo(projectId: string): Promise<{ title: string; ownerId: string } | null> {
    const { data } = await db.from('projects').select('title, user_id').eq('id', projectId).maybeSingle();
    return data ? { title: data.title || 'a project', ownerId: data.user_id } : null;
  }

  async function nameOf(userId: string): Promise<string> {
    const { data } = await db.from('profiles').select('email, full_name').eq('id', userId).maybeSingle();
    return data?.full_name || data?.email || 'Someone';
  }

  async function profiles(ids: string[]): Promise<Map<string, Person>> {
    const out = new Map<string, Person>();
    if (ids.length === 0) return out;
    const { data } = await db.from('profiles').select('id, email, full_name').in('id', ids);
    for (const p of data ?? []) out.set(p.id, { userId: p.id, name: p.full_name || p.email || 'Someone', email: p.email || '' });
    return out;
  }

  const person = (map: Map<string, Person>, id: string): Person => map.get(id) ?? { userId: id, name: 'Someone', email: '' };

  /** Everyone with access, for the Share dialog. Anyone who can see the project may see who else can. */
  async function listAccess(userId: string, projectId: string): Promise<SharingResult<{ access: AccessList }>> {
    // Everything that does not depend on anything else is asked at the same time: this dialog used to wait on
    // about nine calls in a row, one after another.
    const [role, { data: project }] = await Promise.all([
      roleOn(userId, projectId),
      db.from('projects').select('id, user_id').eq('id', projectId).maybeSingle(),
    ]);
    if (!canRead(role)) return fail('NOT_FOUND', 'Project not found.');
    if (!project) return fail('NOT_FOUND', 'Project not found.');
    const owner = canManage(role);
    const [{ data: rows }, asks, links, inv] = await Promise.all([
      db.from('project_members').select('user_id, role').eq('project_id', projectId),
      owner ? db.from('access_requests').select('id, user_id, message, status, created_at').eq('project_id', projectId) : null,
      owner ? db.from('share_links').select('role, created_at, revoked_at').eq('project_id', projectId) : null,
      owner ? db.from('project_invites').select('id, email, role, created_at, accepted_at').eq('project_id', projectId) : null,
    ]);
    const memberRows: Array<{ user_id: string; role: SharedRole }> = rows ?? [];
    const waiting: any[] = ((asks?.data ?? []) as any[]).filter((r: any) => r.status === 'pending');
    const people = await profiles([project.user_id, ...memberRows.map((m) => m.user_id), ...waiting.map((r) => r.user_id)]);
    let invites: PendingInvite[] = [];
    let link: ShareLink | null = null;
    let requests: AccessRequest[] = [];
    if (owner) {
      requests = waiting.map((r) => ({ ...person(people, r.user_id), id: r.id, message: r.message || '', createdAt: r.created_at }));
      const active = ((links?.data ?? []) as any[])
        .filter((l: any) => !l.revoked_at)
        .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      if (active) link = { role: active.role, createdAt: active.created_at };
      invites = ((inv?.data ?? []) as any[])
        .filter((i: any) => !i.accepted_at)
        .map((i: any) => ({ id: i.id, email: i.email, role: i.role, createdAt: i.created_at }));
    }
    return {
      ok: true,
      access: {
        role: role as Role,
        owner: person(people, project.user_id),
        members: memberRows.map((m) => ({ ...person(people, m.user_id), role: m.role })),
        invites,
        link,
        requests,
      },
    };
  }

  /**
   * Give an address access. Someone who already has an account is added at once; an address with no account yet is
   * kept as an invitation and becomes access when that address signs in (no email is sent). Owner only.
   */
  async function invite(
    userId: string,
    projectId: string,
    emailInput: unknown,
    roleInput: unknown,
  ): Promise<SharingResult<{ kind: 'added' | 'invited' | 'updated' }>> {
    if (!canManage(await roleOn(userId, projectId))) return fail('NOT_ALLOWED', 'Only the owner can share this project.');
    const email = cleanEmail(emailInput);
    if (!email) return fail('BAD_EMAIL', 'Enter a full email address.');
    if (!isSharedRole(roleInput)) return fail('BAD_ROLE', 'Choose Editor or Viewer.');

    const { data: found } = await db.from('profiles').select('id, email').eq('email', email).maybeSingle();
    if (found?.id === userId) return fail('SELF', 'That is your own address.');

    if (found) {
      const { data: existing } = await db.from('project_members').select('id').eq('project_id', projectId).eq('user_id', found.id).maybeSingle();
      const info = await projectInfo(projectId);
      const who = await nameOf(userId);
      if (existing) {
        await db.from('project_members').update({ role: roleInput }).eq('id', existing.id);
        await notifications.notify(found.id, {
          kind: 'role_changed',
          title: `${who} changed your access to "${info?.title}"`,
          body: `You can now ${verb(roleInput)} it.`,
          projectId,
        });
        return { ok: true, kind: 'updated' };
      }
      await db.from('project_members').insert({ project_id: projectId, user_id: found.id, role: roleInput, added_by: userId });
      // An earlier invitation for this address is now done.
      await db.from('project_invites').delete().eq('project_id', projectId).eq('email', email);
      await notifications.notify(found.id, {
        kind: 'shared',
        title: `${who} shared "${info?.title}" with you`,
        body: `You can ${verb(roleInput)} it. Find it under Shared with me.`,
        projectId,
      });
      return { ok: true, kind: 'added' };
    }

    const { data: pending } = await db.from('project_invites').select('id').eq('project_id', projectId).eq('email', email).maybeSingle();
    if (pending) {
      await db.from('project_invites').update({ role: roleInput, accepted_at: null }).eq('id', pending.id);
    } else {
      await db.from('project_invites').insert({ project_id: projectId, email, role: roleInput, invited_by: userId });
    }
    return { ok: true, kind: 'invited' };
  }

  async function cancelInvite(userId: string, projectId: string, inviteId: string): Promise<SharingResult<object>> {
    if (!canManage(await roleOn(userId, projectId))) return fail('NOT_ALLOWED', 'Only the owner can change who has access.');
    await db.from('project_invites').delete().eq('id', inviteId).eq('project_id', projectId);
    return { ok: true };
  }

  async function setRole(userId: string, projectId: string, memberId: string, roleInput: unknown): Promise<SharingResult<object>> {
    if (!canManage(await roleOn(userId, projectId))) return fail('NOT_ALLOWED', 'Only the owner can change who has access.');
    if (!isSharedRole(roleInput)) return fail('BAD_ROLE', 'Choose Editor or Viewer.');
    const { data } = await db.from('project_members').update({ role: roleInput }).eq('project_id', projectId).eq('user_id', memberId).select('id');
    if (!Array.isArray(data) || data.length === 0) return fail('NOT_FOUND', 'That person does not have access.');
    const info = await projectInfo(projectId);
    await notifications.notify(memberId, {
      kind: 'role_changed',
      title: `${await nameOf(userId)} changed your access to "${info?.title}"`,
      body: `You can now ${verb(roleInput)} it.`,
      projectId,
    });
    return { ok: true };
  }

  /** The owner can remove anyone. A member can remove themselves (leave). Access ends at once. */
  async function removeMember(userId: string, projectId: string, memberId: string): Promise<SharingResult<object>> {
    const leaving = userId === memberId;
    if (!leaving && !canManage(await roleOn(userId, projectId))) return fail('NOT_ALLOWED', 'Only the owner can remove people.');
    const { data } = await db.from('project_members').delete().eq('project_id', projectId).eq('user_id', memberId).select('id');
    if (!Array.isArray(data) || data.length === 0) return fail('NOT_FOUND', 'That person does not have access.');
    const info = await projectInfo(projectId);
    if (info) {
      if (leaving) {
        await notifications.notify(info.ownerId, {
          kind: 'left',
          title: `${await nameOf(userId)} removed "${info.title}" from their list`,
          body: 'They no longer have access. You can share it with them again at any time.',
          projectId,
        });
      } else {
        await notifications.notify(memberId, {
          kind: 'removed',
          title: `Your access to "${info.title}" was removed`,
          body: `${await nameOf(userId)} removed you. The project is gone from your list.`,
          projectId,
        });
      }
    }
    return { ok: true };
  }

  /**
   * Turns the invitations waiting for this address into access. Called when the person is signed in. Only the
   * signed-in address can claim its own invitations; a project that no longer exists is skipped.
   */
  async function claimInvites(userId: string, emailInput: unknown): Promise<number> {
    const email = cleanEmail(emailInput);
    if (!email) return 0;
    const { data } = await db.from('project_invites').select('id, project_id, role, accepted_at').eq('email', email);
    let claimed = 0;
    for (const inv of data ?? []) {
      if (inv.accepted_at) continue;
      const { data: project } = await db.from('projects').select('id, user_id').eq('id', inv.project_id).maybeSingle();
      if (!project || project.user_id === userId) continue;
      const { data: existing } = await db.from('project_members').select('id').eq('project_id', inv.project_id).eq('user_id', userId).maybeSingle();
      if (!existing) {
        await db.from('project_members').insert({ project_id: inv.project_id, user_id: userId, role: inv.role, added_by: project.user_id });
      }
      await db.from('project_invites').update({ accepted_at: new Date().toISOString() }).eq('id', inv.id);
      if (!existing) {
        const info = await projectInfo(inv.project_id);
        await notifications.notify(userId, {
          kind: 'shared',
          title: `${await nameOf(project.user_id)} shared "${info?.title}" with you`,
          body: `You can ${verb(inv.role)} it. Find it under Shared with me.`,
          projectId: inv.project_id,
        });
      }
      claimed++;
    }
    return claimed;
  }

  // ── Links ────────────────────────────────────────────────────────────────────

  /**
   * Make the project's share link (view or edit). Only one link is on at a time: making a new one turns the old one
   * off. The secret is returned once and only its hash is kept, so it cannot be shown again. Owner only.
   */
  async function createLink(userId: string, projectId: string, roleInput: unknown): Promise<SharingResult<{ token: string }>> {
    if (!canManage(await roleOn(userId, projectId))) return fail('NOT_ALLOWED', 'Only the owner can make a link.');
    if (!isSharedRole(roleInput)) return fail('BAD_ROLE', 'Choose view or edit.');
    await db.from('share_links').update({ revoked_at: new Date().toISOString() }).eq('project_id', projectId);
    const token = LINK_PREFIX + randomBytes(24).toString('base64url');
    await db.from('share_links').insert({ project_id: projectId, token_hash: hashToken(token), role: roleInput, created_by: userId });
    return { ok: true, token };
  }

  /** Turn the link off. It stops working at once. Owner only. */
  async function revokeLink(userId: string, projectId: string): Promise<SharingResult<object>> {
    if (!canManage(await roleOn(userId, projectId))) return fail('NOT_ALLOWED', 'Only the owner can turn the link off.');
    await db.from('share_links').update({ revoked_at: new Date().toISOString() }).eq('project_id', projectId);
    return { ok: true };
  }

  /** The project and role a link opens, or null when the link is wrong or has been turned off. */
  async function resolveLink(token: unknown): Promise<{ projectId: string; role: SharedRole } | null> {
    if (typeof token !== 'string' || !token.startsWith(LINK_PREFIX) || token.length > 200) return null;
    const { data } = await db.from('share_links').select('project_id, role, revoked_at').eq('token_hash', hashToken(token)).maybeSingle();
    if (!data || data.revoked_at) return null;
    return { projectId: data.project_id, role: data.role };
  }

  /** What a link shows: the project, its sub-projects' clips, read only. No sign-in is needed for this. */
  async function readByLink(token: unknown): Promise<{ project: ResearchProject; atoms: ResearchAtom[]; role: SharedRole } | null> {
    const link = await resolveLink(token);
    if (!link) return null;
    const { data: project } = await db.from('projects').select('*').eq('id', link.projectId).maybeSingle();
    if (!project) return null;
    const { data: kids } = await db.from('projects').select('id').eq('parent_id', link.projectId);
    const ids = [link.projectId, ...(kids ?? []).map((k: any) => k.id)];
    const atoms = await readAllRows(() =>
      db.from('atoms').select('*').in('project_id', ids).order('captured_at', { ascending: false }).order('id', { ascending: false })
    );
    return { project: mapProject(project, link.role), atoms: atoms.map(mapAtom), role: link.role };
  }

  /**
   * A signed-in person opens an edit link: they become an editor of that project. A view link adds nobody (it only
   * shows the page), and the owner or an existing member is left as they are. Returns the project id, or null.
   */
  async function joinViaLink(userId: string, token: unknown): Promise<string | null> {
    const link = await resolveLink(token);
    if (!link || link.role !== 'editor') return null;
    const { data: project } = await db.from('projects').select('id, user_id').eq('id', link.projectId).maybeSingle();
    if (!project) return null;
    if (project.user_id === userId) return project.id;
    const { data: existing } = await db.from('project_members').select('id').eq('project_id', link.projectId).eq('user_id', userId).maybeSingle();
    if (!existing) {
      await db.from('project_members').insert({ project_id: link.projectId, user_id: userId, role: 'editor', added_by: project.user_id });
      const info = await projectInfo(link.projectId);
      await notifications.notify(project.user_id, {
        kind: 'joined_via_link',
        title: `${await nameOf(userId)} joined "${info?.title}" through your edit link`,
        body: 'They can edit it now. You can change or remove their access from Share.',
        projectId: link.projectId,
      });
    } else {
      await db.from('project_members').update({ role: 'editor' }).eq('id', existing.id);
    }
    return project.id;
  }

  // ── Access requests ──────────────────────────────────────────────────────────

  /** For someone with no access who opened a project: does it exist, and did they already ask? */
  async function accessState(userId: string, projectId: string): Promise<{ exists: boolean; request: 'none' | 'pending' | 'denied' }> {
    if (!projectId) return { exists: false, request: 'none' };
    const { data: project } = await db.from('projects').select('id').eq('id', projectId).maybeSingle();
    if (!project) return { exists: false, request: 'none' };
    const { data: ask } = await db.from('access_requests').select('status').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
    return { exists: true, request: ask?.status === 'pending' ? 'pending' : ask?.status === 'denied' ? 'denied' : 'none' };
  }

  /** Ask the owner for access. One waiting request per person; asking again after a denial starts a new one. */
  async function requestAccess(userId: string, projectId: string, messageInput: unknown): Promise<SharingResult<{ already: boolean }>> {
    const { data: project } = await db.from('projects').select('id, user_id').eq('id', projectId).maybeSingle();
    if (!project) return fail('NOT_FOUND', 'Project not found.');
    if (canRead(await roleOn(userId, projectId))) return { ok: true, already: true };
    const message = typeof messageInput === 'string' ? messageInput.trim().slice(0, 500) : '';
    const { data: existing } = await db.from('access_requests').select('id, status').eq('project_id', projectId).eq('user_id', userId).maybeSingle();
    if (existing) {
      await db.from('access_requests').update({ message, status: 'pending', decided_by: null, decided_at: null, created_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await db.from('access_requests').insert({ project_id: projectId, user_id: userId, message, status: 'pending' });
    }
    // Tell the owner, but not again for a request that is already waiting on them.
    if (existing?.status !== 'pending') {
      const info = await projectInfo(projectId);
      await notifications.notify(project.user_id, {
        kind: 'access_requested',
        title: `${await nameOf(userId)} asked for access to "${info?.title}"`,
        body: message || 'Open Share to approve or deny the request.',
        projectId,
      });
    }
    return { ok: true, already: false };
  }

  /** The owner approves (with a role) or denies a waiting request. Approving adds the person at once. */
  async function decideRequest(userId: string, projectId: string, requestId: string, approve: boolean, roleInput?: unknown): Promise<SharingResult<object>> {
    if (!canManage(await roleOn(userId, projectId))) return fail('NOT_ALLOWED', 'Only the owner can answer requests.');
    const { data: ask } = await db.from('access_requests').select('id, user_id, status').eq('id', requestId).eq('project_id', projectId).maybeSingle();
    if (!ask || ask.status !== 'pending') return fail('NOT_FOUND', 'That request is no longer waiting.');
    if (approve) {
      if (!isSharedRole(roleInput)) return fail('BAD_ROLE', 'Choose Editor or Viewer.');
      const { data: member } = await db.from('project_members').select('id').eq('project_id', projectId).eq('user_id', ask.user_id).maybeSingle();
      if (member) await db.from('project_members').update({ role: roleInput }).eq('id', member.id);
      else await db.from('project_members').insert({ project_id: projectId, user_id: ask.user_id, role: roleInput, added_by: userId });
    }
    await db
      .from('access_requests')
      .update({ status: approve ? 'approved' : 'denied', decided_by: userId, decided_at: new Date().toISOString() })
      .eq('id', ask.id);
    const info = await projectInfo(projectId);
    const who = await nameOf(userId);
    await notifications.notify(
      ask.user_id,
      approve
        ? {
            kind: 'request_approved',
            title: `${who} approved your request for "${info?.title}"`,
            body: `You can ${verb(roleInput)} it. Find it under Shared with me.`,
            projectId,
          }
        : {
            kind: 'request_denied',
            title: `${who} declined your request for "${info?.title}"`,
            body: 'You can ask again from the project link.',
            projectId,
          }
    );
    return { ok: true };
  }

  /** How many requests are waiting on each project, for the projects this person owns. */
  async function pendingRequestCounts(userId: string): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    const { data: mine } = await db.from('projects').select('id').eq('user_id', userId);
    const ids = (mine ?? []).map((p: any) => p.id);
    if (ids.length === 0) return out;
    const { data } = await db.from('access_requests').select('project_id, status').in('project_id', ids);
    for (const r of data ?? []) if (r.status === 'pending') out.set(r.project_id, (out.get(r.project_id) ?? 0) + 1);
    return out;
  }

  return { notifications, listAccess, invite, cancelInvite, setRole, removeMember, claimInvites, createLink, revokeLink, resolveLink, readByLink, joinViaLink, accessState, requestAccess, decideRequest, pendingRequestCounts };
}

export type Sharing = ReturnType<typeof makeSharing>;
