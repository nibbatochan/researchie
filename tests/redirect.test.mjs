import test from 'node:test';
import assert from 'node:assert/strict';
import { safeNext, isNewAccount } from '../src/lib/auth/redirect.ts';

test('a path on this site is kept', () => {
  for (const ok of ['/', '/share/shr_abc123', '/gallery?x=1', '/login?tab=register']) assert.equal(safeNext(ok), ok);
});

test('anything that could leave the site becomes the home page', () => {
  for (const bad of ['//evil.com', '//evil.com/x', '@evil.com', 'https://evil.com', 'http://evil.com/x', 'evil.com', '\\\\evil.com', '/\\evil.com', 'javascript:alert(1)', '/a\nb', '/a\u0000b', '', '   ', null, undefined, 42, '/' + 'a'.repeat(400)]) {
    assert.equal(safeNext(bad), '/', `blocked: ${String(bad).slice(0, 30)}`);
  }
});

test('a new account is one made in the last minute and signed in for the first time', () => {
  const now = Date.parse('2026-10-16T12:00:00Z');
  const secsAgo = (s) => new Date(now - s * 1000).toISOString();
  assert.equal(isNewAccount(secsAgo(5), secsAgo(5), now), true);
  assert.equal(isNewAccount(secsAgo(5), undefined, now), true);
  assert.equal(isNewAccount(secsAgo(3600), secsAgo(3600), now), false, 'made an hour ago');
  assert.equal(isNewAccount(secsAgo(200), secsAgo(1), now), false, 'an old account signing in again');
  assert.equal(isNewAccount(secsAgo(20), secsAgo(200000), now), false, 'signed in long before it was made: not new');
  assert.equal(isNewAccount(undefined, undefined, now), false);
  assert.equal(isNewAccount('nonsense', secsAgo(1), now), false);
});
