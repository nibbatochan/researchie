import test from 'node:test';
import assert from 'node:assert/strict';
import { isPinned, withPinned, sortPinnedFirst } from '../src/lib/atoms/pin.ts';

const atom = (id, pinnedAt) => ({ id, metadata: pinnedAt ? { pinnedAt, sourceUrl: 'https://x.test' } : { sourceUrl: 'https://x.test' } });

test('an atom is pinned only when pinnedAt is a non-empty string', () => {
  assert.equal(isPinned(atom('a')), false);
  assert.equal(isPinned(atom('a', '2026-10-15T10:00:00.000Z')), true);
  assert.equal(isPinned({ id: 'b' }), false);
  assert.equal(isPinned({ id: 'c', metadata: { pinnedAt: '' } }), false);
});

test('pinning keeps the rest of the metadata and sets the time', () => {
  const next = withPinned({ sourceUrl: 'https://x.test', citation: { status: 'manual' } }, true, new Date('2026-10-15T09:00:00.000Z'));
  assert.equal(next.pinnedAt, '2026-10-15T09:00:00.000Z');
  assert.equal(next.sourceUrl, 'https://x.test');
  assert.deepEqual(next.citation, { status: 'manual' });
});

test('unpinning removes pinnedAt and keeps the rest', () => {
  const next = withPinned({ sourceUrl: 'https://x.test', pinnedAt: '2026-10-15T09:00:00.000Z' }, false);
  assert.equal('pinnedAt' in next, false);
  assert.equal(next.sourceUrl, 'https://x.test');
});

test('pinning works on missing metadata and does not change the input', () => {
  const original = { sourceUrl: 'u' };
  withPinned(original, true);
  assert.deepEqual(original, { sourceUrl: 'u' });
  assert.ok(withPinned(undefined, true).pinnedAt);
});

test('pinned atoms come first, newest pin first, the rest keep their order', () => {
  const list = [atom('new'), atom('old-pin', '2026-10-15T08:00:00.000Z'), atom('mid'), atom('new-pin', '2026-10-15T09:00:00.000Z'), atom('last')];
  assert.deepEqual(sortPinnedFirst(list).map((a) => a.id), ['new-pin', 'old-pin', 'new', 'mid', 'last']);
});

test('sorting does not change the input list', () => {
  const list = [atom('a'), atom('b', '2026-10-15T08:00:00.000Z')];
  sortPinnedFirst(list);
  assert.deepEqual(list.map((a) => a.id), ['a', 'b']);
});
