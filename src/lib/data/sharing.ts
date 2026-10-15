// Who has access to a project, and the changes the owner can make to that (S-54, docs/SHARING_DESIGN.md):
// members, invitations, and claiming an invitation when the invited address signs in.
// makeSharing takes the database client as a parameter so every rule can be tested with a fake.
import { canManage, canRead, cleanEmail, isSharedRole, type Role, type SharedRole } from './roles.ts';

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
export interface AccessList {
  /** What the person asking may do here. */
  role: Role;
  owner: Person;
  members: Member[];
  /** Only the owner sees pending invitations. */
  invites: PendingInvite[];
}

const fail = (code: SharingFailure['code'], error: string): SharingFailure => ({ ok: false, code, error });

export function makeSharing(db: Db, roleOn: (userId: string, projectId: string) => Promise<Role | null>) {
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
    const role = await roleOn(userId, projectId);
    if (!canRead(role)) return fail('NOT_FOUND', 'Project not found.');
    const { data: project } = await db.from('projects').select('id, user_id').eq('id', projectId).maybeSingle();
    if (!project) return fail('NOT_FOUND', 'Project not found.');
    const { data: rows } = await db.from('project_members').select('user_id, role').eq('project_id', projectId);
    const memberRows: Array<{ user_id: string; role: SharedRole }> = rows ?? [];
    const people = await profiles([project.user_id, ...memberRows.map((m) => m.user_id)]);
    let invites: PendingInvite[] = [];
    if (canManage(role)) {
      const { data: inv } = await db.from('project_invites').select('id, email, role, created_at, accepted_at').eq('project_id', projectId);
      invites = (inv ?? [])
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
      if (existing) {
        await db.from('project_members').update({ role: roleInput }).eq('id', existing.id);
        return { ok: true, kind: 'updated' };
      }
      await db.from('project_members').insert({ project_id: projectId, user_id: found.id, role: roleInput, added_by: userId });
      // An earlier invitation for this address is now done.
      await db.from('project_invites').delete().eq('project_id', projectId).eq('email', email);
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
    return { ok: true };
  }

  /** The owner can remove anyone. A member can remove themselves (leave). Access ends at once. */
  async function removeMember(userId: string, projectId: string, memberId: string): Promise<SharingResult<object>> {
    const leaving = userId === memberId;
    if (!leaving && !canManage(await roleOn(userId, projectId))) return fail('NOT_ALLOWED', 'Only the owner can remove people.');
    const { data } = await db.from('project_members').delete().eq('project_id', projectId).eq('user_id', memberId).select('id');
    if (!Array.isArray(data) || data.length === 0) return fail('NOT_FOUND', 'That person does not have access.');
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
      claimed++;
    }
    return claimed;
  }

  return { listAccess, invite, cancelInvite, setRole, removeMember, claimInvites };
}

export type Sharing = ReturnType<typeof makeSharing>;
