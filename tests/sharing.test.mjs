import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCloud } from '../src/lib/data/cloud.ts';
import { makeSharing } from '../src/lib/data/sharing.ts';
import { strongest, canRead, canWrite, canManage, cleanEmail, isSharedRole } from '../src/lib/data/roles.ts';
import { makeFakeDb } from './helpers/fakeDb.mjs';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CARA = '33333333-3333-3333-3333-333333333333';
const DAN = '44444444-4444-4444-4444-444444444444';

const atom = (id, projectId, extra = {}) => ({ id, projectId, type: 'note', title: `atom ${id}`, content: { text: id }, metadata: {}, tags: [], ...extra });

async function setup() {
  const db = makeFakeDb({
    profiles: [
      { id: ALICE, email: 'alice@example.com', full_name: 'Alice' },
      { id: BOB, email: 'bob@example.com', full_name: 'Bob' },
      { id: CARA, email: 'cara@example.com', full_name: 'Cara' },
    ],
  });
  const cloud = makeCloud(db);
  const sharing = makeSharing(db, cloud.roleOn);
  const project = (await cloud.listProjects(ALICE))[0];
  const child = await cloud.createProject(ALICE, { title: 'child', parentId: project.id });
  return { db, cloud, sharing, project, child };
}

// ── The role rules on their own ─────────────────────────────────────────────────

test('roles: the strongest wins, and each role allows what the design says', () => {
  assert.equal(strongest(['viewer', 'editor']), 'editor');
  assert.equal(strongest([null, 'viewer']), 'viewer');
  assert.equal(strongest(['owner', 'editor']), 'owner');
  assert.equal(strongest([]), null);
  assert.equal(strongest(['admin', undefined]), null);
  assert.deepEqual([canRead('viewer'), canWrite('viewer'), canManage('viewer')], [true, false, false]);
  assert.deepEqual([canRead('editor'), canWrite('editor'), canManage('editor')], [true, true, false]);
  assert.deepEqual([canRead('owner'), canWrite('owner'), canManage('owner')], [true, true, true]);
  assert.deepEqual([canRead(null), canWrite(null), canManage(null)], [false, false, false]);
});

test('emails are cleaned, and only editor and viewer can be given', () => {
  assert.equal(cleanEmail('  Bob@Example.COM '), 'bob@example.com');
  for (const bad of ['', 'bob', 'bob@x', 'a b@c.d', null, 42]) assert.equal(cleanEmail(bad), '');
  assert.equal(isSharedRole('editor'), true);
  assert.equal(isSharedRole('viewer'), true);
  assert.equal(isSharedRole('owner'), false);
  assert.equal(isSharedRole('admin'), false);
});

// ── What each role can do with clips and documents ──────────────────────────────

test('a viewer can read the project and its sub-projects but change nothing', async () => {
  const { cloud, sharing, project, child, db } = await setup();
  await cloud.insertAtom(ALICE, atom('a1', project.id));
  await cloud.insertAtom(ALICE, atom('a2', child.id));
  await cloud.addDocument(ALICE, { id: 'd1', projectId: project.id, title: 'Doc', pages: [] });
  assert.equal((await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer')).kind, 'added');

  assert.equal(await cloud.roleOn(BOB, project.id), 'viewer');
  assert.equal(await cloud.roleOn(BOB, child.id), 'viewer', 'sub-projects follow the project');
  assert.deepEqual((await cloud.listAtoms(BOB, project.id)).map((a) => a.id).sort(), ['a1', 'a2']);
  assert.equal((await cloud.getAtom(BOB, 'a1')).id, 'a1');
  assert.equal((await cloud.getDocument(BOB, 'd1')).id, 'd1');

  assert.equal(await cloud.insertAtom(BOB, atom('b1', project.id)), null);
  assert.equal(await cloud.updateAtom(BOB, 'a1', { title: 'x' }), null);
  assert.equal(await cloud.deleteAtom(BOB, 'a1'), false);
  assert.equal(await cloud.addDocument(BOB, { id: 'd2', projectId: project.id, title: 'No', pages: [] }), null);
  assert.equal(await cloud.deleteDocument(BOB, 'd1'), false);
  assert.equal(await cloud.deleteProject(BOB, project.id), false);
  assert.equal(await cloud.createProject(BOB, { title: 'sub', parentId: project.id }), null);
  assert.equal(db.tables.atoms.length, 2);
  assert.equal((await cloud.getAtom(ALICE, 'a1')).title, 'atom a1');
});

test('an editor can add, change and delete clips and documents, but not delete the project or change sharing', async () => {
  const { cloud, sharing, project, child } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'editor');

  const mine = await cloud.insertAtom(BOB, atom('b1', child.id));
  assert.equal(mine.userId, BOB, 'the clip is credited to the editor');
  assert.equal((await cloud.updateAtom(BOB, 'b1', { title: 'renamed' })).title, 'renamed');
  await cloud.insertAtom(ALICE, atom('a1', project.id));
  assert.equal((await cloud.updateAtom(BOB, 'a1', { title: 'edited by bob' })).title, 'edited by bob', "an editor may edit the owner's clip");
  assert.ok(await cloud.addDocument(BOB, { id: 'd1', projectId: project.id, title: 'Paper', pages: [] }));
  assert.equal(await cloud.deleteDocument(BOB, 'd1'), true);
  assert.equal(await cloud.deleteAtom(BOB, 'a1'), true);

  assert.equal(await cloud.deleteProject(BOB, project.id), false);
  assert.equal((await sharing.invite(BOB, project.id, 'cara@example.com', 'viewer')).code, 'NOT_ALLOWED');
  assert.equal((await sharing.removeMember(BOB, project.id, ALICE)).code, 'NOT_ALLOWED');
  assert.equal((await sharing.setRole(BOB, project.id, BOB, 'viewer')).code, 'NOT_ALLOWED');
  assert.equal(await cloud.createProject(BOB, { title: 'sub', parentId: project.id }), null, 'only the owner makes sub-projects');
});

test('a person with no access sees nothing, and "everything" only covers what they can reach', async () => {
  const { cloud, sharing, project } = await setup();
  await cloud.insertAtom(ALICE, atom('a1', project.id));
  const bobsOwn = (await cloud.listProjects(BOB))[0];
  await cloud.insertAtom(BOB, atom('b1', bobsOwn.id));

  assert.equal(await cloud.roleOn(CARA, project.id), null);
  assert.deepEqual(await cloud.listAtoms(CARA, project.id), []);
  assert.equal(await cloud.getAtom(CARA, 'a1'), null);
  assert.deepEqual((await cloud.listAtoms(BOB, 'all')).map((a) => a.id), ['b1']);

  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  assert.deepEqual((await cloud.listAtoms(BOB, 'all')).map((a) => a.id).sort(), ['a1', 'b1']);
});

// ── Lists, roles and removal ────────────────────────────────────────────────────

test('shared projects appear in the list with the person\'s role, after their own', async () => {
  const { cloud, sharing, project, child } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'editor');
  const list = await cloud.listProjects(BOB);
  const own = list.find((p) => p.role === 'owner');
  assert.ok(own);
  assert.deepEqual(list.filter((p) => p.role === 'editor').map((p) => p.id).sort(), [project.id, child.id].sort());
  assert.equal(list[0].role, 'owner', 'own projects come first');
  assert.equal((await cloud.listProjects(ALICE)).every((p) => p.role === 'owner'), true);
});

test('changing a role takes effect at once; removing someone ends their access at once', async () => {
  const { cloud, sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  assert.equal(await cloud.insertAtom(BOB, atom('b1', project.id)), null);

  assert.equal((await sharing.setRole(ALICE, project.id, BOB, 'editor')).ok, true);
  assert.ok(await cloud.insertAtom(BOB, atom('b1', project.id)));

  assert.equal((await sharing.removeMember(ALICE, project.id, BOB)).ok, true);
  assert.equal(await cloud.roleOn(BOB, project.id), null);
  assert.equal(await cloud.getAtom(BOB, 'b1'), null);
  assert.deepEqual(await cloud.listAtoms(BOB, project.id), []);
  assert.equal((await cloud.listProjects(BOB)).some((p) => p.id === project.id), false);
  assert.equal((await sharing.setRole(ALICE, project.id, BOB, 'viewer')).code, 'NOT_FOUND');
});

test('a member can leave; nobody else can remove people but the owner; the owner cannot be given away', async () => {
  const { cloud, sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'editor');
  await sharing.invite(ALICE, project.id, 'cara@example.com', 'viewer');
  assert.equal((await sharing.removeMember(BOB, project.id, CARA)).code, 'NOT_ALLOWED');
  assert.equal((await sharing.removeMember(CARA, project.id, CARA)).ok, true, 'leaving is allowed');
  assert.equal(await cloud.roleOn(CARA, project.id), null);
  assert.equal(await cloud.roleOn(BOB, project.id), 'editor');
  assert.equal((await sharing.invite(ALICE, project.id, 'cara@example.com', 'owner')).code, 'BAD_ROLE');
  assert.equal((await sharing.setRole(ALICE, project.id, BOB, 'owner')).code, 'BAD_ROLE');
});

test('deleting the project removes clips other people added, and the access rows', async () => {
  const { cloud, sharing, project, db } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'editor');
  await cloud.insertAtom(BOB, atom('b1', project.id));
  assert.equal(await cloud.deleteProject(ALICE, project.id), true);
  assert.equal(db.tables.atoms.length, 0);
  assert.equal(await cloud.roleOn(BOB, project.id), null);
});

// ── Invitations ─────────────────────────────────────────────────────────────────

test('an address with no account yet is kept as an invitation and claimed when that address signs in', async () => {
  const { cloud, sharing, project } = await setup();
  const r = await sharing.invite(ALICE, project.id, ' Dan@Example.com ', 'editor');
  assert.equal(r.kind, 'invited');
  assert.equal(await cloud.roleOn(DAN, project.id), null, 'nothing yet');

  const access = (await sharing.listAccess(ALICE, project.id)).access;
  assert.deepEqual(access.invites.map((i) => [i.email, i.role]), [['dan@example.com', 'editor']]);

  assert.equal(await sharing.claimInvites(CARA, 'cara@example.com'), 0, 'an address with no invitation gets nothing');
  assert.equal(await cloud.roleOn(CARA, project.id), null);
  // The route passes the signed-in person's own address, so nobody can claim an invitation addressed to someone else.
});

test('claiming adds the person once, marks the invitation done, and the owner list no longer shows it', async () => {
  const { cloud, sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'dan@example.com', 'viewer');
  assert.equal(await sharing.claimInvites(DAN, 'dan@example.com'), 1);
  assert.equal(await cloud.roleOn(DAN, project.id), 'viewer');
  assert.equal(await sharing.claimInvites(DAN, 'dan@example.com'), 0, 'a second claim does nothing');
  assert.deepEqual((await sharing.listAccess(ALICE, project.id)).access.invites, []);
  assert.deepEqual((await sharing.listAccess(ALICE, project.id)).access.members.map((m) => m.role), ['viewer']);
});

test('inviting someone who already has an account adds them straight away; inviting again changes the role', async () => {
  const { cloud, sharing, project } = await setup();
  assert.equal((await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer')).kind, 'added');
  assert.equal((await sharing.invite(ALICE, project.id, 'bob@example.com', 'editor')).kind, 'updated');
  assert.equal(await cloud.roleOn(BOB, project.id), 'editor');
  const members = (await sharing.listAccess(ALICE, project.id)).access.members;
  assert.equal(members.length, 1);
  assert.equal(members[0].email, 'bob@example.com');
});

test('bad invitations are refused: not the owner, bad email, bad role, yourself', async () => {
  const { sharing, project } = await setup();
  assert.equal((await sharing.invite(BOB, project.id, 'cara@example.com', 'viewer')).code, 'NOT_ALLOWED');
  assert.equal((await sharing.invite(ALICE, project.id, 'nope', 'viewer')).code, 'BAD_EMAIL');
  assert.equal((await sharing.invite(ALICE, project.id, 'bob@example.com', 'admin')).code, 'BAD_ROLE');
  assert.equal((await sharing.invite(ALICE, project.id, 'alice@example.com', 'viewer')).code, 'SELF');
  assert.equal((await sharing.invite(ALICE, 'proj-missing', 'bob@example.com', 'viewer')).code, 'NOT_ALLOWED');
});

test('the owner can cancel an invitation; others cannot', async () => {
  const { sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'dan@example.com', 'viewer');
  const id = (await sharing.listAccess(ALICE, project.id)).access.invites[0].id;
  assert.equal((await sharing.cancelInvite(BOB, project.id, id)).code, 'NOT_ALLOWED');
  assert.equal((await sharing.cancelInvite(ALICE, project.id, id)).ok, true);
  assert.equal(await sharing.claimInvites(DAN, 'dan@example.com'), 0);
});

test('only people who can see a project can see who has access, and only the owner sees invitations', async () => {
  const { sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  await sharing.invite(ALICE, project.id, 'dan@example.com', 'viewer');
  assert.equal((await sharing.listAccess(CARA, project.id)).code, 'NOT_FOUND');
  const asViewer = (await sharing.listAccess(BOB, project.id)).access;
  assert.equal(asViewer.role, 'viewer');
  assert.equal(asViewer.owner.email, 'alice@example.com');
  assert.deepEqual(asViewer.invites, []);
  assert.equal((await sharing.listAccess(ALICE, project.id)).access.invites.length, 1);
});

// ── Share links ─────────────────────────────────────────────────────────────────

test('a link is a long secret that is shown once; only its hash is kept; only the owner makes or turns it off', async () => {
  const { sharing, project, db } = await setup();
  const made = await sharing.createLink(ALICE, project.id, 'viewer');
  assert.equal(made.ok, true);
  assert.match(made.token, /^shr_[A-Za-z0-9_-]{30,}$/);
  assert.equal(db.tables.share_links.length, 1);
  assert.ok(!JSON.stringify(db.tables.share_links).includes(made.token), 'the secret itself is not stored');
  assert.equal((await sharing.createLink(BOB, project.id, 'viewer')).code, 'NOT_ALLOWED');
  assert.equal((await sharing.createLink(ALICE, project.id, 'owner')).code, 'BAD_ROLE');
  assert.equal((await sharing.revokeLink(BOB, project.id)).code, 'NOT_ALLOWED');
});

test('turning a link off, or making a new one, stops the old one at once', async () => {
  const { sharing, project } = await setup();
  const first = (await sharing.createLink(ALICE, project.id, 'viewer')).token;
  assert.equal((await sharing.resolveLink(first)).role, 'viewer');
  const second = (await sharing.createLink(ALICE, project.id, 'editor')).token;
  assert.equal(await sharing.resolveLink(first), null, 'the old link no longer works');
  assert.equal((await sharing.resolveLink(second)).role, 'editor');
  assert.equal((await sharing.revokeLink(ALICE, project.id)).ok, true);
  assert.equal(await sharing.resolveLink(second), null);
  for (const bad of ['', 'nope', 'shr_', null, undefined, 42, 'shr_' + 'x'.repeat(300)]) assert.equal(await sharing.resolveLink(bad), null);
});

test('a view link shows the project and its sub-projects read-only without signing in, and nothing else', async () => {
  const { cloud, sharing, project, child } = await setup();
  const other = (await cloud.listProjects(BOB))[0];
  await cloud.insertAtom(ALICE, atom('a1', project.id));
  await cloud.insertAtom(ALICE, atom('a2', child.id));
  await cloud.insertAtom(BOB, atom('b1', other.id));
  const token = (await sharing.createLink(ALICE, project.id, 'viewer')).token;
  const shown = await sharing.readByLink(token);
  assert.equal(shown.project.id, project.id);
  assert.equal(shown.role, 'viewer');
  assert.deepEqual(shown.atoms.map((a) => a.id).sort(), ['a1', 'a2']);
  assert.equal(await sharing.readByLink('shr_notarealtoken0000000000000000000'), null);
});

test('an edit link makes a signed-in person an editor; a view link adds nobody; the owner is left alone', async () => {
  const { cloud, sharing, project } = await setup();
  const view = (await sharing.createLink(ALICE, project.id, 'viewer')).token;
  assert.equal(await sharing.joinViaLink(CARA, view), null);
  assert.equal(await cloud.roleOn(CARA, project.id), null);

  const edit = (await sharing.createLink(ALICE, project.id, 'editor')).token;
  assert.equal(await sharing.joinViaLink(CARA, edit), project.id);
  assert.equal(await cloud.roleOn(CARA, project.id), 'editor');
  assert.ok(await cloud.insertAtom(CARA, atom('c1', project.id)));
  assert.equal(await sharing.joinViaLink(CARA, edit), project.id, 'opening it again changes nothing');
  assert.equal((await sharing.listAccess(ALICE, project.id)).access.members.length, 1);
  assert.equal(await sharing.joinViaLink(ALICE, edit), project.id);
  assert.equal(await cloud.roleOn(ALICE, project.id), 'owner');

  await sharing.revokeLink(ALICE, project.id);
  assert.equal(await sharing.joinViaLink(BOB, edit), null, 'a turned-off link adds nobody');
});

test('only the owner sees that a link is on', async () => {
  const { sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  assert.equal((await sharing.listAccess(ALICE, project.id)).access.link, null);
  await sharing.createLink(ALICE, project.id, 'editor');
  assert.equal((await sharing.listAccess(ALICE, project.id)).access.link.role, 'editor');
  assert.equal((await sharing.listAccess(BOB, project.id)).access.link, null);
});

// ── Access requests ─────────────────────────────────────────────────────────────

test('someone with no access can ask; the owner sees the request and a count; asking twice keeps one', async () => {
  const { sharing, project } = await setup();
  assert.deepEqual(await sharing.accessState(CARA, project.id), { exists: true, request: 'none' });
  assert.deepEqual(await sharing.accessState(CARA, 'proj-missing'), { exists: false, request: 'none' });

  const r = await sharing.requestAccess(CARA, project.id, '  Please let me in  ');
  assert.deepEqual([r.ok, r.already], [true, false]);
  assert.equal((await sharing.accessState(CARA, project.id)).request, 'pending');
  await sharing.requestAccess(CARA, project.id, 'second try');

  const asks = (await sharing.listAccess(ALICE, project.id)).access.requests;
  assert.equal(asks.length, 1, 'one waiting request per person');
  assert.deepEqual([asks[0].email, asks[0].message], ['cara@example.com', 'second try']);
  assert.equal((await sharing.pendingRequestCounts(ALICE)).get(project.id), 1);
  assert.equal((await sharing.pendingRequestCounts(BOB)).size, 0, 'only the owner has a count');
});

test('requests: messages are capped, missing projects fail, and people who already have access are told so', async () => {
  const { sharing, project, db } = await setup();
  await sharing.requestAccess(CARA, project.id, 'x'.repeat(900));
  assert.equal(db.tables.access_requests[0].message.length, 500);
  assert.equal((await sharing.requestAccess(CARA, 'proj-missing', 'hi')).code, 'NOT_FOUND');
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  assert.equal((await sharing.requestAccess(BOB, project.id, 'hi')).already, true);
  assert.equal(db.tables.access_requests.length, 1, 'no request is made for someone who already has access');
});

test('approving a request gives the chosen role at once; denying changes nothing and can be asked again', async () => {
  const { cloud, sharing, project } = await setup();
  await sharing.requestAccess(CARA, project.id, 'hi');
  const id = (await sharing.listAccess(ALICE, project.id)).access.requests[0].id;
  assert.equal(await cloud.roleOn(CARA, project.id), null);

  assert.equal((await sharing.decideRequest(BOB, project.id, id, true, 'editor')).code, 'NOT_ALLOWED');
  assert.equal((await sharing.decideRequest(ALICE, project.id, id, true, 'owner')).code, 'BAD_ROLE');
  assert.equal((await sharing.decideRequest(ALICE, project.id, id, true, 'editor')).ok, true);
  assert.equal(await cloud.roleOn(CARA, project.id), 'editor');
  assert.deepEqual((await sharing.listAccess(ALICE, project.id)).access.requests, []);
  assert.equal((await sharing.decideRequest(ALICE, project.id, id, true, 'viewer')).code, 'NOT_FOUND', 'a request is answered once');

  await sharing.removeMember(ALICE, project.id, CARA);
  await sharing.requestAccess(CARA, project.id, 'again');
  const second = (await sharing.listAccess(ALICE, project.id)).access.requests[0].id;
  assert.equal((await sharing.decideRequest(ALICE, project.id, second, false)).ok, true);
  assert.equal(await cloud.roleOn(CARA, project.id), null);
  assert.equal((await sharing.accessState(CARA, project.id)).request, 'denied');
  await sharing.requestAccess(CARA, project.id, 'one more time');
  assert.equal((await sharing.accessState(CARA, project.id)).request, 'pending', 'a denied person may ask again');
});
