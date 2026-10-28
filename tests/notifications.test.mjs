import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCloud } from '../src/lib/data/cloud.ts';
import { makeSharing } from '../src/lib/data/sharing.ts';
import { makeFakeDb } from './helpers/fakeDb.mjs';

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';
const CARA = '33333333-3333-3333-3333-333333333333';

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
  return { db, cloud, sharing, project };
}

const mine = async (sharing, id) => (await sharing.notifications.list(id)).items;

test('sharing a project tells the other person, with the owner, the project and what they can do', async () => {
  const { sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'editor');
  const [n] = await mine(sharing, BOB);
  assert.equal(n.kind, 'shared');
  assert.match(n.title, /Alice shared ".*" with you/);
  assert.match(n.body, /edit it/);
  assert.match(n.body, /Shared with me/);
  assert.equal(n.projectId, project.id);
  assert.equal(n.read, false);
  assert.deepEqual(await mine(sharing, ALICE), []); // the owner is not notified of their own action
});

test('an invitation for an address with no account becomes a notification when that person signs in', async () => {
  const { db, sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'new@example.com', 'viewer');
  db.tables.profiles.push({ id: 'dan', email: 'new@example.com', full_name: 'Dan' });
  assert.equal(await sharing.claimInvites('dan', 'new@example.com'), 1);
  const [n] = await mine(sharing, 'dan');
  assert.equal(n.kind, 'shared');
  assert.match(n.body, /view it/);
});

test('asking for access tells the owner once, and the answer tells the asker', async () => {
  const { sharing, project } = await setup();
  await sharing.requestAccess(CARA, project.id, 'Please let me in');
  await sharing.requestAccess(CARA, project.id, 'Please let me in'); // still waiting: no second notice
  const owner = await mine(sharing, ALICE);
  assert.equal(owner.length, 1);
  assert.equal(owner[0].kind, 'access_requested');
  assert.match(owner[0].title, /Cara asked for access/);
  assert.equal(owner[0].body, 'Please let me in');

  const { access } = await sharing.listAccess(ALICE, project.id);
  await sharing.decideRequest(ALICE, project.id, access.requests[0].id, true, 'editor');
  const asker = await mine(sharing, CARA);
  assert.equal(asker[0].kind, 'request_approved');
  assert.match(asker[0].body, /edit it/);
});

test('a declined request says so', async () => {
  const { sharing, project } = await setup();
  await sharing.requestAccess(CARA, project.id, '');
  const { access } = await sharing.listAccess(ALICE, project.id);
  await sharing.decideRequest(ALICE, project.id, access.requests[0].id, false);
  assert.equal((await mine(sharing, CARA))[0].kind, 'request_denied');
});

test('changing a role, removing someone and leaving each tell the right person', async () => {
  const { sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  await sharing.setRole(ALICE, project.id, BOB, 'editor');
  assert.equal((await mine(sharing, BOB))[0].kind, 'role_changed');

  await sharing.removeMember(BOB, project.id, BOB); // Bob removes the project from his side
  assert.equal((await mine(sharing, ALICE))[0].kind, 'left');

  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  await sharing.removeMember(ALICE, project.id, BOB); // the owner removes him
  assert.equal((await mine(sharing, BOB))[0].kind, 'removed');
});

test('a person can remove their own notifications, and nobody else can', async () => {
  const { sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  await sharing.invite(ALICE, project.id, 'cara@example.com', 'viewer');
  const bobs = await mine(sharing, BOB);
  assert.equal(await sharing.notifications.dismiss(CARA, bobs[0].id), false); // not hers
  assert.equal((await mine(sharing, BOB)).length, 1);
  assert.equal(await sharing.notifications.dismiss(BOB, bobs[0].id), true);
  assert.equal((await mine(sharing, BOB)).length, 0);
  assert.equal((await mine(sharing, CARA)).length, 1); // untouched
});

test('mark all read keeps the notifications and clears the unread count; clear removes them', async () => {
  const { sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  assert.equal((await sharing.notifications.list(BOB)).unread, 1);
  await sharing.notifications.markAllRead(BOB);
  const after = await sharing.notifications.list(BOB);
  assert.equal(after.unread, 0);
  assert.equal(after.items.length, 1);
  await sharing.notifications.clearAll(BOB);
  assert.equal((await sharing.notifications.list(BOB)).items.length, 0);
});

test('a notification that cannot be saved never breaks the sharing action', async () => {
  const { db, sharing, project } = await setup();
  const real = db.from;
  db.from = (table) => {
    if (table === 'notifications') throw new Error('table missing'); // migration 005 not run yet
    return real(table);
  };
  const r = await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  assert.equal(r.ok, true);
});

test('the Share dialog list is complete for the owner and trimmed for a member', async () => {
  const { sharing, project } = await setup();
  await sharing.invite(ALICE, project.id, 'bob@example.com', 'viewer');
  await sharing.invite(ALICE, project.id, 'later@example.com', 'editor');
  await sharing.requestAccess(CARA, project.id, 'hi');
  const owner = (await sharing.listAccess(ALICE, project.id)).access;
  assert.equal(owner.members.length, 1);
  assert.equal(owner.invites.length, 1);
  assert.equal(owner.requests.length, 1);
  assert.equal(owner.owner.name, 'Alice');
  const member = (await sharing.listAccess(BOB, project.id)).access;
  assert.equal(member.invites.length, 0);
  assert.equal(member.requests.length, 0);
  assert.equal(member.role, 'viewer');
});
