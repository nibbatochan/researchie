// Run: node --test --no-warnings tests/paste-match.test.mjs
// Matching pasted text against PDFs. Only word-for-word text becomes a Quote; no AI, no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPaste, splitSentences, matchPaste, quoteClips, textClip, MIN_MATCH_WORDS } from '../src/lib/paper/pasteMatch.ts';

const citation = { status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [], title: 'Sleep paper', year: 2020, authors: [{ family: 'Lee' }] };
const docs = [
  { id: 'd1', title: 'Sleep paper', filename: 'sleep.pdf', totalPages: 9, citation, pages: [
    { pageNumber: 1, content: 'Abstract. We studied sleep in adults.' },
    { pageNumber: 4, content: 'Participants who slept eight hours recalled 23% more words than those who slept five hours.\nThe effect was stable across ages.' },
  ] },
  { id: 'd2', title: 'Other paper', pages: [{ pageNumber: 2, content: 'Attention drifts after long periods of focused work without any break.' }] },
];

test('cleanPaste removes citation markers and tidies spacing', () => {
  assert.equal(cleanPaste('Sleep helps memory [1]. It also helps focus [2, 3] .'), 'Sleep helps memory. It also helps focus.');
  assert.equal(cleanPaste('Range [4-6] and sup² text'), 'Range and sup text');
  assert.equal(cleanPaste('   '), '');
});

test('splitSentences splits at sentence ends and line breaks, not inside numbers', () => {
  assert.deepEqual(splitSentences('First one. Second one? Third 3.5 stays.\nFourth'), ['First one.', 'Second one?', 'Third 3.5 stays.', 'Fourth']);
});

test('a pasted passage that is word for word in a PDF is one Quote hit with the PDF wording and page', () => {
  const r = matchPaste('participants who slept eight hours recalled 23% more words than those who slept five hours [1]', docs);
  assert.equal(r.wholeBlock, true);
  assert.equal(r.foundCount, 1);
  assert.equal(r.sentences[0].hit.pageNumber, 4);
  assert.equal(r.sentences[0].hit.docId, 'd1');
  // the stored text is the PDF's own capitalisation and punctuation, not the pasted version
  assert.equal(r.sentences[0].hit.text, 'Participants who slept eight hours recalled 23% more words than those who slept five hours.');
});

test('a paste is matched sentence by sentence when the whole is not in one place; the right PDF is named', () => {
  const r = matchPaste('Participants who slept eight hours recalled 23% more words than those who slept five hours. Attention drifts after long periods of focused work without any break. A made up claim that no paper contains at all.', docs);
  assert.equal(r.wholeBlock, false);
  assert.equal(r.foundCount, 2);
  assert.deepEqual(r.sentences.map((s) => s.hit?.docId), ['d1', 'd2', undefined]);
  assert.equal(r.sentences[2].hit, undefined);
});

test('a sentence that is only similar gets a hint, never a hit', () => {
  const r = matchPaste('Participants who slept eight hours remembered 23% more words than those who slept five hours.', docs);
  assert.equal(r.foundCount, 0);
  assert.equal(r.sentences[0].hit, undefined);
  assert.equal(r.sentences[0].similar.pageNumber, 4);
});

test('a short sentence is never counted as found, even when its words are on a page', () => {
  assert.ok(MIN_MATCH_WORDS >= 4);
  const r = matchPaste('Participants who slept.', docs);
  assert.equal(r.foundCount, 0);
  assert.equal(r.sentences[0].similar, undefined);
});

test('nothing pasted, or no PDFs, finds nothing', () => {
  assert.deepEqual(matchPaste('', docs), { cleaned: '', wholeBlock: false, sentences: [], foundCount: 0 });
  assert.equal(matchPaste('Participants who slept eight hours recalled 23% more words than those who slept five hours.', []).foundCount, 0);
});

test('quoteClips builds one Quote per found sentence with page, document and citation, and skips the rest', () => {
  const r = matchPaste('Participants who slept eight hours recalled 23% more words than those who slept five hours. A made up claim that no paper contains at all.', docs);
  const clips = quoteClips(r, 'proj', docs);
  assert.equal(clips.length, 1);
  assert.equal(clips[0].type, 'quote');
  assert.equal(clips[0].metadata.pageNumber, 4);
  assert.equal(clips[0].metadata.documentId, 'd1');
  assert.equal(clips[0].metadata.evidenceKind, 'quote');
  assert.deepEqual(clips[0].metadata.citation, citation);
  assert.match(clips[0].title, /— p\. 4$/);
});

test('textClip marks the paste as an AI summary or as the researcher own text, and never as a quote', () => {
  const ai = textClip('A summary.', 'ai-summary', 'notebooklm', 'proj');
  assert.equal(ai.metadata.evidenceKind, 'ai-summary');
  assert.equal(ai.type, 'text');
  assert.match(ai.content.description, /Not the paper's own words/);
  assert.equal(ai.metadata.sourceUrl, 'https://notebooklm.google.com/');
  const mine = textClip('My note.', 'mine', 'other', 'proj');
  assert.equal(mine.metadata.evidenceKind, 'mine');
  assert.equal(mine.type, 'note');
  assert.equal(mine.metadata.citation, undefined);
});
