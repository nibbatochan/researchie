// Run: node --test --no-warnings tests/paper-draft.test.mjs
// Drafting: the prompt stays small, the model's answer is read defensively, and each sentence is checked
// against the clips it names. No network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftPrompt, parseDraftResponse, classifySentence, needsAttention, countClips } from '../src/lib/paper/draft.ts';

const clip = (id, kind, text) => ({ id, kind, text });
const input = () => ({
  sectionTitle: 'Methods',
  sectionHint: 'What you did.',
  point: 'We ran a survey and interviews.',
  parts: [
    { id: 'pa', title: 'Survey', clips: [clip('uuid-1', 'quote', 'Forty adults completed the online survey in March.'), clip('uuid-2', 'mine', 'I recruited through two campus groups.')] },
    { id: 'pb', title: 'Interviews', clips: [clip('uuid-3', 'ai-summary', 'Twelve people were interviewed.')] },
  ],
});
const answer = (sentences) => JSON.stringify({ sentences });

test('the prompt labels each clip by kind, uses short aliases, and keeps part order', () => {
  const p = buildDraftPrompt(input());
  assert.match(p.user, /PART 1: Survey/);
  assert.match(p.user, /\[c1\] QUOTE: Forty adults/);
  assert.match(p.user, /\[c2\] MINE:/);
  assert.match(p.user, /\[c3\] AI SUMMARY:/);
  assert.equal(p.aliasToId.get('c3'), 'uuid-3');
  assert.ok(p.user.indexOf('PART 1') < p.user.indexOf('PART 2'));
});

test('a long section is cut so the prompt stays inside the budget', () => {
  const big = { ...input(), parts: [{ id: 'p', title: 'T', clips: Array.from({ length: 12 }, (_, i) => clip(`u${i}`, 'quote', 'word '.repeat(500))) }] };
  const p = buildDraftPrompt(big);
  assert.ok(p.user.length < 8000, `prompt was ${p.user.length} characters`);
  assert.equal(countClips(big), 12);
});

test('a sentence that rests on a quote is sourced; aliases map back to real clip ids', () => {
  const i = input();
  const { aliasToId } = buildDraftPrompt(i);
  const out = parseDraftResponse(answer([{ p: 1, text: 'Forty adults completed the survey.', clips: ['c1'] }]), i, aliasToId);
  assert.deepEqual(out[0].clipIds, ['uuid-1']);
  assert.equal(out[0].partId, 'pa');
  assert.equal(out[0].status, 'sourced');
});

test('no clip means unsourced; an invented clip id is dropped and counts as no clip', () => {
  const i = input();
  const { aliasToId } = buildDraftPrompt(i);
  const out = parseDraftResponse(answer([{ p: 1, text: 'Sleep is good.', clips: [] }, { p: 1, text: 'Water is wet.', clips: ['c99', 'made-up'] }]), i, aliasToId);
  assert.deepEqual(out.map((s) => s.status), ['unsourced', 'unsourced']);
  assert.deepEqual(out[1].clipIds, []);
});

test('a quotation that is not word for word in the cited quote clip is flagged', () => {
  const i = input();
  const { aliasToId } = buildDraftPrompt(i);
  const good = parseDraftResponse(answer([{ p: 1, text: 'As reported, "Forty adults completed the online survey" in March.', clips: ['c1'] }]), i, aliasToId);
  const bad = parseDraftResponse(answer([{ p: 1, text: 'As reported, "Fifty adults completed the online survey" in March.', clips: ['c1'] }]), i, aliasToId);
  assert.equal(good[0].status, 'sourced');
  assert.equal(bad[0].status, 'bad-quote');
});

test('eight or more words copied from a quote clip without quotation marks are flagged as copied', () => {
  const i = { ...input(), parts: [{ id: 'pa', title: 'S', clips: [clip('u1', 'quote', 'Participants who slept eight hours recalled more words than those who slept five hours.')] }] };
  const { aliasToId } = buildDraftPrompt(i);
  const out = parseDraftResponse(answer([
    { p: 1, text: 'Participants who slept eight hours recalled more words than those who slept five hours.', clips: ['c1'] },
    { p: 1, text: 'The authors report that "Participants who slept eight hours recalled more words than those who slept five hours".', clips: ['c1'] },
    { p: 1, text: 'Well-rested participants remembered more words than people who slept less.', clips: ['c1'] },
  ]), i, aliasToId);
  assert.deepEqual(out.map((s) => s.status), ['copied', 'sourced', 'sourced']);
});

test('text from an AI summary or your own note can not be used as a quotation', () => {
  const i = input();
  const { aliasToId } = buildDraftPrompt(i);
  const out = parseDraftResponse(answer([{ p: 2, text: 'The report says "Twelve people were interviewed" overall.', clips: ['c3'] }]), i, aliasToId);
  assert.equal(out[0].status, 'bad-quote');
});

test('a number that is in none of the cited clips is flagged', () => {
  const i = input();
  const { aliasToId } = buildDraftPrompt(i);
  const out = parseDraftResponse(answer([{ p: 1, text: 'Forty adults answered 12 questions.', clips: ['c1'] }, { p: 1, text: 'Forty adults answered.', clips: ['c1'] }]), i, aliasToId);
  assert.equal(out[0].status, 'bad-number');
  assert.equal(out[1].status, 'sourced');
});

test('a sentence resting only on an AI summary is ai-based; only on your own notes is own', () => {
  const i = input();
  const { aliasToId } = buildDraftPrompt(i);
  const out = parseDraftResponse(answer([{ p: 2, text: 'Twelve people were interviewed.', clips: ['c3'] }, { p: 1, text: 'I recruited through campus groups.', clips: ['c2'] }]), i, aliasToId);
  assert.deepEqual(out.map((s) => s.status), ['ai-based', 'own']);
});

test('placeholders are kept and make a sentence need attention', () => {
  const i = input();
  const { aliasToId } = buildDraftPrompt(i);
  const out = parseDraftResponse(answer([{ p: 1, text: 'The sample was [sample size?] adults.', clips: ['c2'] }]), i, aliasToId);
  assert.equal(out[0].placeholder, true);
  assert.equal(needsAttention(out[0]), true);
});

test('unusable answers return undefined; fenced JSON is accepted', () => {
  const i = input();
  const { aliasToId } = buildDraftPrompt(i);
  assert.equal(parseDraftResponse('not json', i, aliasToId), undefined);
  assert.equal(parseDraftResponse('{"other":1}', i, aliasToId), undefined);
  const fenced = '```json\n' + answer([{ p: 1, text: 'Forty adults.', clips: ['c1'] }]) + '\n```';
  assert.equal(parseDraftResponse(fenced, i, aliasToId).length, 1);
});

test('classifySentence re-checks an edited sentence', () => {
  const clips = new Map([['uuid-1', clip('uuid-1', 'quote', 'Forty adults completed the online survey in March.')]]);
  assert.equal(classifySentence('Forty adults completed it.', ['uuid-1'], clips), 'sourced');
  assert.equal(classifySentence('Forty adults completed it.', [], clips), 'unsourced');
  assert.equal(classifySentence('Fifty adults completed it.', ['uuid-1'], clips), 'sourced'); // words are not facts-checked, only numbers
  assert.equal(classifySentence('Fifty-one adults completed it in 2019.', ['uuid-1'], clips), 'bad-number');
});
