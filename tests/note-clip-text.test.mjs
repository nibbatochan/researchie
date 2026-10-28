import test from 'node:test';
import assert from 'node:assert/strict';
import { clipTextOf, recordOf } from '../src/lib/paper/clipInfo.ts';

// A Research AI note is shown by its written text, not its title; its reference list is cut from the text.
test('a note shows its written text without the reference list', () => {
  const note = {
    type: 'note',
    title: 'Paraphrased answer',
    content: { markdownContent: '**Gait** slows with age.\n\n### References\n- [1] Lee. Gait. 2020' },
  };
  assert.equal(clipTextOf(note), 'Gait slows with age.');
});

test('a clip with no note text falls back to its own text, then its title', () => {
  assert.equal(clipTextOf({ type: 'quote', title: 'T', content: { text: 'Quoted words' } }), 'Quoted words');
  assert.equal(clipTextOf({ type: 'note', title: 'Only a title', content: {} }), 'Only a title');
});

test('a note keeps its paragraphs', () => {
  const note = { type: 'note', title: 'T', content: { markdownContent: 'First para.\n\nSecond para.' } };
  assert.equal(clipTextOf(note), 'First para.\n\nSecond para.');
});

test('a clip with a web address and no citation is cited as a web page; a placeholder address is not', () => {
  const web = recordOf({ id: 'a', type: 'quote', title: 'Gait study', metadata: { sourceUrl: 'https://x.org/gait', pageTitle: 'Gait page' }, content: {} });
  assert.equal(web.sourceType, 'web_page');
  assert.equal(web.url, 'https://x.org/gait');
  assert.equal(web.title, 'Gait page');
  assert.equal(recordOf({ id: 'b', type: 'note', title: 'N', metadata: { sourceUrl: 'https://example.com' }, content: {} }), undefined);
});
