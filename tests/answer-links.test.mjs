import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnswerLinks, quoteIsOnPage, linkTitle, overlapScore, quoteHighlightText } from '../src/lib/qa/answerLinks.ts';

const cite = (quote, pageNumber, supported = true, extra = {}) => ({ quote, pageNumber, supported, ...extra });

test('unverified page marker is removed and gets no link', () => {
  const out = buildAnswerLinks('Interviews are cheap. [Page 5]', [cite('unrelated words here', 1)]);
  assert.equal(out.length, 1);
  assert.ok(!/Page 5/.test(out[0].text));
  assert.deepEqual(out[0].citationIndexes, [0]); // end-of-answer fallback, not the marker
});

test('marker matching a supported citation page becomes that citation', () => {
  const out = buildAnswerLinks('First paragraph.\n\nSecond one [p. 3] ends.', [cite('zzz qqq', 3)]);
  assert.equal(out[1].text, 'Second one ends.');
  assert.deepEqual(out[1].citationIndexes, [0]);
  assert.deepEqual(out[0].citationIndexes, []);
});

test('marker for a page with only an unsupported citation is dropped', () => {
  const out = buildAnswerLinks('Claim [Page 2].', [cite('claim', 2, false)]);
  assert.equal(out[0].text, 'Claim.');
  assert.deepEqual(out[0].citationIndexes, []);
});

test('best token overlap picks the paragraph; unmatched goes to the end', () => {
  const answer = 'Cats purr loudly at night.\n\nResearch interviews reveal user motivations clearly.\n\nThe end.';
  const out = buildAnswerLinks(answer, [
    cite('interviews reveal user motivations', 4),
    cite('quantum chromodynamics lattice', 9),
  ]);
  assert.deepEqual(out[1].citationIndexes, [0]);
  assert.deepEqual(out[2].citationIndexes, [1]);
});

test('several citations can sit on one paragraph; unsupported never get icons', () => {
  const out = buildAnswerLinks('Alpha beta gamma delta.', [
    cite('alpha beta', 1), cite('gamma delta', 2), cite('alpha beta gamma', 3, false),
  ]);
  assert.deepEqual(out[0].citationIndexes, [0, 1]);
});

test('multi-page marker and no raw markers survive', () => {
  const out = buildAnswerLinks('Text (pp. 3-5) and [Pages 1, 3].', [cite('text', 3)]);
  assert.ok(!/\[|\(p/.test(out[0].text), out[0].text);
  assert.deepEqual(out[0].citationIndexes, [0]);
});

test('quoteIsOnPage uses offsets or page search, ignores spacing and hyphenation', () => {
  const page = 'Start here.  Research is the sys-\ntematic inquiry into things. End.';
  assert.equal(quoteIsOnPage({ quote: 'systematic inquiry into things' }, page), true);
  assert.equal(quoteIsOnPage({ quote: 'Start here.', start: 0, end: 11 }, page), true);
  assert.equal(quoteIsOnPage({ quote: 'not on this page' }, page), false);
  assert.equal(quoteIsOnPage({ quote: 'x' }, undefined), false);
});

test('linkTitle truncates quote to 80 chars', () => {
  const t = linkTitle({ quote: 'a'.repeat(200), pageNumber: 7 });
  assert.equal(t, `Page 7: ${'a'.repeat(80)}`);
  assert.ok(overlapScore('', 'x') === 0);
});

test('full-width page markers like 【Page 1】 are removed from the answer text', () => {
  const answer = 'Participants walked at **1.25 m/s** (approximately **4.5 km/h**)【Page 1】 【Page 3】.';
  const paragraphs = buildAnswerLinks(answer, []);
  const text = paragraphs.map((p) => p.text).join('\n\n');
  assert.ok(!/【|】|Page 1|Page 3/.test(text), 'no marker left: ' + text);
  assert.match(text, /1\.25 m\/s/);
});

test('a full-width marker matching a verified citation page attaches that citation', () => {
  const citations = [{ quote: 'walked at 1.25 m/s for 5 minutes', pageNumber: 1, supported: true }];
  const paragraphs = buildAnswerLinks('Participants walked at 1.25 m/s【Page 1】.', citations);
  assert.deepEqual(paragraphs[0].citationIndexes, [0]);
});

test('quoteIsOnPage accepts a stitched quote whose pieces are all on the page, in order', () => {
  const page = 'The mean lumped position gains in walking were lower than the critical stiffness (K̂n > −1) in both directions and were significantly lower than the position gains in standing. The peak values in walking and values in standing all exceeded their critical values (K̂n <−1).';
  const c = { quote: 'The mean lumped position gains in walking were lower than the critical stiffness (Kn > −1) in both directions... The peak values in walking and values in standing all exceeded their critical values (Kn <−1).', pageNumber: 8, supported: true };
  assert.equal(quoteIsOnPage(c, page), true);
});

test('quoteIsOnPage rejects a stitched quote when the pieces are out of order or missing', () => {
  const page = 'First sentence about walking speed here. Second sentence about standing tasks there.';
  assert.equal(quoteIsOnPage({ quote: 'Second sentence about standing tasks there... First sentence about walking speed here.' }, page), false);
  assert.equal(quoteIsOnPage({ quote: 'First sentence about walking speed here... Something that is not there at all.' }, page), false);
});

test('a quote with a sentence left out is on the page when every sentence it keeps is', () => {
  const page =
    'For standing tasks, participants stood on the instru-\nmented treadmill and were asked to perform: 1) Normal standing: stand upright with feet together. 2) Unipedal\n' +
    'standing: stand on the preferred leg with the other leg in a position in which they could maintain stability. We tested the preferred leg only, because previously no differences were observed [23]. 3) Step posture: participants took a natural step as if walking normally at least three times.';
  const quote = 'For standing tasks, participants stood on the instrumented treadmill and were asked to perform: 1) Normal standing: stand upright with feet together. 2) Unipedal standing: stand on the preferred leg with the other leg in a position in which they could maintain stability. 3) Step posture: participants took a natural step as if walking normally at least three times.';
  assert.equal(quoteIsOnPage({ quote }, page), true);
});

test('a quote with invented text is not on the page, even if one sentence is real', () => {
  const page = 'Participants walked at 1.25 m/s for five minutes on a treadmill in the laboratory.';
  const quote = 'Participants walked at 1.25 m/s for five minutes on a treadmill in the laboratory. The results were later confirmed in a second study of two hundred older adults at three hospitals.';
  assert.equal(quoteIsOnPage({ quote }, page), false);
});

test('quoteHighlightText highlights the whole quote when it is all on the page, else its first sentence', () => {
  const page = 'First verified piece of text here. Second piece of text here. Something else.';
  assert.equal(quoteHighlightText({ quote: 'First verified piece of text here. Second piece of text here.' }, page), 'First verified piece of text here. Second piece of text here.');
  assert.equal(quoteHighlightText({ quote: 'First verified piece of text here... A different last sentence is here.' }, page), 'First verified piece of text here');
  assert.equal(quoteHighlightText({ quote: '1.25 m/s' }, '1.25 m/s'), '1.25 m/s');
});
