// Run: node --test --no-warnings tests/claim-support.test.mjs
// Claim support: an answer quote must appear in the document it cites. Pure: no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkQuoteAgainstPages, normalizeForMatch } from '../src/lib/ai/claimSupport.ts';

const pages = [
  { pageNumber: 1, content: 'OpenAI Dots is driven by GPT-6 Astra, running inside an isolated cloud sandbox.' },
  {
    pageNumber: 2,
    content: '2. Application Connectors & Ecosystem:\nNative integrations via OAuth 2.1 protocols, including Google Workspace, Slack, Notion.\n\nChatGPT Pro costs $200 per month.',
  },
];

test('normalizeForMatch lowercases and drops punctuation but keeps letters in any script', () => {
  assert.equal(normalizeForMatch('  OAuth 2.1, “Slack”!  '), 'oauth 2 1 slack');
  assert.equal(normalizeForMatch('Café—naïve'), 'café naïve');
  assert.equal(normalizeForMatch(''), '');
});

test('a verbatim quote is supported and reports its page', () => {
  const r = checkQuoteAgainstPages('integrations via OAuth 2.1 protocols', pages);
  assert.deepEqual(r, { supported: true, pageNumber: 2 });
});

test('matching ignores case, punctuation and line breaks', () => {
  const r = checkQuoteAgainstPages('chatgpt pro COSTS $200 per month', pages);
  assert.equal(r.supported, true);
  assert.equal(r.pageNumber, 2);
});

test('a quote with a small wording change is supported by token overlap', () => {
  // 'through' is not in the page; 9 of 10 quote tokens are (0.9 >= 0.8)
  const r = checkQuoteAgainstPages('native integrations through OAuth 2.1 protocols, including Google Workspace', pages);
  assert.equal(r.supported, true);
  assert.equal(r.pageNumber, 2);
});

test('a quote that is not in the document is unsupported', () => {
  const r = checkQuoteAgainstPages('The stock trades at 300 dollars per share on NASDAQ', pages);
  assert.equal(r.supported, false);
});

test('an empty quote is unsupported', () => {
  assert.equal(checkQuoteAgainstPages('', pages).supported, false);
  assert.equal(checkQuoteAgainstPages('   ', pages).supported, false);
  assert.equal(checkQuoteAgainstPages(undefined, pages).supported, false);
});

test('a short quote must match word-for-word, not by loose overlap', () => {
  // 'Slack pricing tiers' shares only 'slack' with the page; short quotes do not get overlap credit
  const r = checkQuoteAgainstPages('Slack pricing tiers', pages);
  assert.equal(r.supported, false);
  // ...but a short verbatim phrase still matches
  assert.equal(checkQuoteAgainstPages('Google Workspace', pages).supported, true);
});

test('a word-for-word match must respect word boundaries', () => {
  // 'Dot' is inside 'Dots' on page 1, but it is not a whole-word match
  const r = checkQuoteAgainstPages('Dot is driven', pages);
  assert.equal(r.supported, false);
});

test('no pages means nothing is supported', () => {
  assert.equal(checkQuoteAgainstPages('OAuth 2.1 protocols', []).supported, false);
});

test('a quote whose word is split across a PDF line break is still supported', () => {
  const pages = [{ pageNumber: 3, content: 'Fifteen healthy young participants (21 ± 4 yrs) participated in the experi-\nment. The experimental procedure' }];
  const out = checkQuoteAgainstPages('Fifteen healthy young participants (21 ± 4 yrs) participated in the experiment.', pages);
  assert.equal(out.supported, true);
  assert.equal(out.pageNumber, 3);
});
