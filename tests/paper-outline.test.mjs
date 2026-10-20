// Run: node --test --no-warnings tests/paper-outline.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createOutline, setSectionPoint, addPart, renamePart, removePart, movePart, assignClip, unassignClip,
  placedClipIds, pruneMissingClips, sectionStatus, nextSection, parseOutline,
} from '../src/lib/paper/outline.ts';

const sec = (o, key) => o.sections.find((s) => s.key === key);

test('a research article starts with its sections in order and no parts', () => {
  const o = createOutline('imrad');
  assert.deepEqual(o.sections.map((s) => s.key), ['abstract', 'introduction', 'methods', 'results', 'discussion', 'conclusion']);
  assert.ok(o.sections.every((s) => s.parts.length === 0));
});

test('parts keep the order they were added in; blank titles are ignored', () => {
  let o = createOutline('imrad');
  const id = sec(o, 'methods').id;
  o = addPart(o, id, 'Survey');
  o = addPart(o, id, '  Interviews ');
  o = addPart(o, id, '   ');
  assert.deepEqual(sec(o, 'methods').parts.map((p) => p.title), ['Survey', 'Interviews']);
});

test('movePart reorders inside a section and moves across sections', () => {
  let o = createOutline('imrad');
  const m = sec(o, 'methods').id;
  o = addPart(addPart(addPart(o, m, 'A'), m, 'B'), m, 'C');
  const c = sec(o, 'methods').parts[2].id;
  o = movePart(o, c, m, 0);
  assert.deepEqual(sec(o, 'methods').parts.map((p) => p.title), ['C', 'A', 'B']);
  o = movePart(o, c, sec(o, 'results').id, 99);
  assert.deepEqual(sec(o, 'methods').parts.map((p) => p.title), ['A', 'B']);
  assert.deepEqual(sec(o, 'results').parts.map((p) => p.title), ['C']);
});

test('a clip is placed once per part and can be removed', () => {
  let o = createOutline('imrad');
  const m = sec(o, 'methods').id;
  o = addPart(o, m, 'Survey');
  const p = sec(o, 'methods').parts[0].id;
  o = assignClip(assignClip(o, p, 'c1'), p, 'c1');
  assert.deepEqual(sec(o, 'methods').parts[0].clipIds, ['c1']);
  o = unassignClip(o, p, 'c1');
  assert.deepEqual(sec(o, 'methods').parts[0].clipIds, []);
});

test('removing a part drops its clips from placedClipIds', () => {
  let o = createOutline('imrad');
  o = addPart(o, sec(o, 'methods').id, 'x');
  const mid = sec(o, 'methods').id;
  const p = sec(o, 'methods').parts[0].id;
  o = assignClip(o, p, 'c1');
  assert.ok(placedClipIds(o).has('c1'));
  o = removePart(o, p);
  assert.equal(placedClipIds(o).size, 0);
  assert.equal(sec(o, 'methods').id, mid);
});

test('status and next section guide the user', () => {
  let o = createOutline('imrad');
  assert.equal(nextSection(o).key, 'abstract');
  o = setSectionPoint(o, sec(o, 'abstract').id, 'We test X.');
  assert.equal(sectionStatus(sec(o, 'abstract')), 'framed');
  assert.equal(nextSection(o).key, 'introduction');
  o = addPart(o, sec(o, 'introduction').id, 'Gap');
  o = assignClip(o, sec(o, 'introduction').parts[0].id, 'c9');
  assert.equal(sectionStatus(sec(o, 'introduction')), 'has-evidence');
});

test('pruneMissingClips removes deleted clips and keeps the same object when nothing changed', () => {
  let o = createOutline('review');
  o = addPart(o, sec(o, 'findings').id, 'Theme');
  o = assignClip(assignClip(o, sec(o, 'findings').parts[0].id, 'a'), sec(o, 'findings').parts[0].id, 'b');
  assert.equal(pruneMissingClips(o, new Set(['a', 'b'])), o);
  assert.deepEqual(sec(pruneMissingClips(o, new Set(['a'])), 'findings').parts[0].clipIds, ['a']);
});

test('parseOutline accepts a saved outline and rejects junk', () => {
  const o = addPart(createOutline('imrad'), createOutline('imrad').sections[0].id, 'x');
  const saved = createOutline('imrad');
  assert.deepEqual(parseOutline(JSON.parse(JSON.stringify(saved))), saved);
  assert.equal(parseOutline(null), undefined);
  assert.equal(parseOutline({ templateId: 'nope', sections: [] }), undefined);
  assert.equal(parseOutline({ templateId: 'imrad', sections: [{ id: 1 }] }), undefined);
  assert.ok(o);
});
