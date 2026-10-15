import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCloud, STARTER_PROJECT_TITLE } from '../src/lib/data/cloud.ts';
import { makeFakeDb } from './helpers/fakeDb.mjs';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

const atom = (id, projectId, extra = {}) => ({ id, projectId, type: 'note', title: `atom ${id}`, content: { text: id }, metadata: {}, tags: [], ...extra });

async function setup() {
  const db = makeFakeDb();
  const cloud = makeCloud(db);
  const alice = (await cloud.listProjects(ALICE))[0];
  const bob = (await cloud.listProjects(BOB))[0];
  return { db, cloud, alice, bob };
}

test('a new user gets exactly one starter project, even when asked twice at once', async () => {
  const db = makeFakeDb();
  const cloud = makeCloud(db);
  const [a, b] = await Promise.all([cloud.listProjects(ALICE), cloud.listProjects(ALICE)]);
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  assert.equal(a[0].title, STARTER_PROJECT_TITLE);
  assert.equal(db.tables.projects.filter((p) => p.user_id === ALICE).length, 1);
  assert.equal(a[0].userId, ALICE);
});

test("each user sees only their own projects", async () => {
  const { cloud, alice, bob } = await setup();
  assert.notEqual(alice.id, bob.id);
  assert.deepEqual((await cloud.listProjects(ALICE)).map((p) => p.id), [alice.id]);
  assert.deepEqual((await cloud.listProjects(BOB)).map((p) => p.id), [bob.id]);
});

test("a user cannot put an atom into someone else's project", async () => {
  const { cloud, alice, bob, db } = await setup();
  const result = await cloud.insertAtom(BOB, atom('x1', alice.id));
  assert.equal(result, null);
  assert.equal(db.tables.atoms.length, 0);
  const own = await cloud.insertAtom(BOB, atom('x2', bob.id));
  assert.equal(own.projectId, bob.id);
  assert.equal(own.userId, BOB);
});

test('atom lists, reads, edits and deletes are scoped to the owner', async () => {
  const { cloud, alice, bob } = await setup();
  await cloud.insertAtom(ALICE, atom('a1', alice.id));
  await cloud.insertAtom(BOB, atom('b1', bob.id));

  assert.deepEqual((await cloud.listAtoms(ALICE)).map((a) => a.id), ['a1']);
  assert.deepEqual((await cloud.listAtoms(BOB, 'all')).map((a) => a.id), ['b1']);
  assert.deepEqual(await cloud.listAtoms(BOB, alice.id), []); // asking for another user's project gives nothing

  assert.equal(await cloud.getAtom(BOB, 'a1'), null);
  assert.equal(await cloud.updateAtom(BOB, 'a1', { title: 'hacked' }), null);
  assert.equal((await cloud.getAtom(ALICE, 'a1')).title, 'atom a1');
  assert.equal(await cloud.deleteAtom(BOB, 'a1'), false);
  assert.equal((await cloud.listAtoms(ALICE)).length, 1);

  assert.equal((await cloud.updateAtom(ALICE, 'a1', { title: 'mine' })).title, 'mine');
  assert.equal(await cloud.deleteAtom(ALICE, 'a1'), true);
  assert.equal((await cloud.listAtoms(ALICE)).length, 0);
});

test('reusing an atom id never overwrites or exposes another user\'s atom', async () => {
  const { cloud, alice, bob } = await setup();
  await cloud.insertAtom(ALICE, atom('same', alice.id, { title: 'alice original' }));
  const bobs = await cloud.insertAtom(BOB, atom('same', bob.id, { title: 'bob copy' }));
  assert.notEqual(bobs.id, 'same'); // got a new id instead
  assert.equal((await cloud.getAtom(ALICE, 'same')).title, 'alice original');
  assert.equal(await cloud.getAtom(BOB, 'same'), null);
});

test('sub-projects are included when listing a parent, but only your own', async () => {
  const { cloud, alice, bob } = await setup();
  const child = await cloud.createProject(ALICE, { title: 'child', parentId: alice.id });
  assert.equal(child.parentId, alice.id);
  assert.equal(await cloud.createProject(BOB, { title: 'sneaky', parentId: alice.id }), null); // not Bob's parent

  await cloud.insertAtom(ALICE, atom('p', alice.id));
  await cloud.insertAtom(ALICE, atom('c', child.id));
  await cloud.insertAtom(BOB, atom('b', bob.id));
  assert.deepEqual((await cloud.listAtoms(ALICE, alice.id)).map((a) => a.id).sort(), ['c', 'p']);
  assert.deepEqual((await cloud.listAtoms(ALICE, child.id)).map((a) => a.id), ['c']);
});

test("deleting a project removes its atoms and documents, and only for its owner", async () => {
  const { cloud, alice, bob } = await setup();
  await cloud.insertAtom(ALICE, atom('a1', alice.id));
  await cloud.addDocument(ALICE, { id: 'd1', projectId: alice.id, title: 'Doc', pages: [] });
  assert.equal(await cloud.deleteProject(BOB, alice.id), false);
  assert.equal((await cloud.listAtoms(ALICE)).length, 1);
  assert.equal(await cloud.deleteProject(ALICE, alice.id), true);
  assert.equal((await cloud.listAtoms(ALICE)).length, 0);
  assert.equal(await cloud.getDocument(ALICE, 'd1'), null);
  assert.equal((await cloud.listProjects(BOB)).length, 1);
  assert.equal((await cloud.listProjects(BOB))[0].id, bob.id);
});

test("the demo project id means 'my first project' for saving and 'everything of mine' for listing", async () => {
  const { cloud, alice, bob } = await setup();
  const second = await cloud.createProject(ALICE, { title: 'second' });
  assert.equal(await cloud.resolveProjectId(ALICE, 'proj-ai-main'), alice.id); // oldest root project
  assert.equal(await cloud.resolveProjectId(ALICE, 'all'), alice.id);
  assert.equal(await cloud.resolveProjectId(ALICE, second.id), second.id); // a real id is left alone
  assert.equal(await cloud.resolveProjectId(BOB, 'proj-ai-main'), bob.id); // never another user's

  await cloud.insertAtom(ALICE, atom('x1', await cloud.resolveProjectId(ALICE, 'proj-ai-main')));
  await cloud.insertAtom(ALICE, atom('x2', second.id));
  await cloud.insertAtom(BOB, atom('y1', bob.id));
  assert.deepEqual((await cloud.listAtoms(ALICE, 'proj-ai-main')).map((a) => a.id).sort(), ['x1', 'x2']);
  assert.deepEqual((await cloud.listAtoms(BOB, 'proj-ai-main')).map((a) => a.id), ['y1']);
});

test('documents are private to their owner', async () => {
  const { cloud, alice, bob } = await setup();
  const doc = await cloud.addDocument(ALICE, { id: 'd1', projectId: alice.id, title: 'Paper', pages: [{ pageNumber: 1, content: 'hello' }] });
  assert.equal(doc.id, 'd1');
  assert.equal(doc.projectId, alice.id);
  assert.equal(doc.pages[0].content, 'hello');
  assert.equal(await cloud.addDocument(BOB, { id: 'd2', projectId: alice.id, title: 'Plant', pages: [] }), null);
  assert.equal(await cloud.getDocument(BOB, 'd1'), null);
  assert.deepEqual(await cloud.listDocuments(BOB), []);
  assert.deepEqual((await cloud.listDocuments(ALICE)).map((d) => d.id), ['d1']);
  assert.equal(await cloud.deleteDocument(BOB, 'd1'), false);
  assert.equal(await cloud.deleteDocument(ALICE, 'd1'), true);
});
