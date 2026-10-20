// Run: node --test --no-warnings tests/paper-preview.test.mjs
// The preview builder: how each kind of clip is shown, what is flagged, how the abstract and references are split out.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutline, addPart, assignClip, setSectionPoint, setPaperMeta } from '../src/lib/paper/outline.ts';
import { buildPreview } from '../src/lib/paper/preview.ts';
import { markerText } from '../src/lib/citations/inText.ts';

const record = (family, year, title) => ({
  status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [],
  title, journal: 'J Ex', volume: '1', pages: '1-2', year, authors: [{ family, given: 'A' }],
});

function setup() {
  let o = createOutline('imrad');
  const sec = (k) => o.sections.find((s) => s.key === k);
  o = addPart(o, sec('introduction').id, 'Background');
  const p = sec('introduction').parts[0].id;
  for (const id of ['q1', 'q2', 'nocite', 'ai', 'mine']) o = assignClip(o, p, id);
  const clips = new Map([
    ['q1', { id: 'q1', text: 'Sleep helps memory.', kind: 'quote', record: record('Lee', 2020, 'Sleep'), page: 14 }],
    ['q2', { id: 'q2', text: 'Focus drifts.', kind: 'quote', record: record('Abe', 2018, 'Focus') }],
    ['nocite', { id: 'nocite', text: 'No record here.', kind: 'quote' }],
    ['ai', { id: 'ai', text: 'A model summary.', kind: 'ai-summary' }],
    ['mine', { id: 'mine', text: 'I saw the same.', kind: 'mine' }],
  ]);
  return { o, clips };
}

test('each clip kind becomes the right block', () => {
  const { o, clips } = setup();
  const doc = buildPreview(o, clips, 'harvard');
  const blocks = doc.sections.find((s) => s.key === 'introduction').parts[0].blocks;
  assert.deepEqual(blocks.map((b) => b.kind), ['quote', 'quote', 'uncited', 'ai', 'own']);
  assert.equal(markerText(blocks[0].marker), '(Lee, 2020, p. 14)');
  assert.equal(markerText(blocks[1].marker), '(Abe, 2018)');
});

test('numbered style numbers by first use in the text', () => {
  const { o, clips } = setup();
  const doc = buildPreview(o, clips, 'ieee');
  const blocks = doc.sections.find((s) => s.key === 'introduction').parts[0].blocks;
  assert.equal(markerText(blocks[0].marker), '[1, p. 14]');
  assert.equal(markerText(blocks[1].marker), '[2]');
  assert.deepEqual(doc.references.map((r) => r.label), ['[1]', '[2]']);
});

test('only quotes with a citation reach the reference list; AI summaries and own notes never do', () => {
  const { o, clips } = setup();
  assert.deepEqual(buildPreview(o, clips, 'harvard').references.map((r) => r.sourceId).sort(), ['q1', 'q2']);
});

test('quotes without a citation and AI summaries are counted as unsourced', () => {
  const { o, clips } = setup();
  assert.equal(buildPreview(o, clips, 'harvard').unsourcedCount, 2);
});

test('the abstract is split out and the rest keep template order; empty sections are marked', () => {
  const { o, clips } = setup();
  const doc = buildPreview(setSectionPoint(o, o.sections[0].id, 'We test sleep.'), clips, 'harvard');
  assert.equal(doc.abstract.point, 'We test sleep.');
  assert.deepEqual(doc.sections.map((s) => s.key), ['introduction', 'methods', 'results', 'discussion', 'conclusion']);
  assert.equal(doc.sections.find((s) => s.key === 'methods').isEmpty, true);
  assert.equal(doc.sections.find((s) => s.key === 'introduction').isEmpty, false);
});

test('title and authors come from the outline, trimmed; a clip deleted from the project is skipped', () => {
  const { o, clips } = setup();
  clips.delete('mine');
  const doc = buildPreview(setPaperMeta(o, { title: '  Sleep study ', authors: 'J. Lee' }), clips, 'harvard');
  assert.equal(doc.title, 'Sleep study');
  assert.equal(doc.authors, 'J. Lee');
  assert.equal(doc.sections.find((s) => s.key === 'introduction').parts[0].blocks.length, 4);
});

test('a section with a draft shows its sentences, cites only quote clips with a reference, and counts the flagged ones', () => {
  const { o, clips } = setup();
  const intro = o.sections.find((s) => s.key === 'introduction');
  const p = intro.parts[0].id;
  const withDraft = {
    ...o,
    sections: o.sections.map((s) => s.id !== intro.id ? s : { ...s, draft: { generatedAt: 'x', sentences: [
      { text: 'Sleep helps memory.', clipIds: ['q1'], partId: p, status: 'sourced', placeholder: false },
      { text: 'Focus drifts.', clipIds: ['q2'], partId: p, status: 'sourced', placeholder: false },
      { text: 'Something unsupported.', clipIds: [], partId: p, status: 'unsourced', placeholder: false },
      { text: 'I saw it too.', clipIds: ['mine'], partId: p, status: 'own', placeholder: false },
    ] } }),
  };
  const doc = buildPreview(withDraft, clips, 'ieee');
  const section = doc.sections.find((s) => s.key === 'introduction');
  assert.equal(section.isDraft, true);
  const blocks = section.parts[0].blocks;
  assert.deepEqual(blocks.map((b) => b.kind), ['sentence', 'sentence', 'sentence', 'sentence']);
  assert.equal(markerText(blocks[0].marker), '[1, p. 14]');
  assert.equal(markerText(blocks[1].marker), '[2]');
  assert.equal(blocks[2].marker.length, 0);
  assert.equal(blocks[3].marker.length, 0);
  assert.equal(doc.unsourcedCount, 1);
  assert.equal(doc.hasAiDraft, true);
  assert.deepEqual(doc.references.map((r) => r.sourceId), ['q1', 'q2']);
});
