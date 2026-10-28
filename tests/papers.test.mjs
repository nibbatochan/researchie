import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCloud } from '../src/lib/data/cloud.ts';
import { makePapers, validatePatch, MAX_PAPER_BYTES } from '../src/lib/data/papers.ts';
import { makeFakeDb } from './helpers/fakeDb.mjs';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

async function setup() {
  const db = makeFakeDb({
    profiles: [
      { id: ALICE, email: 'alice@example.com', full_name: 'Alice' },
      { id: BOB, email: 'bob@example.com', full_name: 'Bob' },
    ],
  });
  const cloud = makeCloud(db);
  const papers = makePapers(db, cloud.roleOn);
  const project = (await cloud.listProjects(ALICE))[0];
  return { db, cloud, papers, project };
}

test('a new paper starts blank and shows in the list without its document', async () => {
  const { papers } = await setup();
  const r = await papers.create(ALICE, { title: 'Sleep and memory' });
  assert.equal(r.ok, true);
  assert.equal(r.value.templateId, 'blank');
  assert.equal(r.value.citationStyle, 'apa');
  const [row] = await papers.list(ALICE);
  assert.equal(row.title, 'Sleep and memory');
  assert.equal('doc' in row, false);
});

test('a paper is private: another person can not list, read, change or delete it', async () => {
  const { papers } = await setup();
  const { value } = await papers.create(ALICE, { title: 'Mine' });
  assert.deepEqual(await papers.list(BOB), []);
  assert.equal(await papers.get(BOB, value.id), null);
  assert.equal((await papers.update(BOB, value.id, { title: 'Stolen' })).ok, false);
  assert.equal(await papers.softDelete(BOB, value.id), false);
  assert.equal((await papers.get(ALICE, value.id)).title, 'Mine');
});

test('the data source must be a project the person can read', async () => {
  const { papers, project } = await setup();
  assert.equal((await papers.create(ALICE, { projectId: project.id })).ok, true);
  const bad = await papers.create(BOB, { projectId: project.id });
  assert.equal(bad.ok, false);
  assert.equal(bad.code, 'NOT_FOUND');
  assert.equal((await papers.create(ALICE, {})).ok, true); // a paper with no data source is allowed
});

test('saving changes keeps the document and bumps the edit time', async () => {
  const { papers } = await setup();
  const { value } = await papers.create(ALICE, { title: 'A' });
  const saved = await papers.update(ALICE, value.id, { doc: { type: 'doc', content: [] }, title: 'B' });
  assert.equal(saved.ok, true);
  const back = await papers.get(ALICE, value.id);
  assert.equal(back.title, 'B');
  assert.deepEqual(back.doc, { type: 'doc', content: [] });
  assert.ok(back.updatedAt >= value.updatedAt);
});

test('delete goes to the trash, restore brings it back, purge removes it for good', async () => {
  const { papers } = await setup();
  const { value } = await papers.create(ALICE, { title: 'Gone soon' });
  assert.equal(await papers.purge(ALICE, value.id), false); // not in the trash yet
  assert.equal(await papers.softDelete(ALICE, value.id), true);
  assert.deepEqual(await papers.list(ALICE), []);
  assert.equal((await papers.list(ALICE, { trash: true })).length, 1);
  assert.equal((await papers.update(ALICE, value.id, { title: 'x' })).ok, false); // a trashed paper is not edited
  assert.equal(await papers.restore(ALICE, value.id), true);
  assert.equal((await papers.list(ALICE)).length, 1);
  await papers.softDelete(ALICE, value.id);
  assert.equal(await papers.purge(ALICE, value.id), true);
  assert.equal((await papers.list(ALICE, { trash: true })).length, 0);
});

test('duplicate copies the document and style under a new name', async () => {
  const { papers } = await setup();
  const { value } = await papers.create(ALICE, { title: 'Draft', citationStyle: 'ieee', doc: { n: 1 } });
  const copy = await papers.duplicate(ALICE, value.id);
  assert.equal(copy.ok, true);
  assert.notEqual(copy.value.id, value.id);
  assert.equal(copy.value.title, 'Draft (copy)');
  assert.equal(copy.value.citationStyle, 'ieee');
  assert.deepEqual(copy.value.doc, { n: 1 });
  assert.equal((await papers.duplicate(BOB, value.id)).ok, false);
});

test('bad input is refused, and an oversized paper is refused rather than cut', async () => {
  assert.equal(validatePatch({ title: '   ' }).ok, false);
  assert.equal(validatePatch({ templateId: 'Not Valid!' }).ok, false);
  assert.equal(validatePatch({ citationStyle: '../x' }).ok, false);
  const big = validatePatch({ doc: { text: 'x'.repeat(MAX_PAPER_BYTES) } });
  assert.equal(big.ok, false);
  assert.equal(big.code, 'TOO_LARGE');
  assert.equal(validatePatch({ title: 'ok', templateId: 'imrad', citationStyle: 'apa' }).ok, true);
});

test('a save with a stale baseUpdatedAt is refused instead of overwriting, and the current one goes through', async () => {
  const { papers } = await setup();
  const { value } = await papers.create(ALICE, { title: 'Shared tab' });
  await new Promise((r) => setTimeout(r, 5)); // updatedAt has millisecond precision
  const first = await papers.update(ALICE, value.id, { title: 'From tab A' }, value.updatedAt);
  assert.equal(first.ok, true);
  await new Promise((r) => setTimeout(r, 5)); // updatedAt moves on at millisecond precision
  const stale = await papers.update(ALICE, value.id, { title: 'From tab B' }, value.updatedAt);
  assert.equal(stale.ok, false);
  assert.equal(stale.code, 'CONFLICT');
  assert.equal((await papers.get(ALICE, value.id)).title, 'From tab A');
  const current = await papers.update(ALICE, value.id, { title: 'From tab B' }, first.value.updatedAt);
  assert.equal(current.ok, true);
});

test('a save with no baseUpdatedAt still goes through (keep mine), and a deleted paper is not found, not a conflict', async () => {
  const { papers } = await setup();
  const { value } = await papers.create(ALICE, { title: 'X' });
  assert.equal((await papers.update(ALICE, value.id, { title: 'Y' })).ok, true);
  await papers.softDelete(ALICE, value.id);
  const gone = await papers.update(ALICE, value.id, { title: 'Z' }, value.updatedAt);
  assert.equal(gone.code, 'NOT_FOUND');
});
