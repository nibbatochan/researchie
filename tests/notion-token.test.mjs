import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanNotionToken } from '../src/lib/notion/tokenInput.ts';
import { sealSecret, openSecret } from '../src/lib/ai/keyVault.ts';

const SECRET = 'x'.repeat(40);
const GOOD = 'ntn_' + 'a1B2c3D4e5'.repeat(4);

test('a real-looking token is accepted and trimmed', () => {
  assert.deepEqual(cleanNotionToken(`  ${GOOD}\n`), { ok: true, token: GOOD });
  assert.equal(cleanNotionToken('secret_' + 'z9'.repeat(15)).ok, true);
});

test('empty, non-text, short, long, spaced and odd-character tokens are refused with a plain message', () => {
  for (const bad of ['', '   ', null, undefined, 42, 'short', 'a'.repeat(301), `${GOOD} extra`, `${GOOD}\n${GOOD}`, GOOD + '!!', GOOD.replace('a', '$')]) {
    const r = cleanNotionToken(bad);
    assert.equal(r.ok, false, `refused: ${String(bad).slice(0, 20)}`);
    assert.ok(r.error.length > 10);
  }
});

test('a saved token is encrypted, opens only for its own user, and is not readable in the stored row', () => {
  const sealed = sealSecret(GOOD, 'user-a', SECRET);
  assert.ok(!JSON.stringify(sealed).includes(GOOD));
  assert.equal(openSecret(sealed, 'user-a', SECRET), GOOD);
  assert.throws(() => openSecret(sealed, 'user-b', SECRET), 'another user cannot open it');
  assert.throws(() => openSecret(sealed, 'user-a', 'y'.repeat(40)), 'a changed secret cannot open it');
});
