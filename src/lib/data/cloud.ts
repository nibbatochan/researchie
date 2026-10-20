// The per-user data layer for the tester deployment (AUTH_REQUIRED=true). Everything lives in Supabase and
// every call checks what the signed-in user may do in the project it touches, so one user can never read or
// change another's data unless the project was shared with them (S-54, docs/SHARING_DESIGN.md).
// The Next.js server uses the service-role key (which skips row-level security), so these checks are the
// real lock; the policies in supabase/migrations/001_multi_user.sql are the second one.
//
// makeCloud takes the database client as a parameter so the isolation rules can be tested with a fake.
import { randomUUID } from 'node:crypto';
import type { ResearchAtom, ResearchDocument, ResearchProject } from '../types/research';
import type { CitationRecord } from '../citations/types';
import { canManage, canRead, canWrite, strongest, type Role } from './roles.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export const STARTER_PROJECT_TITLE = 'My first project';

const newId = (prefix: string) => `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 12)}`;

export function mapProject(p: any, role: Role = 'owner'): ResearchProject {
  return {
    id: p.id,
    userId: p.user_id,
    parentId: p.parent_id ?? null,
    folderIcon: p.folder_icon ?? undefined,
    title: p.title,
    description: p.description ?? '',
    color: p.color,
    tags: p.tags ?? [],
    atomCount: p.atom_count ?? 0,
    lastAccessedAt: p.last_accessed_at ?? p.updated_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    role,
  } as ResearchProject;
}

export function mapAtom(a: any): ResearchAtom {
  return {
    id: a.id,
    projectId: a.project_id,
    userId: a.user_id,
    type: a.type,
    title: a.title,
    content: a.content ?? {},
    metadata: a.metadata ?? {},
    tags: a.tags ?? [],
    userNotes: a.user_notes ?? '',
    capturedAt: a.captured_at,
  } as ResearchAtom;
}

export function makeCloud(db: Db) {
  /**
   * What this user may do in this project: owner, editor, viewer, or null (no access, or no such project).
   * Someone added to a project also has that role in its sub-projects.
   */
  async function roleOn(userId: string, projectId: string): Promise<Role | null> {
    if (!userId || !projectId) return null;
    const { data: project } = await db.from('projects').select('id, user_id, parent_id').eq('id', projectId).maybeSingle();
    if (!project) return null;
    if (project.user_id === userId) return 'owner';
    const ids = [project.id, ...(project.parent_id ? [project.parent_id] : [])];
    const { data: rows } = await db.from('project_members').select('role').eq('user_id', userId).in('project_id', ids);
    return strongest((rows ?? []).map((r: any) => r.role));
  }

  /** Every project this user can reach, with their role: their own, ones shared with them, and the sub-projects of those. */
  async function accessibleRoles(userId: string): Promise<Map<string, Role>> {
    const out = new Map<string, Role>();
    const { data: mine } = await db.from('projects').select('id').eq('user_id', userId);
    for (const p of mine ?? []) out.set(p.id, 'owner');
    const { data: member } = await db.from('project_members').select('project_id, role').eq('user_id', userId);
    const memberRole = new Map<string, Role>();
    for (const m of member ?? []) memberRole.set(m.project_id, m.role);
    if (memberRole.size) {
      for (const [id, role] of memberRole) if (!out.has(id)) out.set(id, role);
      const { data: kids } = await db.from('projects').select('id, parent_id').in('parent_id', [...memberRole.keys()]);
      for (const k of kids ?? []) {
        if (out.has(k.id)) continue;
        out.set(k.id, memberRole.get(k.parent_id) as Role);
      }
    }
    return out;
  }

  async function ownsProject(userId: string, projectId: string): Promise<boolean> {
    return canManage(await roleOn(userId, projectId));
  }

  /** The project and its sub-projects, when the user may read the project. */
  async function projectFamily(userId: string, projectId: string): Promise<string[]> {
    if (!canRead(await roleOn(userId, projectId))) return [];
    const { data } = await db.from('projects').select('id').eq('parent_id', projectId);
    return [projectId, ...(data ?? []).map((r: any) => r.id)];
  }

  // The app's "all projects" view and the extension's default both use the demo id 'proj-ai-main'. A real user
  // does not own it, so for saving it means "my first project" and for listing it means "everything of mine".
  const DEMO_ID = 'proj-ai-main';

  async function ownRoots(userId: string): Promise<ResearchProject[]> {
    return (await listOwnProjects(userId)).filter((p) => !p.parentId);
  }

  async function resolveProjectId(userId: string, projectId: string): Promise<string> {
    if (projectId && projectId !== 'all' && projectId !== DEMO_ID) return projectId;
    if (projectId === DEMO_ID && (await ownsProject(userId, DEMO_ID))) return DEMO_ID;
    const roots = await ownRoots(userId);
    roots.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return roots[0]?.id ?? projectId;
  }

  async function scopeOf(userId: string, projectId?: string): Promise<string | undefined> {
    if (projectId === DEMO_ID && !(await ownsProject(userId, DEMO_ID))) return 'all';
    return projectId;
  }

  /** The ids a listing covers: one project and its sub-projects, or everything the user can reach. */
  async function scopeIds(userId: string, scope?: string): Promise<string[]> {
    const projectId = await scopeOf(userId, scope);
    if (projectId && projectId !== 'all') return projectFamily(userId, projectId);
    return [...(await accessibleRoles(userId)).keys()];
  }

  async function listOwnProjects(userId: string): Promise<ResearchProject[]> {
    const read = () => db.from('projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false });
    let { data } = await read();
    if (!data || data.length === 0) {
      // First visit: give the new user somewhere to put their first clip. The id is fixed per user, so
      // two tabs opening at once cannot create two of them.
      await db.from('projects').upsert(
        {
          id: `proj-start-${userId.replace(/-/g, '').slice(0, 20)}`,
          user_id: userId,
          title: STARTER_PROJECT_TITLE,
          description: 'Clips from the Chrome extension land here until you make more projects.',
          color: '#325FEC',
          tags: [],
          atom_count: 0,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      );
      ({ data } = await read());
    }
    return (data ?? []).map((p: any) => mapProject(p, 'owner'));
  }

  /** The user's own projects, then the ones shared with them (each marked with their role). */
  async function listProjects(userId: string): Promise<ResearchProject[]> {
    const own = await listOwnProjects(userId);
    const roles = await accessibleRoles(userId);
    const sharedIds = [...roles.entries()].filter(([, role]) => role !== 'owner').map(([id]) => id);
    if (sharedIds.length === 0) return own;
    const { data } = await db.from('projects').select('*').in('id', sharedIds).order('updated_at', { ascending: false });
    return [...own, ...(data ?? []).map((p: any) => mapProject(p, roles.get(p.id) as Role))];
  }

  async function createProject(
    userId: string,
    input: { title: string; description?: string; color?: string; tags?: string[]; parentId?: string | null; folderIcon?: string }
  ): Promise<ResearchProject | null> {
    if (input.parentId && !(await ownsProject(userId, input.parentId))) return null;
    const { data, error } = await db
      .from('projects')
      .insert({
        id: newId('proj'),
        user_id: userId,
        title: input.title,
        description: input.description ?? '',
        color: input.color ?? '#325FEC',
        tags: input.tags ?? [],
        parent_id: input.parentId ?? null,
        folder_icon: input.folderIcon ?? null,
        atom_count: 0,
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapProject(data, 'owner');
  }

  /**
   * Deletes a project and its sub-projects. Only the owner can. With moveTo, their clips and documents are moved
   * to that project first (it must be the user's own and outside the deleted family); without it they are deleted
   * too, including clips other people added. Returns false when the user is not the owner or the target is not
   * usable. Nothing changes in that case.
   */
  async function deleteProject(userId: string, projectId: string, moveTo?: string): Promise<boolean> {
    if (!(await ownsProject(userId, projectId))) return false;
    const family = await projectFamily(userId, projectId);
    if (moveTo) {
      if (family.includes(moveTo) || !(await ownsProject(userId, moveTo))) return false;
      await db.from('atoms').update({ project_id: moveTo }).in('project_id', family);
      await db.from('documents').update({ project_id: moveTo }).in('project_id', family);
    }
    for (const id of family) {
      await db.from('atoms').delete().eq('project_id', id);
      await db.from('documents').delete().eq('project_id', id);
      await db.from('projects').delete().eq('id', id);
    }
    return true;
  }

  async function listAtoms(userId: string, scope?: string): Promise<ResearchAtom[]> {
    const ids = await scopeIds(userId, scope);
    if (ids.length === 0) return [];
    const { data } = await db.from('atoms').select('*').in('project_id', ids).order('captured_at', { ascending: false });
    return (data ?? []).map(mapAtom);
  }

  async function atomRow(id: string) {
    const { data } = await db.from('atoms').select('*').eq('id', id).maybeSingle();
    return data ?? null;
  }

  async function getAtom(userId: string, id: string): Promise<ResearchAtom | null> {
    const row = await atomRow(id);
    if (!row || !canRead(await roleOn(userId, row.project_id))) return null;
    return mapAtom(row);
  }

  /** Returns null when the user may not add to that project. Never overwrites an existing atom. */
  async function insertAtom(userId: string, atom: ResearchAtom): Promise<ResearchAtom | null> {
    if (!canWrite(await roleOn(userId, atom.projectId))) return null;
    const row = (id: string) => ({
      id,
      project_id: atom.projectId,
      user_id: userId,
      type: atom.type,
      title: atom.title,
      content: atom.content,
      metadata: atom.metadata,
      tags: atom.tags ?? [],
      user_notes: atom.userNotes ?? '',
    });
    let result = await db.from('atoms').insert(row(atom.id)).select().single();
    if (result.error?.code === '23505') {
      // The extension gives every clip an id before its first try. If that id is already this user's atom, the
      // earlier try went through and only its reply was lost: return it instead of saving a second copy.
      const existing = await atomRow(atom.id);
      if (existing && existing.user_id === userId) return mapAtom(existing);
      // The id is taken by someone else's atom. Plain insert, so nothing is overwritten: use a new id.
      result = await db.from('atoms').insert(row(newId('atom'))).select().single();
    }
    return result.data ? mapAtom(result.data) : null;
  }

  async function updateAtom(userId: string, id: string, patch: Record<string, unknown>): Promise<ResearchAtom | null> {
    const row = await atomRow(id);
    if (!row || !canWrite(await roleOn(userId, row.project_id))) return null;
    const { data } = await db.from('atoms').update(patch).eq('id', id).select().maybeSingle();
    return data ? mapAtom(data) : null;
  }

  async function deleteAtom(userId: string, id: string): Promise<boolean> {
    const row = await atomRow(id);
    if (!row || !canWrite(await roleOn(userId, row.project_id))) return false;
    const { data } = await db.from('atoms').delete().eq('id', id).select('id');
    return Array.isArray(data) && data.length > 0;
  }

  // ── Documents ────────────────────────────────────────────────────────────────
  const docOf = (row: any): ResearchDocument => ({ ...(row.data ?? {}), id: row.id, projectId: row.project_id } as ResearchDocument);

  async function listDocuments(userId: string, scope?: string): Promise<ResearchDocument[]> {
    const ids = await scopeIds(userId, scope);
    if (ids.length === 0) return [];
    const { data } = await db.from('documents').select('*').in('project_id', ids).order('uploaded_at', { ascending: false });
    return (data ?? []).map(docOf);
  }

  async function documentRow(id: string) {
    const { data } = await db.from('documents').select('*').eq('id', id).maybeSingle();
    return data ?? null;
  }

  async function getDocument(userId: string, id: string): Promise<ResearchDocument | null> {
    const row = await documentRow(id);
    if (!row || !canRead(await roleOn(userId, row.project_id))) return null;
    return docOf(row);
  }

  async function addDocument(userId: string, doc: ResearchDocument): Promise<ResearchDocument | null> {
    if (!canWrite(await roleOn(userId, doc.projectId))) return null;
    const { id, projectId, ...rest } = doc as any;
    const { data } = await db
      .from('documents')
      .insert({ id, user_id: userId, project_id: projectId, title: doc.title, data: rest })
      .select()
      .single();
    return data ? docOf(data) : null;
  }

  async function deleteDocument(userId: string, id: string): Promise<boolean> {
    const row = await documentRow(id);
    if (!row || !canWrite(await roleOn(userId, row.project_id))) return false;
    const { data } = await db.from('documents').delete().eq('id', id).select('id');
    return Array.isArray(data) && data.length > 0;
  }

  async function updateDocumentCitation(userId: string, id: string, citation: CitationRecord): Promise<ResearchDocument | null> {
    const row = await documentRow(id);
    if (!row || !canWrite(await roleOn(userId, row.project_id))) return null;
    const { data } = await db.from('documents').update({ data: { ...(row.data ?? {}), citation } }).eq('id', id).select().maybeSingle();
    return data ? docOf(data) : null;
  }

  return {
    roleOn,
    ownsProject,
    projectFamily,
    resolveProjectId,
    listProjects,
    createProject,
    deleteProject,
    listAtoms,
    getAtom,
    insertAtom,
    updateAtom,
    deleteAtom,
    listDocuments,
    getDocument,
    addDocument,
    deleteDocument,
    updateDocumentCitation,
  };
}

export type Cloud = ReturnType<typeof makeCloud>;
