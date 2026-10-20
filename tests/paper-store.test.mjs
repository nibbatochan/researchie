// Run: node --test --no-warnings tests/paper-store.test.mjs
// Saving the outline: size guard, damaged data, and keeping the previous draft.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutline, addPart, setSectionDraft, replaceDraft, restorePreviousDraft, setSectionDone, parseOutline } from '../src/lib/paper/outline.ts';
import { serializeOutline, readOutline, outlineKey, MAX_OUTLINE_BYTES } from '../src/lib/paper/store.ts';

const sec = (o, key) => o.sections.find((s) => s.key === key);
const draft = (text, at) => ({ generatedAt: at, sentences: [{ text, clipIds: ['a'], status: 'sourced', placeholder: false }] });

test('the key is per project', () => {
  assert.equal(outlineKey('p1'), 'researchie.paperOutline.p1');
  assert.notEqual(outlineKey('p1'), outlineKey('p2'));
});

test('an outline round-trips through save and read', () => {
  let o = createOutline('imrad');
  o = addPart(o, sec(o, 'methods').id, 'Survey');
  o = setSectionDraft(o, sec(o, 'methods').id, draft('Forty adults.', 't1'));
  const r = serializeOutline(o);
  assert.equal(r.ok, true);
  assert.deepEqual(readOutline(r.json), o);
});

test('an outline over the size cap is refused with a reason, never cut', () => {
  let o = createOutline('imrad');
  o = setSectionDraft(o, sec(o, 'methods').id, draft('x'.repeat(MAX_OUTLINE_BYTES), 't'));
  const r = serializeOutline(o);
  assert.equal(r.ok, false);
  assert.match(r.reason, /over the 60 KB/);
});

test('missing, damaged or foreign data reads as no outline', () => {
  assert.equal(readOutline(null), undefined);
  assert.equal(readOutline(''), undefined);
  assert.equal(readOutline('{not json'), undefined);
  assert.equal(readOutline('{"templateId":"nope","sections":[]}'), undefined);
});

test('drafting again keeps the old draft as previous; the first draft has none', () => {
  let o = createOutline('imrad');
  const id = sec(o, 'methods').id;
  o = replaceDraft(o, id, draft('first', 't1'));
  assert.equal(sec(o, 'methods').draft.previous, undefined);
  o = replaceDraft(o, id, draft('second', 't2'));
  assert.equal(sec(o, 'methods').draft.sentences[0].text, 'second');
  assert.equal(sec(o, 'methods').draft.previous.sentences[0].text, 'first');
});

test('previous is one level deep: a third draft drops the first', () => {
  let o = createOutline('imrad');
  const id = sec(o, 'methods').id;
  for (const [t, at] of [['one', 't1'], ['two', 't2'], ['three', 't3']]) o = replaceDraft(o, id, draft(t, at));
  assert.equal(sec(o, 'methods').draft.previous.sentences[0].text, 'two');
  assert.equal(sec(o, 'methods').draft.previous.previous, undefined);
});

test('restore swaps the two drafts, so a restore can be undone; edits made before drafting again come back', () => {
  let o = createOutline('imrad');
  const id = sec(o, 'methods').id;
  o = replaceDraft(o, id, draft('my edited text', 't1'));
  o = replaceDraft(o, id, draft('new model text', 't2'));
  o = restorePreviousDraft(o, id);
  assert.equal(sec(o, 'methods').draft.sentences[0].text, 'my edited text');
  assert.equal(sec(o, 'methods').draft.previous.sentences[0].text, 'new model text');
  o = restorePreviousDraft(o, id);
  assert.equal(sec(o, 'methods').draft.sentences[0].text, 'new model text');
});

test('restore with nothing to restore changes nothing; a new draft reopens a done section; previous survives save and load', () => {
  let o = createOutline('imrad');
  const id = sec(o, 'methods').id;
  assert.equal(restorePreviousDraft(o, id), o);
  o = replaceDraft(o, id, draft('a', 't1'));
  o = setSectionDone(o, id, true);
  o = replaceDraft(o, id, draft('b', 't2'));
  assert.equal(sec(o, 'methods').done, undefined);
  const back = parseOutline(JSON.parse(JSON.stringify(o)));
  assert.equal(sec(back, 'methods').draft.previous.sentences[0].text, 'a');
});
