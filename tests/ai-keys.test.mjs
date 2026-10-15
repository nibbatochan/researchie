import test from 'node:test';
import assert from 'node:assert/strict';
import { sealSecret, openSecret, lastFour } from '../src/lib/ai/keyVault.ts';
import { PROVIDERS, PROVIDER_ORDER, DEFAULT_PROVIDER, getProvider, isProviderId, cleanKeyInput, checkProviderKey } from '../src/lib/ai/providers.ts';

const SECRET = 'x'.repeat(40);
const KEY = 'gsk_abcdefghijklmnopqrstuvwxyz0123456789';
const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';

test('a key round-trips and the stored form does not contain it', () => {
  const sealed = sealSecret(KEY, U1, SECRET);
  assert.equal(openSecret(sealed, U1, SECRET), KEY);
  for (const part of Object.values(sealed)) assert.ok(!String(part).includes('abcdefgh'));
  assert.notEqual(sealSecret(KEY, U1, SECRET).ciphertext, sealed.ciphertext); // new IV each time
  assert.equal(lastFour(KEY), '6789');
});

test('a stored key will not open for another user, a wrong secret, or after tampering', () => {
  const sealed = sealSecret(KEY, U1, SECRET);
  assert.throws(() => openSecret(sealed, U2, SECRET));
  assert.throws(() => openSecret(sealed, U1, 'y'.repeat(40)));
  const flipped = { ...sealed, ciphertext: Buffer.from(Buffer.from(sealed.ciphertext, 'base64').map((b, i) => (i === 0 ? b ^ 1 : b))).toString('base64') };
  assert.throws(() => openSecret(flipped, U1, SECRET));
});

test('a missing or short server secret is refused', () => {
  assert.throws(() => sealSecret(KEY, U1, undefined), /KEY_ENCRYPTION_SECRET/);
  assert.throws(() => sealSecret(KEY, U1, 'short'), /KEY_ENCRYPTION_SECRET/);
});

test('providers: Groq is the default, all four exist, and the Google note warns', () => {
  assert.equal(DEFAULT_PROVIDER, 'groq');
  assert.deepEqual([...PROVIDER_ORDER].sort(), ['cerebras', 'google', 'groq', 'openrouter']);
  assert.equal(getProvider('nope').id, 'groq');
  assert.equal(getProvider(undefined).id, 'groq');
  assert.equal(isProviderId('google'), true);
  assert.equal(isProviderId('__proto__'), false);
  assert.equal(isProviderId('toString'), false);
  assert.equal(PROVIDERS.google.privacy.level, 'warn');
  assert.match(PROVIDERS.google.privacy.text, /Do not use this with sensitive/);
  assert.ok(PROVIDERS.groq.recommended && PROVIDERS.cerebras.recommended);
  for (const id of PROVIDER_ORDER) {
    assert.match(PROVIDERS[id].baseUrl, /^https:\/\//);
    assert.match(PROVIDERS[id].keysUrl, /^https:\/\//);
  }
});

test('pasted keys are cleaned', () => {
  assert.deepEqual(cleanKeyInput(`  ${KEY}\n`), { ok: true, key: KEY });
  assert.equal(cleanKeyInput('short').ok, false);
  assert.equal(cleanKeyInput('a b '.repeat(10)).ok, false);
  assert.equal(cleanKeyInput('k'.repeat(301)).ok, false);
  assert.equal(cleanKeyInput(undefined).ok, false);
});

test('key check maps provider answers and sends the key only as a bearer header', async () => {
  const seen = [];
  const fake = (status) => async (url, init) => {
    seen.push({ url, auth: init.headers.Authorization });
    return { ok: status >= 200 && status < 300, status };
  };
  assert.equal((await checkProviderKey(PROVIDERS.groq, KEY, fake(200))).status, 'valid');
  assert.equal((await checkProviderKey(PROVIDERS.groq, KEY, fake(401))).status, 'invalid');
  assert.equal((await checkProviderKey(PROVIDERS.google, KEY, fake(400))).status, 'invalid');
  assert.equal((await checkProviderKey(PROVIDERS.cerebras, KEY, fake(429))).status, 'rate_limited');
  assert.equal((await checkProviderKey(PROVIDERS.groq, KEY, fake(503))).status, 'unreachable');
  assert.equal((await checkProviderKey(PROVIDERS.groq, KEY, async () => { throw new Error('offline'); })).status, 'unreachable');
  assert.ok(seen.every((s) => s.auth === `Bearer ${KEY}` && !s.url.includes(KEY)));
  await checkProviderKey(PROVIDERS.openrouter, KEY, fake(200));
  assert.equal(seen.at(-1).url, 'https://openrouter.ai/api/v1/key'); // not /models, which answers without a key
});
