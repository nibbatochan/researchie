// Run: node --test --no-warnings tests/cloud-document-citation.test.mjs
// Setting a saved PDF's citation (from an imported reference) on the accounts store: only someone who may edit
// the project can do it, the rest of the document is untouched, and nobody else's document can be reached.

import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCloud } from '../src/lib/data/cloud.ts';
import { makeFakeDb } from './helpers/fakeDb.mjs';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CARA = '33333333-3333-3333-3333-333333333333';

const citation = (over = {}) => ({ status: 'manual', sourceType: 'journal_article', resolvedFrom: 'import', authors: [{ family: 'Lee' }], missingFields: [], title: 'Sleep', year: 2020, ...over });
const doc = (id, projectId) => ({ id, projectId, title: 'A PDF', filename: 'a.pdf', totalPages: 1, pages: [{ pageNumber: 1, content: 'text' }], uploadedAt: new Date().toISOString(), tags: [] });

async function setup() {
  const db = makeFakeDb();
  const cloud = makeCloud(db);
  const alice = (await cloud.listProjects(ALICE))[0];
  await cloud.listProjects(BOB);
  await cloud.addDocument(ALICE, doc('d1', alice.id));
  return { db, cloud, alice };
}

test('the owner can set the citation, and the rest of the document is kept', async () => {
  const { cloud } = await setup();
  const updated = await cloud.updateDocumentCitation(ALICE, 'd1', citation());
  assert.equal(updated.citation.title, 'Sleep');
  const read = await cloud.getDocument(ALICE, 'd1');
  assert.equal(read.citation.resolvedFrom, 'import');
  assert.equal(read.title, 'A PDF');
  assert.equal(read.pages[0].content, 'text');
  assert.equal(read.totalPages, 1);
});

test('someone else can not change a document they do not own, and it stays as it was', async () => {
  const { cloud } = await setup();
  assert.equal(await cloud.updateDocumentCitation(BOB, 'd1', citation({ title: 'hacked' })), null);
  assert.equal((await cloud.getDocument(ALICE, 'd1')).citation, undefined);
});

test('a document that does not exist returns null', async () => {
  const { cloud } = await setup();
  assert.equal(await cloud.updateDocumentCitation(ALICE, 'nope', citation()), null);
});

test('a second citation replaces the first', async () => {
  const { cloud } = await setup();
  await cloud.updateDocumentCitation(ALICE, 'd1', citation({ title: 'First' }));
  await cloud.updateDocumentCitation(ALICE, 'd1', citation({ title: 'Second' }));
  assert.equal((await cloud.getDocument(ALICE, 'd1')).citation.title, 'Second');
});

test('a member with edit access can set it; a viewer can not', async () => {
  const { cloud, db, alice } = await setup();
  db.tables.project_members = [
    { id: 'm1', project_id: alice.id, user_id: BOB, role: 'editor' },
    { id: 'm2', project_id: alice.id, user_id: CARA, role: 'viewer' },
  ];
  assert.equal((await cloud.updateDocumentCitation(CARA, 'd1', citation({ title: 'viewer' }))), null);
  assert.equal((await cloud.updateDocumentCitation(BOB, 'd1', citation({ title: 'editor' }))).citation.title, 'editor');
});
