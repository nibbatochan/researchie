// Papers when AUTH_REQUIRED is off: one person, one JSON file next to .research-store.json. Same interface as
// makePapers in papers.ts, so the API routes do not care which one they talk to.
import fs from 'fs';
import path from 'path';
import { validatePatch, MAX_TITLE, type NewPaper, type Paper, type PaperPatch, type PaperResult, type PaperSummary, type Papers } from './papers.ts';

const FILE = path.join(process.cwd(), '.papers-store.json');

function read(): Paper[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as Paper[];
  } catch {
    return [];
  }
}

function write(papers: Paper[]): void {
  fs.writeFileSync(FILE, JSON.stringify(papers), 'utf8');
}

const summary = ({ doc: _doc, meta: _meta, ...rest }: Paper): PaperSummary => rest;
const byNewest = (a: Paper, b: Paper) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id);
const fail = (code: 'NOT_FOUND' | 'INVALID' | 'TOO_LARGE' | 'CONFLICT', reason: string) => ({ ok: false as const, code, reason });

export function makeLocalPapers(): Papers {
  const patchOf = (checked: Record<string, unknown>): Partial<Paper> => ({
    ...(checked.title !== undefined && { title: checked.title as string }),
    ...(checked.template_id !== undefined && { templateId: checked.template_id as string }),
    ...(checked.citation_style !== undefined && { citationStyle: checked.citation_style as string }),
    ...(checked.project_id !== undefined && { projectId: checked.project_id as string | null }),
    ...(checked.doc !== undefined && { doc: checked.doc }),
    ...(checked.meta !== undefined && { meta: checked.meta }),
  });

  async function list(_userId: string, { trash = false } = {}) {
    return read().filter((p) => Boolean(p.deletedAt) === trash).sort(byNewest).map(summary);
  }
  async function get(_userId: string, id: string) {
    return read().find((p) => p.id === id) ?? null;
  }
  async function create(_userId: string, input: NewPaper): Promise<PaperResult<Paper>> {
    const checked = validatePatch({ title: 'Untitled paper', templateId: 'blank', citationStyle: 'apa', ...input });
    if (!checked.ok) return checked;
    const now = new Date().toISOString();
    const paper: Paper = {
      id: crypto.randomUUID(),
      projectId: null,
      title: 'Untitled paper',
      templateId: 'blank',
      citationStyle: 'apa',
      doc: {},
      meta: {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...patchOf(checked.value),
    };
    write([...read(), paper]);
    return { ok: true, value: paper };
  }
  async function update(_userId: string, id: string, patch: PaperPatch, baseUpdatedAt?: string): Promise<PaperResult<Paper>> {
    const checked = validatePatch(patch);
    if (!checked.ok) return checked;
    const all = read();
    const i = all.findIndex((p) => p.id === id && !p.deletedAt);
    if (i < 0) return fail('NOT_FOUND', 'Paper not found.');
    if (baseUpdatedAt && all[i].updatedAt !== baseUpdatedAt) return fail('CONFLICT', 'This paper was changed in another tab or window. Load that version, or keep yours.');
    all[i] = { ...all[i], ...patchOf(checked.value), updatedAt: new Date().toISOString() };
    write(all);
    return { ok: true, value: all[i] };
  }
  async function duplicate(userId: string, id: string): Promise<PaperResult<Paper>> {
    const source = await get(userId, id);
    if (!source || source.deletedAt) return fail('NOT_FOUND', 'Paper not found.');
    return create(userId, { ...source, title: `${source.title} (copy)`.slice(0, MAX_TITLE) });
  }
  async function setDeleted(id: string, deletedAt: string | null) {
    const all = read();
    const p = all.find((x) => x.id === id);
    if (!p) return false;
    p.deletedAt = deletedAt;
    write(all);
    return true;
  }
  const softDelete = async (_userId: string, id: string) => setDeleted(id, new Date().toISOString());
  const restore = async (_userId: string, id: string) => setDeleted(id, null);
  async function purge(_userId: string, id: string) {
    const all = read();
    const keep = all.filter((p) => !(p.id === id && p.deletedAt));
    if (keep.length === all.length) return false;
    write(keep);
    return true;
  }

  return { list, get, create, update, duplicate, softDelete, restore, purge };
}
