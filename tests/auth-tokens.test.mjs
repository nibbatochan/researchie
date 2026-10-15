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

test('the invite code gate: open when unset, exact match when set', async () => {
  const { inviteCodeMatches } = await import('../src/lib/auth/tokens.ts');
  assert.equal(inviteCodeMatches(undefined, undefined), true);
  assert.equal(inviteCodeMatches('anything', ''), true);
  assert.equal(inviteCodeMatches('anything', '   '), true);
  assert.equal(inviteCodeMatches('open-sesame-42', 'open-sesame-42'), true);
  assert.equal(inviteCodeMatches('  open-sesame-42 ', 'open-sesame-42'), true); // stray spaces from copy and paste
  assert.equal(inviteCodeMatches('open-sesame-43', 'open-sesame-42'), false);
  assert.equal(inviteCodeMatches('OPEN-SESAME-42', 'open-sesame-42'), false); // case matters
  assert.equal(inviteCodeMatches('', 'open-sesame-42'), false);
  assert.equal(inviteCodeMatches(undefined, 'open-sesame-42'), false);
  assert.equal(inviteCodeMatches(12345, 'open-sesame-42'), false);
});

test('a token can carry the server address, so the extension needs only the token', async () => {
  const { generateExtensionToken, localPairingToken, originFromToken, readBearerToken } = await import('../src/lib/auth/tokens.ts');
  const withHost = generateExtensionToken('https://researchie-testers.vercel.app');
  assert.equal(originFromToken(withHost.token), 'https://researchie-testers.vercel.app');
  assert.equal(readBearerToken(`Bearer ${withHost.token}`), withHost.token); // still a valid bearer token
  const local = localPairingToken('http://localhost:3001');
  assert.equal(originFromToken(local), 'http://localhost:3001');
  assert.equal(readBearerToken(`Bearer ${local}`), local);
  // A token made without an address (older ones) has none to read.
  assert.equal(originFromToken(generateExtensionToken().token), null);
});

test('an address inside a token is only trusted when it is https, or http on this computer', async () => {
  const { originFromToken, TOKEN_PREFIX } = await import('../src/lib/auth/tokens.ts');
  const make = (origin) => `${TOKEN_PREFIX}abc.${Buffer.from(origin).toString('base64url')}`;
  assert.equal(originFromToken(make('https://example.org')), 'https://example.org');
  assert.equal(originFromToken(make('http://127.0.0.1:3000')), 'http://127.0.0.1:3000');
  for (const bad of ['http://example.org', 'ftp://example.org', 'javascript:alert(1)', 'https://example.org/path', 'https://user:pw@example.org', 'not a url', 'http://localhost.evil.test']) {
    assert.equal(originFromToken(make(bad)), null, bad);
  }
  assert.equal(originFromToken(`${TOKEN_PREFIX}abc.%%%`), null);
  assert.equal(originFromToken('xyz.abc'), null);
  assert.equal(originFromToken(null), null);
});

test('the server works out its own address from the request headers', async () => {
  const { requestOrigin } = await import('../src/lib/auth/tokens.ts');
  const headers = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null });
  assert.equal(requestOrigin(headers({ host: 'localhost:3001' })), 'http://localhost:3001');
  assert.equal(requestOrigin(headers({ host: 'app.example.org' })), 'https://app.example.org');
  assert.equal(requestOrigin(headers({ 'x-forwarded-host': 'researchie-testers.vercel.app', 'x-forwarded-proto': 'https', host: 'internal:3000' })), 'https://researchie-testers.vercel.app');
  assert.equal(requestOrigin(headers({})), null);
});
