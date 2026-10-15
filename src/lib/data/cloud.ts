// The per-user data layer for the tester deployment (AUTH_REQUIRED=true). Everything lives in Supabase and
// every query is filtered by the signed-in user's id, so one user can never read or change another's rows.
// The Next.js server uses the service-role key (which skips row-level security), so these filters are the
// real lock; the policies in supabase/migrations/001_multi_user.sql are the second one.
//
// makeCloud takes the database client as a parameter so the isolation rules can be tested with a fake.
import { randomUUID } from 'node:crypto';
import type { ResearchAtom, ResearchDocument, ResearchProject } from '../types/research';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export const STARTER_PROJECT_TITLE = 'My first project';

const newId = (prefix: string) => `${prefix}-${randomUUID().replace(/-/g, '').slice(0, 12)}`;

export function mapProject(p: any): ResearchProject {
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
  async function ownsProject(userId: string, projectId: string): Promise<boolean> {
    if (!projectId) return false;
    const { data } = await db.from('projects').select('id').eq('id', projectId).eq('user_id', userId).maybeSingle();
    return Boolean(data);
  }

  /** The project and its sub-projects, only those the user owns. */
  async function projectFamily(userId: string, projectId: string): Promise<string[]> {
    const { data } = await db.from('projects').select('id, parent_id').eq('user_id', userId);
    const rows: Array<{ id: string; parent_id: string | null }> = data ?? [];
    if (!rows.some((r) => r.id === projectId)) return [];
    return [projectId, ...rows.filter((r) => r.parent_id === projectId).map((r) => r.id)];
  }

  // The app's "all projects" view and the extension's default both use the demo id 'proj-ai-main'. A real user
  // does not own it, so for saving it means "my first project" and for listing it means "everything of mine".
  const DEMO_ID = 'proj-ai-main';

  async function resolveProjectId(userId: string, projectId: string): Promise<string> {
    if (projectId && projectId !== 'all' && projectId !== DEMO_ID) return projectId;
    if (projectId === DEMO_ID && (await ownsProject(userId, DEMO_ID))) return DEMO_ID;
    const roots = (await listProjects(userId)).filter((p) => !p.parentId);
    roots.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return roots[0]?.id ?? projectId;
  }

  async function scopeOf(userId: string, projectId?: string): Promise<string | undefined> {
    if (projectId === DEMO_ID && !(await ownsProject(userId, DEMO_ID))) return 'all';
    return projectId;
  }

  async function listProjects(userId: string): Promise<ResearchProject[]> {
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
    return (data ?? []).map(mapProject);
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
    return mapProject(data);
  }

  async function deleteProject(userId: string, projectId: string): Promise<boolean> {
    if (!(await ownsProject(userId, projectId))) return false;
    await db.from('atoms').delete().eq('project_id', projectId).eq('user_id', userId);
    await db.from('documents').delete().eq('project_id', projectId).eq('user_id', userId);
    await db.from('projects').delete().eq('id', projectId).eq('user_id', userId);
    return true;
  }

  async function listAtoms(userId: string, scope?: string): Promise<ResearchAtom[]> {
    const projectId = await scopeOf(userId, scope);
    let query = db.from('atoms').select('*').eq('user_id', userId).order('captured_at', { ascending: false });
    if (projectId && projectId !== 'all') {
      const ids = await projectFamily(userId, projectId);
      if (ids.length === 0) return [];
      query = query.in('project_id', ids);
    }
    const { data } = await query;
    return (data ?? []).map(mapAtom);
  }

  async function getAtom(userId: string, id: string): Promise<ResearchAtom | null> {
    const { data } = await db.from('atoms').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    return data ? mapAtom(data) : null;
  }

  /** Returns null when the project is not the user's. Never overwrites an existing atom. */
  async function insertAtom(userId: string, atom: ResearchAtom): Promise<ResearchAtom | null> {
    if (!(await ownsProject(userId, atom.projectId))) return null;
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
      // The id is taken (maybe by someone else's atom). Plain insert, so nothing is overwritten: use a new id.
      result = await db.from('atoms').insert(row(newId('atom'))).select().single();
    }
    return result.data ? mapAtom(result.data) : null;
  }

  async function updateAtom(userId: string, id: string, patch: Record<string, unknown>): Promise<ResearchAtom | null> {
    const { data } = await db.from('atoms').update(patch).eq('id', id).eq('user_id', userId).select().maybeSingle();
    return data ? mapAtom(data) : null;
  }

  async function deleteAtom(userId: string, id: string): Promise<boolean> {
    const { data } = await db.from('atoms').delete().eq('id', id).eq('user_id', userId).select('id');
    return Array.isArray(data) && data.length > 0;
  }

  // ── Documents ────────────────────────────────────────────────────────────────
  const docOf = (row: any): ResearchDocument => ({ ...(row.data ?? {}), id: row.id, projectId: row.project_id } as ResearchDocument);

  async function listDocuments(userId: string, scope?: string): Promise<ResearchDocument[]> {
    const projectId = await scopeOf(userId, scope);
    let query = db.from('documents').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false });
    if (projectId && projectId !== 'all') {
      const ids = await projectFamily(userId, projectId);
      if (ids.length === 0) return [];
      query = query.in('project_id', ids);
    }
    const { data } = await query;
    return (data ?? []).map(docOf);
  }

  async function getDocument(userId: string, id: string): Promise<ResearchDocument | null> {
    const { data } = await db.from('documents').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    return data ? docOf(data) : null;
  }

  async function addDocument(userId: string, doc: ResearchDocument): Promise<ResearchDocument | null> {
    if (!(await ownsProject(userId, doc.projectId))) return null;
    const { id, projectId, ...rest } = doc as any;
    const { data } = await db
      .from('documents')
      .insert({ id, user_id: userId, project_id: projectId, title: doc.title, data: rest })
      .select()
      .single();
    return data ? docOf(data) : null;
  }

  async function deleteDocument(userId: string, id: string): Promise<boolean> {
    const { data } = await db.from('documents').delete().eq('id', id).eq('user_id', userId).select('id');
    return Array.isArray(data) && data.length > 0;
  }

  return {
    ownsProject,
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
  };
}

export type Cloud = ReturnType<typeof makeCloud>;
