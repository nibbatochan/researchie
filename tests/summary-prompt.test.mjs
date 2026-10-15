import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSummaryPrompt,
  extractiveSummary,
  parseSummaryMode,
  truncationNote,
  NO_TABLES_MESSAGE,
  SUMMARY_SYSTEM_PROMPT,
  SUMMARY_TEXT_LIMIT,
} from '../src/lib/ai/summaryPrompt.ts';

const PAGE = [
  'The council approved a new bicycle lane network on Tuesday after a two year study of commuter traffic.',
  'Cookie notice: we use cookies to improve your experience on this website.',
  'Construction will start in March and the first phase covers 12 kilometres of the river road.',
  'Short line.',
  'Officials expect the lanes to cut peak hour car trips by 8 percent within three years of opening.',
].join(' ');

test('an unknown or missing mode becomes auto', () => {
  assert.equal(parseSummaryMode(undefined), 'auto');
  assert.equal(parseSummaryMode('nonsense'), 'auto');
  assert.equal(parseSummaryMode('bullets'), 'bullets');
  assert.equal(parseSummaryMode('tables'), 'tables');
});

test('the system prompt forbids facts and advice the page does not state', () => {
  assert.match(SUMMARY_SYSTEM_PROMPT, /ONLY the page text/);
  assert.match(SUMMARY_SYSTEM_PROMPT, /implications/);
  assert.match(SUMMARY_SYSTEM_PROMPT, /no fixed template/);
});

test('each mode gives a different instruction and carries the page', () => {
  const prompts = ['auto', 'bullets', 'detailed', 'tables'].map((m) => buildSummaryPrompt(m, 'City news', PAGE));
  assert.equal(new Set(prompts).size, 4);
  for (const p of prompts) {
    assert.match(p, /Page title: City news/);
    assert.ok(p.includes('bicycle lane network'));
  }
  assert.match(prompts[1], /exactly 3 Markdown bullets/);
  assert.match(prompts[3], new RegExp(NO_TABLES_MESSAGE.replace('.', '\\.')));
});

test('no fixed section names are forced on the model', () => {
  const p = buildSummaryPrompt('auto', 'T', PAGE);
  for (const forced of ['Key Findings', 'Metrics', 'Implications', 'Executive']) {
    assert.ok(!p.includes(forced), forced);
  }
});

test('a page longer than the limit is cut, marked in the prompt, and noted in the summary', () => {
  const long = 'word '.repeat(SUMMARY_TEXT_LIMIT);
  const p = buildSummaryPrompt('auto', 'Long', long);
  assert.match(p, /\[Page text cut here\.\]/);
  assert.ok(p.length < SUMMARY_TEXT_LIMIT + 1000);
  assert.match(truncationNote(long), /first 15,000 characters/);
  assert.equal(truncationNote('short page'), '');
});

test('the fallback quotes real sentences only, skips boilerplate, and says no model wrote it', () => {
  const out = extractiveSummary(PAGE, 'City news');
  assert.match(out, /bicycle lane network/);
  assert.match(out, /12 kilometres/);
  assert.ok(!/cookie/i.test(out.split('_The AI model')[0]));
  assert.ok(!out.includes('Short line'));
  assert.match(out, /could not be reached/);
  assert.ok(!/implication|recommend|should/i.test(out.split('_The AI model')[0]));
});

test('the fallback in bullets mode gives at most 3 bullets', () => {
  const many = Array.from({ length: 12 }, (_, i) => `Sentence number ${i} says something specific about topic ${i} in this page.`).join(' ');
  const bullets = extractiveSummary(many, 'T', 'bullets').split('\n').filter((l) => l.startsWith('- '));
  assert.equal(bullets.length, 3);
});

test('the fallback in tables mode never invents a table', () => {
  assert.match(extractiveSummary(PAGE, 'T', 'tables'), new RegExp(NO_TABLES_MESSAGE.replace('.', '\\.')));
});

test('a page with no readable text says so instead of inventing a summary', () => {
  assert.match(extractiveSummary('Home | About | Contact', 'Menu page'), /Not enough readable text/);
});
