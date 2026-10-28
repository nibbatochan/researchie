import test from 'node:test';
import assert from 'node:assert/strict';
import { revokeExtensionTokens } from '../src/lib/auth/revoke.ts';
import { makeFakeDb } from './helpers/fakeDb.mjs';

const ALICE = 'alice';
const BOB = 'bob';

test("signing out revokes the account's live extension tokens and nobody else's", async () => {
  const db = makeFakeDb({
    extension_tokens: [
      { id: 't1', user_id: ALICE, token_hash: 'h1', revoked_at: null },
      { id: 't2', user_id: ALICE, token_hash: 'h2', revoked_at: null },
      { id: 't3', user_id: BOB, token_hash: 'h3', revoked_at: null },
    ],
  });
  assert.equal(await revokeExtensionTokens(db, ALICE), true);
  const rows = db.tables.extension_tokens;
  assert.ok(rows.filter((r) => r.user_id === ALICE).every((r) => r.revoked_at));
  assert.equal(rows.find((r) => r.id === 't3').revoked_at, null);
});

test('a token that was already revoked keeps its original revoke time', async () => {
  const when = '2026-10-01T00:00:00.000Z';
  const db = makeFakeDb({ extension_tokens: [{ id: 't1', user_id: ALICE, token_hash: 'h1', revoked_at: when }] });
  await revokeExtensionTokens(db, ALICE);
  assert.equal(db.tables.extension_tokens[0].revoked_at, when);
});

test('a database error is reported, not thrown', async () => {
  const db = { from: () => ({ update: () => ({ eq: () => ({ is: async () => ({ error: { message: 'down' } }) }) }) }) };
  assert.equal(await revokeExtensionTokens(db, ALICE), false);
});
