// Run: node --test --no-warnings tests/paper-preview.test.mjs
// The preview builder: how each kind of clip is shown, what is flagged, how the abstract and references are split out.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutline, addPart, assignClip, setSectionPoint, setPaperMeta, setSectionDraft, setSectionAuthored } from '../src/lib/paper/outline.ts';
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

const sec = (o, key) => o.sections.find((s) => s.key === key);
const table = { caption: 'Recall by sleep', header: ['Hours', 'Words'], rows: [['5', '12'], ['8', '19']] };

function mediaSetup() {
  let o = createOutline('imrad');
  const results = o.sections.find((s) => s.key === 'results');
  o = addPart(o, results.id, 'Findings');
  const p = o.sections.find((s) => s.key === 'results').parts[0].id;
  for (const id of ['own1', 'fig1', 'tab1', 'figOwn', 'fig2', 'own2']) o = assignClip(o, p, id);
  const clips = new Map([
    ['own1', { id: 'own1', kind: 'mine', text: 'Recall rose. $$r = 0.4$$ Then it levelled off.' }],
    ['fig1', { id: 'fig1', kind: 'quote', text: 'Figure from Lee', record: record('Lee', 2020, 'Sleep'), page: 5, media: { kind: 'image', src: 'data:image/svg+xml;base64,AAA', caption: 'Recall by hours' } }],
    ['tab1', { id: 'tab1', kind: 'quote', text: '', record: record('Abe', 2018, 'Focus'), media: { kind: 'table', table, caption: 'Recall by sleep' } }],
    ['figOwn', { id: 'figOwn', kind: 'mine', text: '', media: { kind: 'image', src: 'x', caption: 'My own plot' } }],
    ['fig2', { id: 'fig2', kind: 'quote', text: 'No record', media: { kind: 'image', src: 'y', caption: 'Copied figure' } }],
    ['own2', { id: 'own2', kind: 'mine', text: 'Also $$a^2 + b^2 = c^2$$ and inline $x$.' }],
  ]);
  return { o, clips };
}

test('figures and tables are numbered in order and cite their source; own figures need none; a copied one is flagged', () => {
  const { o, clips } = mediaSetup();
  const doc = buildPreview(o, clips, 'harvard');
  const blocks = doc.sections.find((s) => s.key === 'results').parts[0].blocks;
  const media = blocks.filter((b) => b.kind === 'figure' || b.kind === 'table');
  assert.deepEqual(media.map((b) => [b.kind, b.number, b.noSource]), [['figure', 1, false], ['table', 1, false], ['figure', 2, false], ['figure', 3, true]]);
  assert.equal(markerText(media[0].marker), '(Lee and Patel, 2020, p. 5)'.replace('Lee and Patel', 'Lee'));
  assert.equal(markerText(media[1].marker), '(Abe, 2018)');
  assert.equal(media[2].marker.length, 0);
  assert.equal(doc.unsourcedCount, 1);
  assert.deepEqual(doc.references.map((r) => r.sourceId), ['tab1', 'fig1']); // Harvard lists alphabetically: Abe, Lee
});

test('display equations are numbered across the paper in order; inline maths is not numbered', () => {
  const { o, clips } = mediaSetup();
  const doc = buildPreview(setSectionPoint(o, sec(o, 'introduction').id, 'We show $$y = mx$$ here.'), clips, 'harvard');
  const intro = doc.sections.find((s) => s.key === 'introduction');
  assert.deepEqual(intro.pointSegments.map((s) => [s.type, s.number]), [['text', undefined], ['display', 1], ['text', undefined]]);
  const blocks = doc.sections.find((s) => s.key === 'results').parts[0].blocks.filter((b) => b.kind === 'own');
  assert.deepEqual(blocks[0].segments.filter((s) => s.type === 'display').map((s) => s.number), [2]);
  assert.deepEqual(blocks[1].segments.filter((s) => s.type === 'display').map((s) => s.number), [3]);
  assert.deepEqual(blocks[1].segments.filter((s) => s.type === 'inline').map((s) => s.number), [undefined]);
});

test('figures placed under a part still show, after its sentences, when the section has a draft', () => {
  const { o, clips } = mediaSetup();
  const id = sec(o, 'results').id;
  const p = sec(o, 'results').parts[0].id;
  const withDraft = setSectionDraft(o, id, { generatedAt: 'x', sentences: [{ text: 'Recall rose with sleep.', clipIds: ['fig1'], partId: p, status: 'sourced', placeholder: false }] });
  const doc = buildPreview(withDraft, clips, 'ieee');
  const blocks = doc.sections.find((s) => s.key === 'results').parts[0].blocks;
  assert.equal(blocks[0].kind, 'sentence');
  assert.deepEqual(blocks.slice(1).map((b) => b.kind), ['figure', 'table', 'figure', 'figure']);
  // numbers follow the order of drawing: the sentence cites fig1 first, then the table
  assert.deepEqual(doc.references.map((r) => r.label), ['[1]', '[2]']);
});

function authoredSetup(text, cites) {
  let o = createOutline('imrad');
  const id = sec(o, 'introduction').id;
  o = setSectionAuthored(o, id, { text, cites });
  const clips = new Map([
    ['q1', { id: 'q1', kind: 'quote', text: 'Q one', record: record('Lee', 2020), page: 14 }],
    ['q2', { id: 'q2', kind: 'quote', text: 'Q two', record: record('Abe', 2018), page: 3 }],
    ['mine', { id: 'mine', kind: 'mine', text: 'Pilot' }],
    ['ai', { id: 'ai', kind: 'ai-summary', text: 'Summary' }],
  ]);
  return { o, clips, section: (doc) => doc.sections.find((s) => s.key === 'introduction') };
}
const render = (segments) => segments.map((s) => (s.type === 'cite' ? markerText(s.marker) : s.value)).join('');

test('own text shows its paragraphs with citation markers in the chosen style; the page appears only after a quotation', () => {
  const { o, clips, section } = authoredSetup('Sleep helps [@Lee2020]. He wrote "a direct quotation here" [@Lee2020].\n\nFocus fades [@Abe2018; @Lee2020].', { Lee2020: 'q1', Abe2018: 'q2' });
  const h = buildPreview(o, clips, 'harvard');
  const blocks = section(h).parts[0].blocks.filter((b) => b.kind === 'authored');
  assert.equal(blocks.length, 2);
  assert.equal(render(blocks[0].segments), 'Sleep helps (Lee, 2020). He wrote "a direct quotation here" (Lee, 2020, p. 14).');
  assert.equal(render(blocks[1].segments), 'Focus fades (Abe, 2018; Lee, 2020).');
  const n = buildPreview(o, clips, 'ieee');
  assert.equal(render(section(n).parts[0].blocks.filter((b) => b.kind === 'authored')[1].segments), 'Focus fades [2], [1].'.replace('[2], [1]', '[1], [2]'));
  assert.deepEqual(n.references.map((r) => r.label), ['[1]', '[2]']);
  assert.equal(h.hasAiDraft, false);
});

test('own text: a citation to your own clip draws nothing; one that can not be cited shows (source?) and is counted', () => {
  const { o, clips, section } = authoredSetup('Our pilot [@Mine] agrees. See the summary [@Ai] and [@Nope].', { Mine: 'mine', Ai: 'ai' });
  const doc = buildPreview(o, clips, 'harvard');
  assert.equal(render(section(doc).parts[0].blocks[0].segments), 'Our pilot agrees. See the summary (source?) and (source?).');
  assert.equal(doc.unsourcedCount, 2);
  assert.deepEqual(doc.references, []);
});

test('own text replaces the draft in the preview; the AI note shows only when the text began as a draft; maths in it is numbered', () => {
  let { o, clips, section } = authoredSetup('Mine now. $$a = b$$', {});
  o = setSectionDraft(o, sec(o, 'introduction').id, { generatedAt: 'x', sentences: [{ text: 'Draft sentence.', clipIds: [], status: 'unsourced', placeholder: false }] });
  let doc = buildPreview(o, clips, 'harvard');
  assert.equal(section(doc).isDraft, false);
  assert.equal(section(doc).parts[0].blocks.some((b) => b.kind === 'sentence'), false);
  assert.equal(doc.hasAiDraft, false);
  assert.deepEqual(section(doc).parts[0].blocks[0].segments.filter((s) => s.type === 'display').map((s) => s.number), [1]);
  o = setSectionAuthored(o, sec(o, 'introduction').id, { text: 'Mine now.', cites: {}, aiAssisted: true });
  doc = buildPreview(o, clips, 'harvard');
  assert.equal(doc.hasAiDraft, true);
});
