// Run: node --test --no-warnings tests/passages.test.mjs
// Passage chunking, retrieval and quote offsets. Pure: no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  splitPageIntoPassages,
  buildPassages,
  retrievePassages,
  locateQuote,
  CONTEXT_BUDGET_CHARS,
} from '../src/lib/ai/passages.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/plos-pages.json', import.meta.url), 'utf8'));

// The fixture holds only 4 pages (~16k chars). Pad with unrelated pages so the
// document is larger than the budget and retrieval has to choose.
const filler = Array.from({ length: 6 }, (_, i) => ({
  pageNumber: 5 + i,
  title: `Page ${5 + i}`,
  content: Array.from({ length: 12 }, (_, j) => `Filler sentence ${i}-${j} about gait analysis tables and reference formatting that is unrelated to the question being asked here.`).join(' '),
}));
const bigDoc = [...fixture, ...filler];

test('passages reproduce their text from offsets and never split a word', () => {
  for (const page of fixture) {
    const passages = splitPageIntoPassages(page.pageNumber, page.content);
    assert.ok(passages.length > 0);
    for (const p of passages) {
      assert.equal(page.content.slice(p.start, p.end), p.text);
      assert.ok(p.text.length <= 900, `passage ${p.id} is ${p.text.length} chars`);
      assert.match(p.id, /^p\d+-\d+$/);
      // Boundaries sit on whitespace or the page edge.
      if (p.start > 0) assert.match(page.content[p.start - 1], /\s/);
      if (p.end < page.content.length) assert.match(page.content[p.end], /\s/);
    }
  }
});

test('most passages are between 500 and 900 characters', () => {
  const passages = buildPassages(fixture);
  const inRange = passages.filter((p) => p.text.length >= 500 && p.text.length <= 900).length;
  assert.ok(inRange / passages.length >= 0.6, `${inRange}/${passages.length} in range`);
});

test('abstract question includes the abstract passage and stays under budget', () => {
  const r = retrievePassages(bigDoc, 'What is the abstract of this paper?');
  assert.ok(r.contextChars <= CONTEXT_BUDGET_CHARS);
  assert.ok(r.passages.some((p) => /abstract/i.test(p.text) && p.pageNumber === 1));
  assert.ok(r.relevant);
  assert.match(r.context, /\[P1-\d+ \| page 1\]/);
});

test('walking speed question retrieves the passage with 1.25 m/s', () => {
  const r = retrievePassages(bigDoc, 'How fast did participants walk?');
  assert.ok(r.relevant, `coverage ${r.coverage}`);
  assert.ok(r.passages.some((p) => p.text.includes('1.25 m/s')));
  assert.ok(r.contextChars <= CONTEXT_BUDGET_CHARS);
});

test('out-of-scope question is not relevant', () => {
  const r = retrievePassages(bigDoc, 'What is the boiling point of mercury?');
  assert.equal(r.relevant, false);
});

test('a document under the budget is sent whole', () => {
  const small = fixture.slice(0, 2);
  const r = retrievePassages(small, 'What is the boiling point of mercury?', { budget: 100000 });
  assert.equal(r.wholeDocument, true);
  assert.equal(r.passages.length, buildPassages(small).length);
});

test('explicit page references pull in that page', () => {
  const r = retrievePassages(bigDoc, 'Summarise page 3');
  assert.equal(r.targetPage, 3);
  assert.ok(r.passages.some((p) => p.pageNumber === 3));
});

test('locateQuote maps a normalised quote back to the exact original slice', () => {
  const page = fixture[0];
  const p = buildPassages([page]).find((x) => x.text.includes('\n'));
  assert.ok(p, 'fixture passage with a hard line break');
  const words = p.text.split(/\s+/);
  const quote = words.slice(3, 12).join(' ').toUpperCase(); // spaces for newlines, other case
  const loc = locateQuote(quote, page.content);
  assert.ok(loc);
  const slice = page.content.slice(loc.start, loc.end);
  assert.equal(slice.replace(/\s+/g, ' ').toLowerCase(), words.slice(3, 12).join(' ').toLowerCase());
  assert.equal(locateQuote('this sentence is not in the document at all', page.content), null);
});

test('locateQuote handles line breaks and punctuation', () => {
  const content = 'Intro.\n\nParticipants walked at\n1.25 m/s on average (SD 0.1).';
  const loc = locateQuote('walked at 1.25 m/s on average', content);
  assert.equal(content.slice(loc.start, loc.end), 'walked at\n1.25 m/s on average');
});

test('locateQuote finds a sentence whose word is split across a line break, with exact offsets', async () => {
  const { locateQuote } = await import('../src/lib/ai/passages.ts');
  const content = 'sign and data collection\nFifteen healthy participants participated in the experi-\nment. The experimental procedure';
  const quote = 'participated in the experiment.';
  const hit = locateQuote(quote, content);
  assert.notEqual(hit, null);
  assert.equal(content.slice(hit.start, hit.end), 'participated in the experi-\nment');
});

test('locateQuote supports a quote stitched from two sentences with "..." and ignores an accent mark', async () => {
  const { locateQuote } = await import('../src/lib/ai/passages.ts');
  const content =
    'The mean lumped position gains in walking were lower than the critical stiffness (K̂n > −1) in both directions ' +
    'and were significantly lower than the position gains in standing. The peak values in walking and values in standing ' +
    'all exceeded their critical values (K̂n <−1).';
  const quote =
    'The mean lumped position gains in walking were lower than the critical stiffness (Kn > −1) in both directions... ' +
    'The peak values in walking and values in standing all exceeded their critical values (Kn <−1).';
  const hit = locateQuote(quote, content);
  assert.notEqual(hit, null);
  assert.ok(content.slice(hit.start, hit.end).startsWith('The mean lumped position gains'));
  // The match ends at the last letter or digit, so the closing bracket is not included.
  assert.ok(content.slice(hit.start, hit.end).endsWith('(K̂n <−1'));
});

test('locateQuote still rejects a stitched quote when one piece is not in the text', async () => {
  const { locateQuote } = await import('../src/lib/ai/passages.ts');
  const content = 'Participants walked on a treadmill at a steady speed for five minutes. Nothing else was recorded.';
  assert.equal(locateQuote('Participants walked on a treadmill at a steady speed... They also ran a marathon every day.', content), null);
});

test('a question about page 13 keeps page 13 even when the budget is cut in half', async () => {
  const { retrievePassages, CONTEXT_BUDGET_CHARS } = await import('../src/lib/ai/passages.ts');
  const filler = (n) => Array.from({ length: 12 }, (_, i) => `Page ${n} sentence ${i}: the stabilization model was fitted to walking and standing data for each participant in the study.`).join(' ');
  const pages = Array.from({ length: 15 }, (_, i) => ({ pageNumber: i + 1, title: `Page ${i + 1}`, content: i + 1 === 13 ? `Conclusion. ${filler(13)}` : filler(i + 1) }));
  for (const budget of [CONTEXT_BUDGET_CHARS, Math.floor(CONTEXT_BUDGET_CHARS / 2)]) {
    const r = retrievePassages(pages, 'What does page 13 say?', { budget });
    assert.ok(r.passages.some((p) => p.pageNumber === 13), `page 13 missing at budget ${budget}`);
    assert.ok(r.context.length <= budget + 1500, `context too long at budget ${budget}: ${r.context.length}`);
  }
});
