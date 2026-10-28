// The Paper Mode workspace: every paper a person wrote (Phase A of docs/research/paper-mode-workspace.md).
// makePapers takes the database client so it can be tested with a fake, like the rest of the data layer.
// A paper is private to its owner; every query is filtered by user_id. The data-source project is only checked
// when the paper is created or pointed at a new project: the person must be able to read it.
import { canRead, type Role } from './roles.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export interface PaperSummary {
  id: string;
  projectId: string | null;
  title: string;
  templateId: string;
  citationStyle: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Paper extends PaperSummary {
  doc: unknown;
  meta: unknown;
}

export interface NewPaper {
  title?: string;
  templateId?: string;
  citationStyle?: string;
  projectId?: string | null;
  doc?: unknown;
  meta?: unknown;
}

export type PaperPatch = Partial<NewPaper>;

export type PaperResult<T> = { ok: true; value: T } | { ok: false; code: 'NOT_FOUND' | 'INVALID' | 'TOO_LARGE' | 'CONFLICT'; reason: string };

/** The editor document and front matter together may not pass this. The paper is refused, never cut down. */
export const MAX_PAPER_BYTES = 2 * 1024 * 1024;
export const MAX_TITLE = 200;

const ID_FORMAT = /^[a-z0-9][a-z0-9-]{0,39}$/;
const SUMMARY_COLUMNS = 'id, project_id, title, template_id, citation_style, created_at, updated_at, deleted_at';

const mapSummary = (r: any): PaperSummary => ({
  id: r.id,
  projectId: r.project_id ?? null,
  title: r.title,
  templateId: r.template_id,
  citationStyle: r.citation_style,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at ?? null,
});

const mapPaper = (r: any): Paper => ({ ...mapSummary(r), doc: r.doc ?? {}, meta: r.meta ?? {} });

const fail = (code: 'NOT_FOUND' | 'INVALID' | 'TOO_LARGE' | 'CONFLICT', reason: string) => ({ ok: false as const, code, reason });

/** Checks the fields a caller may set. Returns the database columns to write, or the reason it can not be saved. */
export function validatePatch(input: PaperPatch): PaperResult<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = String(input.title).trim();
    if (!title) return fail('INVALID', 'A paper needs a name.');
    out.title = title.slice(0, MAX_TITLE);
  }
  if (input.templateId !== undefined) {
    if (!ID_FORMAT.test(String(input.templateId))) return fail('INVALID', 'That template is not known.');
    out.template_id = input.templateId;
  }
  if (input.citationStyle !== undefined) {
    if (!ID_FORMAT.test(String(input.citationStyle))) return fail('INVALID', 'That citation style is not known.');
    out.citation_style = input.citationStyle;
  }
  if (input.projectId !== undefined) out.project_id = input.projectId ? String(input.projectId).slice(0, 200) : null;
  if (input.doc !== undefined) out.doc = input.doc;
  if (input.meta !== undefined) out.meta = input.meta;
  const bytes = new TextEncoder().encode(JSON.stringify({ d: out.doc ?? null, m: out.meta ?? null })).length;
  if (bytes > MAX_PAPER_BYTES) {
    return fail('TOO_LARGE', `This paper is ${(bytes / 1024 / 1024).toFixed(1)} MB, over the ${MAX_PAPER_BYTES / 1024 / 1024} MB that can be saved. Remove large pasted images and try again.`);
  }
  return { ok: true, value: out };
}

export function makePapers(db: Db, roleOn: (userId: string, projectId: string) => Promise<Role | null>) {
  async function mayUse(userId: string, projectId: string | null | undefined): Promise<boolean> {
    if (!projectId) return true;
    return canRead(await roleOn(userId, projectId));
  }

  /** The person's papers, newest edit first, without the document body. `trash` lists the deleted ones instead. */
  async function list(userId: string, { trash = false } = {}): Promise<PaperSummary[]> {
    const q = db.from('papers').select(SUMMARY_COLUMNS).eq('user_id', userId);
    const { data } = await (trash ? q.not('deleted_at', 'is', null) : q.is('deleted_at', null))
      .order('updated_at', { ascending: false })
      .order('id', { ascending: false });
    return (data ?? []).map(mapSummary);
  }

  async function get(userId: string, id: string): Promise<Paper | null> {
    const { data } = await db.from('papers').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    return data ? mapPaper(data) : null;
  }

  async function create(userId: string, input: NewPaper): Promise<PaperResult<Paper>> {
    const checked = validatePatch({ title: 'Untitled paper', templateId: 'blank', citationStyle: 'apa', ...input });
    if (!checked.ok) return checked;
    if (!(await mayUse(userId, input.projectId))) return fail('NOT_FOUND', 'That project was not found.');
    const { data, error } = await db.from('papers').insert({ user_id: userId, ...checked.value }).select('*').single();
    if (error || !data) return fail('INVALID', 'The paper could not be saved. Try again.');
    return { ok: true, value: mapPaper(data) };
  }

  /**
   * Saves the fields given. With `baseUpdatedAt` (the updatedAt the editor last saw) the save only goes through if
   * nobody changed the paper since: another tab's save gives CONFLICT instead of being written over silently.
   */
  async function update(userId: string, id: string, patch: PaperPatch, baseUpdatedAt?: string): Promise<PaperResult<Paper>> {
    const checked = validatePatch(patch);
    if (!checked.ok) return checked;
    if (patch.projectId && !(await mayUse(userId, patch.projectId))) return fail('NOT_FOUND', 'That project was not found.');
    let q = db
      .from('papers')
      .update({ ...checked.value, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (baseUpdatedAt) q = q.eq('updated_at', baseUpdatedAt);
    const { data } = await q.select('*');
    if (!Array.isArray(data) || data.length === 0) {
      if (baseUpdatedAt && (await get(userId, id))?.deletedAt === null) {
        return fail('CONFLICT', 'This paper was changed in another tab or window. Load that version, or keep yours.');
      }
      return fail('NOT_FOUND', 'Paper not found.');
    }
    return { ok: true, value: mapPaper(data[0]) };
  }

  /** A copy for another journal or a second version. Starts with " (copy)" in its name. */
  async function duplicate(userId: string, id: string): Promise<PaperResult<Paper>> {
    const source = await get(userId, id);
    if (!source || source.deletedAt) return fail('NOT_FOUND', 'Paper not found.');
    return create(userId, {
      title: `${source.title} (copy)`.slice(0, MAX_TITLE),
      templateId: source.templateId,
      citationStyle: source.citationStyle,
      projectId: source.projectId,
      doc: source.doc,
      meta: source.meta,
    });
  }

  async function setDeleted(userId: string, id: string, deletedAt: string | null): Promise<boolean> {
    const { data } = await db.from('papers').update({ deleted_at: deletedAt }).eq('id', id).eq('user_id', userId).select('id');
    return Array.isArray(data) && data.length > 0;
  }

  /** Moves a paper to the trash. It can be restored (the undo toast and the trash drawer both use this). */
  const softDelete = (userId: string, id: string) => setDeleted(userId, id, new Date().toISOString());
  const restore = (userId: string, id: string) => setDeleted(userId, id, null);

  /** Removes a paper for good. Only a paper already in the trash can be purged. */
  async function purge(userId: string, id: string): Promise<boolean> {
    const { data } = await db.from('papers').delete().eq('id', id).eq('user_id', userId).not('deleted_at', 'is', null).select('id');
    return Array.isArray(data) && data.length > 0;
  }

  /** Removes every paper in the trash for good. Returns how many were removed. */
  async function purgeTrash(userId: string): Promise<number> {
    const { data } = await db.from('papers').delete().eq('user_id', userId).not('deleted_at', 'is', null).select('id');
    return Array.isArray(data) ? data.length : 0;
  }

  return { list, get, create, update, duplicate, softDelete, restore, purge, purgeTrash };
}

export type Papers = ReturnType<typeof makePapers>;
