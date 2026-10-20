// Run: node --test --no-warnings tests/paper-checklist.test.mjs
// Section checklist: what blocks "Mark as done" and what only warns. No network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutline, addPart, assignClip, setSectionPoint, setSectionDone, setSectionDraft, setSectionAuthored, nextSection, doneCount, parseOutline } from '../src/lib/paper/outline.ts';
import { checkSection, LONG_QUOTE_WORDS } from '../src/lib/paper/checklist.ts';

const rec = (over = {}) => ({
  status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [],
  title: 'Sleep and memory', journal: 'J Ex', volume: '1', pages: '1-2', year: 2020, authors: [{ family: 'Lee', given: 'A' }], retracted: false, ...over,
});
const sec = (o, key) => o.sections.find((s) => s.key === key);
const ids = (c) => c.items.map((i) => i.id);

function withClips(clips) {
  let o = createOutline('imrad');
  o = addPart(o, sec(o, 'introduction').id, 'Background');
  const p = sec(o, 'introduction').parts[0].id;
  for (const c of clips) o = assignClip(o, p, c.id);
  return { o, section: sec(o, 'introduction'), map: new Map(clips.map((c) => [c.id, c])) };
}

test('an empty section is blocked; a point alone is enough to pass', () => {
  const { o } = withClips([]);
  assert.deepEqual(ids(checkSection(sec(o, 'introduction'), new Map())), ['empty']);
  const withPoint = setSectionPoint(o, sec(o, 'introduction').id, 'Sleep matters.');
  assert.equal(checkSection(sec(withPoint, 'introduction'), new Map()).canComplete, true);
});

test('quote clips with a citation pass; without one they block', () => {
  const ok = withClips([{ id: 'a', kind: 'quote', text: 'Short quote.', record: rec() }]);
  assert.equal(checkSection(ok.section, ok.map).canComplete, true);
  const bad = withClips([{ id: 'a', kind: 'quote', text: 'No record.' }]);
  const r = checkSection(bad.section, bad.map);
  assert.equal(r.canComplete, false);
  assert.ok(ids(r).includes('uncited'));
});

test('AI summaries block; your own notes pass', () => {
  const ai = withClips([{ id: 'a', kind: 'ai-summary', text: 'Summary.' }]);
  assert.ok(ids(checkSection(ai.section, ai.map)).includes('ai-summary'));
  const mine = withClips([{ id: 'a', kind: 'mine', text: 'My note.' }]);
  assert.equal(checkSection(mine.section, mine.map).canComplete, true);
});

test('a retracted cited source blocks; an unchecked one only warns', () => {
  const r1 = withClips([{ id: 'a', kind: 'quote', text: 'Q.', record: rec({ retracted: true }) }]);
  const c1 = checkSection(r1.section, r1.map);
  assert.equal(c1.canComplete, false);
  assert.ok(c1.items.some((i) => i.id === 'retracted-a' && i.severity === 'block'));
  const r2 = withClips([{ id: 'a', kind: 'quote', text: 'Q.', record: rec({ retracted: undefined }) }]);
  const c2 = checkSection(r2.section, r2.map);
  assert.equal(c2.canComplete, true);
  assert.ok(c2.items.some((i) => i.id === 'retraction-unchecked' && i.severity === 'warn'));
});

test('a source-health retraction state also counts; a concern warns; no result at all warns', () => {
  const run = (over, extra) => {
    const { section, map } = withClips([{ id: 'a', kind: 'quote', text: 'Q.', record: rec(over), ...extra }]);
    return checkSection(section, map);
  };
  const removed = run({ retracted: undefined }, { retractionState: 'removed' });
  assert.equal(removed.canComplete, false);
  const concern = run({ retracted: undefined }, { retractionState: 'concern' });
  assert.equal(concern.canComplete, true);
  assert.ok(ids(concern).includes('retraction-concern'));
  assert.ok(!ids(concern).includes('retraction-unchecked'));
  const noneFound = run({ retracted: undefined }, { retractionState: 'none_found' });
  assert.deepEqual(ids(noneFound), []);
});

test('a quote over the word limit warns but does not block', () => {
  const long = Array.from({ length: LONG_QUOTE_WORDS + 5 }, (_, i) => `word${i}`).join(' ');
  const { section, map } = withClips([{ id: 'a', kind: 'quote', text: long, record: rec() }]);
  const r = checkSection(section, map);
  assert.equal(r.canComplete, true);
  assert.ok(r.items.some((i) => i.id === 'long-quote' && i.severity === 'warn'));
  const short = withClips([{ id: 'a', kind: 'quote', text: 'ten words '.repeat(5), record: rec() }]);
  assert.ok(!ids(checkSection(short.section, short.map)).includes('long-quote'));
});

const draftOf = (sentences) => ({ generatedAt: 'x', sentences: sentences.map((s) => ({ clipIds: [], placeholder: false, status: 'sourced', ...s })) });

test('draft: every flagged status blocks, with a count', () => {
  const { o, map } = withClips([{ id: 'a', kind: 'quote', text: 'Q.', record: rec() }]);
  const id = sec(o, 'introduction').id;
  const flagged = setSectionDraft(o, id, draftOf([
    { text: 'x', status: 'unsourced' }, { text: 'y', status: 'unsourced' }, { text: 'z', status: 'bad-quote' },
    { text: 'n', status: 'bad-number' }, { text: 'c', status: 'copied' }, { text: 'm', status: 'mixed' }, { text: 'ai', status: 'ai-based' },
  ]));
  const r = checkSection(sec(flagged, 'introduction'), map);
  assert.deepEqual(ids(r), ['status-unsourced', 'status-bad-quote', 'status-bad-number', 'status-copied', 'status-mixed', 'status-ai-based']);
  assert.match(r.items[0].message, /^2 sentences/);
  assert.equal(r.canComplete, false);
});

test('draft: placeholders block; a clean draft passes and checks retraction on the clips it cites', () => {
  const clips = [{ id: 'a', kind: 'quote', text: 'Q.', record: rec({ retracted: true }) }];
  const { o, map } = withClips(clips);
  const id = sec(o, 'introduction').id;
  const ph = checkSection(sec(setSectionDraft(o, id, draftOf([{ text: 'Sample was [n?].', clipIds: ['a'], placeholder: true }])), 'introduction'), map);
  assert.ok(ids(ph).includes('placeholders'));
  assert.ok(ids(ph).includes('retracted-a'));
  const clean = withClips([{ id: 'a', kind: 'quote', text: 'Q.', record: rec() }]);
  const ok = checkSection(sec(setSectionDraft(clean.o, sec(clean.o, 'introduction').id, draftOf([{ text: 'Fine.', clipIds: ['a'] }])), 'introduction'), clean.map);
  assert.equal(ok.canComplete, true);
});

test('draft: a long quotation inside a sentence warns; an empty draft blocks; clips the draft does not cite are ignored', () => {
  const longQuote = Array.from({ length: LONG_QUOTE_WORDS + 1 }, (_, i) => `w${i}`).join(' ');
  const { o, map } = withClips([{ id: 'a', kind: 'quote', text: longQuote, record: rec() }, { id: 'b', kind: 'quote', text: 'No record.' }]);
  const id = sec(o, 'introduction').id;
  const r = checkSection(sec(setSectionDraft(o, id, draftOf([{ text: `He wrote "${longQuote}" here.`, clipIds: ['a'] }])), 'introduction'), map);
  assert.ok(ids(r).includes('long-quote'));
  assert.equal(r.canComplete, true);
  assert.ok(ids(checkSection(sec(setSectionDraft(o, id, draftOf([])), 'introduction'), map)).includes('empty-draft'));
});

test('done flag: set, clear, count, survives save and load; next section skips done ones', () => {
  let o = createOutline('imrad');
  assert.equal(nextSection(o).key, 'abstract');
  o = setSectionDone(o, sec(o, 'abstract').id, true);
  assert.equal(doneCount(o), 1);
  assert.equal(nextSection(o).key, 'introduction');
  assert.equal(parseOutline(JSON.parse(JSON.stringify(o))).sections[0].done, true);
  o = setSectionDone(o, sec(o, 'abstract').id, false);
  assert.equal(doneCount(o), 0);
  for (const s of o.sections) o = setSectionDone(o, s.id, true);
  assert.equal(nextSection(o), undefined);
  let p = createOutline('imrad');
  for (const s of p.sections) p = setSectionPoint(p, s.id, 'point');
  p = setSectionDone(p, sec(p, 'abstract').id, true);
  assert.equal(nextSection(p).key, 'introduction');
});

const img = (over = {}) => ({ id: 'f', kind: 'quote', text: '', media: { kind: 'image', src: 'x', caption: 'A caption' }, record: rec(), ...over });

test('figures: a borrowed one warns about permission; one with no source blocks; your own needs nothing', () => {
  const borrowed = withClips([img()]);
  const c1 = checkSection(borrowed.section, borrowed.map);
  assert.equal(c1.canComplete, true);
  assert.ok(c1.items.some((i) => i.id === 'figure-permission' && i.severity === 'warn'));

  const noSource = withClips([img({ record: undefined })]);
  const c2 = checkSection(noSource.section, noSource.map);
  assert.equal(c2.canComplete, false);
  assert.ok(ids(c2).includes('figure-source'));
  assert.ok(!ids(c2).includes('uncited')); // not also reported as an uncited quote

  const own = withClips([img({ kind: 'mine', record: undefined })]);
  assert.deepEqual(ids(checkSection(own.section, own.map)), []);
});

test('figures: a missing caption warns; a borrowed figure is checked for retraction like a quote', () => {
  const plain = withClips([img({ media: { kind: 'image', src: 'x', caption: '  ' }, kind: 'mine', record: undefined })]);
  assert.ok(ids(checkSection(plain.section, plain.map)).includes('figure-caption'));
  const retracted = withClips([img({ record: rec({ retracted: true }) })]);
  assert.equal(checkSection(retracted.section, retracted.map).canComplete, false);
});

test('figures placed under a part are still checked when the section has a draft', () => {
  const { o, map } = withClips([img({ record: undefined }), { id: 'q', kind: 'quote', text: 'Q.', record: rec() }]);
  const id = sec(o, 'introduction').id;
  const r = checkSection(sec(setSectionDraft(o, id, draftOf([{ text: 'Fine.', clipIds: ['q'] }])), 'introduction'), map);
  assert.ok(ids(r).includes('figure-source'));
});

test('a draft with a made-up equation blocks', () => {
  const { o, map } = withClips([{ id: 'q', kind: 'quote', text: 'Q.', record: rec() }]);
  const id = sec(o, 'introduction').id;
  const r = checkSection(sec(setSectionDraft(o, id, draftOf([{ text: 'x', clipIds: ['q'], status: 'bad-math' }])), 'introduction'), map);
  assert.ok(ids(r).includes('status-bad-math'));
});

test('own text: citation problems block, an uncited sentence only warns, and the draft is not checked when text exists', () => {
  const { o, map } = withClips([{ id: 'q', kind: 'quote', text: 'Short clip text.', record: rec() }, { id: 'ai', kind: 'ai-summary', text: 'Summary.' }]);
  const id = sec(o, 'introduction').id;
  const withText = (text, cites) => sec(setSectionAuthored(setSectionDraft(o, id, draftOf([{ text: 'x', status: 'unsourced' }])), id, { text, cites }), 'introduction');

  const ok = checkSection(withText('Earlier work agrees [@Lee2020]. We also did our own tests in the lab this year.', { Lee2020: 'q' }), map);
  assert.equal(ok.canComplete, true); // the unsourced draft sentence is ignored: the text wins
  assert.deepEqual(ids(ok), ['authored-uncited']);

  const bad = checkSection(withText('See the summary [@Ai] and this [@Nope].', { Ai: 'ai' }), map);
  assert.equal(bad.canComplete, false);
  assert.deepEqual(ids(bad), ['authored-bad-key', 'authored-ai-summary']);

  const retracted = checkSection(withText('Earlier work agrees [@Lee2020].', { Lee2020: 'q' }), new Map([['q', { id: 'q', kind: 'quote', text: 'Short clip text.', record: rec({ retracted: true }) }]]));
  assert.equal(retracted.canComplete, false);
  assert.ok(ids(retracted).includes('retracted-q'));
});

test('own text: a long quotation warns; text with only maths and no clips still counts as written', () => {
  const longQuote = Array.from({ length: LONG_QUOTE_WORDS + 1 }, (_, i) => `w${i}`).join(' ');
  const { o, map } = withClips([{ id: 'q', kind: 'quote', text: longQuote, record: rec() }]);
  const id = sec(o, 'introduction').id;
  const r = checkSection(sec(setSectionAuthored(o, id, { text: `He wrote "${longQuote}" [@Lee2020].`, cites: { Lee2020: 'q' } }), 'introduction'), map);
  assert.ok(ids(r).includes('long-quote'));
  assert.equal(r.canComplete, true);
  const empty = withClips([]);
  const eid = sec(empty.o, 'introduction').id;
  assert.equal(checkSection(sec(setSectionAuthored(empty.o, eid, { text: 'We prove $x = 1$.', cites: {} }), 'introduction'), new Map()).canComplete, true);
});
