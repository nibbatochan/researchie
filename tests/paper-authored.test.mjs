// Run: node --test --no-warnings tests/paper-authored.test.mjs
// The researcher's own text with [@key] citations: tokens, keys, checks, and turning an AI draft into text.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitCites, paragraphsOf, keyFor, addCite, pruneCites, checkAuthored, draftToText } from '../src/lib/paper/authored.ts';

const record = (family, year) => ({ status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [], title: 'T', year, authors: [{ family, given: 'A' }] });
const clip = (id, kind, text, rec) => ({ id, kind, text, record: rec });
const clips = new Map([
  ['q1', clip('q1', 'quote', 'Participants who slept eight hours recalled more words than those who slept five hours.', record('Lee', 2020))],
  ['q2', clip('q2', 'quote', 'Attention drifts after long periods of focused work.', record('Abe', 2018))],
  ['norec', clip('norec', 'quote', 'A quote with no reference details attached to it.')],
  ['ai', clip('ai', 'ai-summary', 'A machine summary.')],
  ['mine', clip('mine', 'mine', 'My pilot result.')],
]);
const cites = { Lee2020: 'q1', Abe2018: 'q2', Norec: 'norec', Ai: 'ai', Mine: 'mine', Gone: 'deleted' };
const ids = (r) => r.issues.map((i) => i.id);

test('tokens are found in order, with several keys in one', () => {
  assert.deepEqual(splitCites('Sleep helps [@Lee2020] and focus [@Abe2018; @Lee2020].'), [
    { type: 'text', value: 'Sleep helps ' }, { type: 'cite', keys: ['Lee2020'] },
    { type: 'text', value: ' and focus ' }, { type: 'cite', keys: ['Abe2018', 'Lee2020'] }, { type: 'text', value: '.' },
  ]);
  assert.deepEqual(splitCites('No tokens, and [a normal bracket] stays.'), [{ type: 'text', value: 'No tokens, and [a normal bracket] stays.' }]);
});

test('paragraphs split on a blank line; single line breaks join', () => {
  assert.deepEqual(paragraphsOf('One\nstill one.\n\n\nTwo.\n  \nThree.'), ['One still one.', 'Two.', 'Three.']);
  assert.deepEqual(paragraphsOf('   '), []);
});

test('keys: author and year, a later one with the same name gets a letter, no citation gives "clip"', () => {
  assert.equal(keyFor({ record: record('Lee', 2020) }, new Set()), 'Lee2020');
  assert.equal(keyFor({ record: record('Lee', 2020) }, new Set(['Lee2020'])), 'Lee2020b');
  assert.equal(keyFor({ record: record('Lee', 2020) }, new Set(['Lee2020', 'Lee2020b'])), 'Lee2020c');
  assert.equal(keyFor({}, new Set()), 'clip');
  assert.equal(keyFor({ record: record("O'Brien-Smith", 2019) }, new Set()), 'OBrienSmith2019');
});

test('addCite reuses the key of a clip already cited and never overwrites another key', () => {
  const a = addCite({}, 'q1', clips.get('q1'));
  assert.deepEqual(a, { key: 'Lee2020', cites: { Lee2020: 'q1' } });
  assert.equal(addCite(a.cites, 'q1', clips.get('q1')).cites, a.cites);
  const b = addCite(a.cites, 'other', { record: record('Lee', 2020) });
  assert.equal(b.key, 'Lee2020b');
  assert.deepEqual(b.cites, { Lee2020: 'q1', Lee2020b: 'other' });
});

test('pruneCites drops keys the text no longer uses', () => {
  assert.deepEqual(pruneCites('Only [@Lee2020] here.', { Lee2020: 'q1', Abe2018: 'q2' }), { Lee2020: 'q1' });
});

test('a clean text with a quotation that is in the clip passes', () => {
  const r = checkAuthored('As reported, "Participants who slept eight hours recalled more words" [@Lee2020]. We did the same in our pilot.', cites, clips);
  // nothing blocks; the pilot sentence cites no source, which only warns
  assert.deepEqual(r.issues.map((i) => [i.id, i.severity]), [['authored-uncited', 'warn']]);
  assert.deepEqual(r.citedClipIds, ['q1']);
});

test('unknown key, deleted clip, AI summary and a clip with no reference details all block', () => {
  const r = checkAuthored('One [@Nope]. Two [@Gone]. Three [@Ai]. Four [@Norec].', cites, clips);
  assert.deepEqual(ids(r), ['authored-bad-key', 'authored-missing-clip', 'authored-ai-summary', 'authored-no-record']);
  assert.ok(r.issues.every((i) => i.severity === 'block'));
});

test('a quotation that is not in the cited clip blocks; copied words without quotes block', () => {
  const bad = checkAuthored('He wrote "Participants who slept ten hours recalled more words" [@Lee2020].', cites, clips);
  assert.deepEqual(ids(bad), ['authored-bad-quote']);
  const copied = checkAuthored('Participants who slept eight hours recalled more words than those who slept five hours [@Lee2020].', cites, clips);
  assert.deepEqual(ids(copied), ['authored-copied']);
  const reworded = checkAuthored('Eight hours of sleep helped people remember more words than five hours did [@Lee2020].', cites, clips);
  assert.deepEqual(ids(reworded), []);
});

test('own numbers and equations next to a citation are not flagged; citing your own clip is fine', () => {
  const r = checkAuthored('Our pilot of 40 students found $r = 0.4$ [@Mine] and agrees with earlier work [@Lee2020].', cites, clips);
  assert.deepEqual(ids(r), []);
});

test('sentences with no citation only warn, and only when they are real sentences', () => {
  const r = checkAuthored('Sleep affects memory in many ways that researchers have studied for decades. Short one. We ran 3 trials.', cites, clips);
  assert.deepEqual(r.issues.map((i) => [i.id, i.severity]), [['authored-uncited', 'warn']]);
  assert.match(r.issues[0].message, /^1 sentence cites no source/);
});

test('an AI draft becomes text: a token before each full stop, one paragraph per part, nothing for own notes', () => {
  const draft = { generatedAt: 'x', sentences: [
    { text: 'Longer sleep helps recall.', clipIds: ['q1'], partId: 'p1', status: 'sourced', placeholder: false },
    { text: 'I saw the same in a pilot.', clipIds: ['mine'], partId: 'p1', status: 'own', placeholder: false },
    { text: 'Focus fades and sleep matters', clipIds: ['q2', 'q1'], partId: 'p2', status: 'sourced', placeholder: false },
    { text: 'Loose sentence.', clipIds: [], status: 'unsourced', placeholder: false },
  ] };
  const out = draftToText(draft, ['p1', 'p2'], clips);
  assert.equal(out.text, 'Longer sleep helps recall [@Lee2020]. I saw the same in a pilot.\n\nFocus fades and sleep matters [@Abe2018; @Lee2020]\n\nLoose sentence.');
  assert.deepEqual(out.cites, { Lee2020: 'q1', Abe2018: 'q2' });
  assert.ok(checkAuthored(out.text, out.cites, clips).issues.every((i) => i.severity === 'warn'));
});
