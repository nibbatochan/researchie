import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCloud, readAllRows, PAGE_SIZE } from '../src/lib/data/cloud.ts';
import { makeFakeDb } from './helpers/fakeDb.mjs';

const ALICE = '11111111-1111-1111-1111-111111111111';

// The fake database caps every query at 1000 rows, as Supabase does, so a list that is not paged comes back short.
async function projectWith(n) {
  const db = makeFakeDb({}, { maxRows: PAGE_SIZE });
  const cloud = makeCloud(db);
  const project = (await cloud.listProjects(ALICE))[0];
  const same = '2026-10-18T10:00:00.000Z'; // equal timestamps: only the id tiebreak keeps pages consistent
  for (let i = 0; i < n; i++) {
    db.tables.atoms.push({ id: `a-${String(i).padStart(5, '0')}`, project_id: project.id, user_id: ALICE, type: 'note', title: `t${i}`, content: {}, metadata: {}, tags: [], user_notes: '', captured_at: same });
  }
  return { db, cloud, project };
}

test('a project with more than 1000 clips lists every one, once', async () => {
  const { cloud, project } = await projectWith(2350);
  const atoms = await cloud.listAtoms(ALICE, project.id);
  assert.equal(atoms.length, 2350);
  assert.equal(new Set(atoms.map((a) => a.id)).size, 2350);
});

test('exactly one full page and an empty second page do not loop or drop rows', async () => {
  const { cloud, project } = await projectWith(PAGE_SIZE);
  assert.equal((await cloud.listAtoms(ALICE, project.id)).length, PAGE_SIZE);
});

test('documents are paged the same way', async () => {
  const { db, cloud, project } = await projectWith(0);
  for (let i = 0; i < 1203; i++) {
    db.tables.documents.push({ id: `d-${String(i).padStart(5, '0')}`, project_id: project.id, user_id: ALICE, title: `d${i}`, data: {}, uploaded_at: '2026-10-18T10:00:00.000Z' });
  }
  const docs = await cloud.listDocuments(ALICE, project.id);
  assert.equal(docs.length, 1203);
  assert.equal(new Set(docs.map((d) => d.id)).size, 1203);
});

test('a page that fails throws instead of returning a partial list', async () => {
  let call = 0;
  const build = () => ({
    range: async () => (++call === 1 ? { data: new Array(10).fill({}), error: null } : { data: null, error: { message: 'boom' } }),
  });
  await assert.rejects(() => readAllRows(build, 10), /boom/);
});
