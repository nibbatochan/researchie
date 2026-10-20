// Run: node --test --no-warnings tests/evidence.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEvidenceKind, withEvidenceKind, canBeQuoted, isEvidenceKind } from '../src/lib/atoms/evidence.ts';

test('an explicit evidence kind wins', () => {
  assert.equal(getEvidenceKind({ type: 'quote', metadata: { evidenceKind: 'ai-summary' } }), 'ai-summary');
});

test('notes default to mine; captured clips default to quote', () => {
  assert.equal(getEvidenceKind({ type: 'note', metadata: {} }), 'mine');
  assert.equal(getEvidenceKind({ type: 'text', metadata: {} }), 'quote');
  assert.equal(getEvidenceKind({ type: 'quote' }), 'quote');
});

test('an unknown stored value falls back to the default', () => {
  assert.equal(getEvidenceKind({ type: 'note', metadata: { evidenceKind: 'bogus' } }), 'mine');
  assert.equal(isEvidenceKind('bogus'), false);
});

test('only a quote can be put in quotation marks', () => {
  assert.equal(canBeQuoted({ type: 'text' }), true);
  assert.equal(canBeQuoted({ type: 'text', metadata: { evidenceKind: 'ai-summary' } }), false);
  assert.equal(canBeQuoted({ type: 'note' }), false);
});

test('withEvidenceKind keeps the rest of metadata', () => {
  assert.deepEqual(withEvidenceKind({ sourceUrl: 'x' }, 'mine'), { sourceUrl: 'x', evidenceKind: 'mine' });
});
