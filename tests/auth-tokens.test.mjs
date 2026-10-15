import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExtensionToken, hashToken, readBearerToken, isCrossSiteWrite, validateCredentials, TOKEN_PREFIX } from '../src/lib/auth/tokens.ts';

test('a token has the prefix, is unique, and only its hash is derivable', () => {
  const a = generateExtensionToken();
  const b = generateExtensionToken();
  assert.ok(a.token.startsWith(TOKEN_PREFIX));
  assert.notEqual(a.token, b.token);
  assert.equal(a.hash, hashToken(a.token));
  assert.match(a.hash, /^[0-9a-f]{64}$/);
  assert.ok(!a.hash.includes(a.token));
  assert.equal(a.last4, a.token.slice(-4));
});

test('bearer parsing accepts only our tokens', () => {
  const { token } = generateExtensionToken();
  assert.equal(readBearerToken(`Bearer ${token}`), token);
  assert.equal(readBearerToken(`bearer ${token}`), token);
  assert.equal(readBearerToken(`Basic ${token}`), null);
  assert.equal(readBearerToken('Bearer eyJhbGciOi.jwt.like'), null);
  assert.equal(readBearerToken('Bearer rst_'), null);
  assert.equal(readBearerToken(`Bearer ${token} extra`), null);
  assert.equal(readBearerToken(null), null);
  assert.equal(readBearerToken(''), null);
});

test('cross-site writes are refused, reads and same-site writes are not', () => {
  assert.equal(isCrossSiteWrite('POST', 'https://evil.test', 'app.test'), true);
  assert.equal(isCrossSiteWrite('DELETE', 'https://evil.test', 'app.test'), true);
  assert.equal(isCrossSiteWrite('POST', 'https://app.test', 'app.test'), false);
  assert.equal(isCrossSiteWrite('GET', 'https://evil.test', 'app.test'), false);
  assert.equal(isCrossSiteWrite('POST', null, 'app.test'), false);
  assert.equal(isCrossSiteWrite('POST', 'not a url', 'app.test'), true);
  assert.equal(isCrossSiteWrite('POST', 'http://localhost:3001', 'localhost:3001'), false);
});

test('credential validation', () => {
  assert.deepEqual(validateCredentials(' A@B.co ', 'longenough'), { ok: true, email: 'a@b.co', password: 'longenough' });
  assert.equal(validateCredentials('nope', 'longenough').ok, false);
  assert.equal(validateCredentials('a@b.co', 'short').ok, false);
  assert.equal(validateCredentials('a@b.co', undefined).ok, false);
  assert.equal(validateCredentials(undefined, 'longenough').ok, false);
  assert.equal(validateCredentials('a@b.co', 'x'.repeat(201)).ok, false);
});
