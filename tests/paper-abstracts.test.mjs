// Run: node --test --no-warnings tests/paper-abstracts.test.mjs
// OpenAlex paper search for better answers. No network: the fixture is a real OpenAlex search response saved on
// 2026-10-28 (src/lib/research/fixtures/openalex-search.json).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { abstractFromInvertedIndex, parseOpenAlexSearch, searchPapers, searchPapersResult, checkOpenAlexKey, MAX_ABSTRACT_CHARS } from '../src/lib/research/openalex.ts';

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/lib/research/fixtures/openalex-search.json', import.meta.url)), 'utf8')
);

test('abstract is rebuilt from the inverted index in word order', () => {
  const index = { world: [1], hello: [0], again: [2, 3], once: [4] };
  assert.equal(abstractFromInvertedIndex(index), 'hello world again again once');
});

test('missing or malformed index gives an empty abstract', () => {
  assert.equal(abstractFromInvertedIndex(null), '');
  assert.equal(abstractFromInvertedIndex({ bad: 'x', neg: [-1], huge: [999999] }), '');
});

test('works without an abstract are dropped from the hits', () => {
  const hits = parseOpenAlexSearch(fixture, 10);
  assert.equal(hits.length, 2);
  assert.ok(hits.every((h) => h.abstract.length > 0));
  assert.ok(!hits.some((h) => h.title === 'Retrieval-Augmented Generation'));
});

test('hits keep title, year, DOI and a link', () => {
  const hit = parseOpenAlexSearch(fixture, 10)[0];
  assert.equal(hit.title, 'On Faithful Citations in Retrieval Augmented Generation');
  assert.equal(hit.year, 2026);
  assert.equal(hit.url, hit.doi ?? hit.id);
  assert.match(hit.abstract, /^Retrieval-augment generation/);
});

test('retracted works are never passed to the model', () => {
  const json = { results: [{ id: 'https://openalex.org/W1', title: 'Gone', is_retracted: true, abstract_inverted_index: { a: [0] } }] };
  assert.deepEqual(parseOpenAlexSearch(json, 5), []);
});

test('limit caps the number of hits', () => {
  assert.equal(parseOpenAlexSearch(fixture, 1).length, 1);
});

test('searchPapers sends the query and key, and returns hits', async () => {
  let requested = '';
  const fetchImpl = async (url) => {
    requested = String(url);
    return new Response(JSON.stringify(fixture), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const hits = await searchPapers('clinical RAG attribution', { apiKey: 'test-key', limit: 5, fetchImpl });
  assert.equal(hits.length, 2);
  const url = new URL(requested);
  assert.equal(url.hostname, 'api.openalex.org');
  assert.equal(url.searchParams.get('search'), 'clinical RAG attribution');
  assert.equal(url.searchParams.get('api_key'), 'test-key');
});

test('searchPapers returns nothing on an HTTP error, so the answer falls back to clips', async () => {
  const fetchImpl = async () => new Response('busy', { status: 429 });
  assert.deepEqual(await searchPapers('anything', { fetchImpl }), []);
});

test('searchPapers returns nothing on a network failure', async () => {
  const fetchImpl = async () => {
    throw new Error('offline');
  };
  assert.deepEqual(await searchPapers('anything', { fetchImpl }), []);
});

test('searchPapersResult reports a rejected key as invalid_key', async () => {
  const r = await searchPapersResult('x', { apiKey: 'bad', fetchImpl: async () => new Response('no', { status: 401 }) });
  assert.deepEqual(r, { hits: [], status: 'invalid_key' });
});

test('searchPapersResult reports an exhausted daily allowance as rate_limited', async () => {
  const r = await searchPapersResult('x', { fetchImpl: async () => new Response('busy', { status: 429 }) });
  assert.deepEqual(r, { hits: [], status: 'rate_limited' });
});

test('searchPapersResult reports a server error as unreachable', async () => {
  const r = await searchPapersResult('x', { fetchImpl: async () => new Response('down', { status: 503 }) });
  assert.deepEqual(r, { hits: [], status: 'unreachable' });
});

test('searchPapersResult reports no usable abstracts as empty', async () => {
  const r = await searchPapersResult('x', { fetchImpl: async () => new Response(JSON.stringify({ results: [] }), { status: 200 }) });
  assert.deepEqual(r, { hits: [], status: 'empty' });
});

test('searchPapersResult reports ok with hits', async () => {
  const r = await searchPapersResult('x', { fetchImpl: async () => new Response(JSON.stringify(fixture), { status: 200 }) });
  assert.equal(r.status, 'ok');
  assert.equal(r.hits.length, 2);
});

test('empty query makes no call and reports empty', async () => {
  let called = false;
  const r = await searchPapersResult('   ', { fetchImpl: async () => { called = true; return new Response('{}'); } });
  assert.equal(called, false);
  assert.deepEqual(r, { hits: [], status: 'empty' });
});

test('long abstracts are cut to the per-paper cap', () => {
  const words = Array.from({ length: 800 }, (_, i) => `w${i}`);
  const index = {};
  words.forEach((w, i) => (index[w] = [i]));
  const hit = parseOpenAlexSearch({ results: [{ id: 'https://openalex.org/W9', title: 'Long', abstract_inverted_index: index }] }, 1)[0];
  assert.ok(hit.abstract.length <= MAX_ABSTRACT_CHARS + 1);
  assert.ok(hit.abstract.endsWith('…'));
});

test('checkOpenAlexKey: accepted, rejected, and unreachable', async () => {
  assert.equal(await checkOpenAlexKey('k', async () => new Response('{}', { status: 200 })), 'valid');
  assert.equal(await checkOpenAlexKey('k', async () => new Response('{}', { status: 429 })), 'valid');
  assert.equal(await checkOpenAlexKey('k', async () => new Response('no', { status: 403 })), 'invalid');
  assert.equal(await checkOpenAlexKey('k', async () => { throw new Error('offline'); }), 'unreachable');
});
