// Run: node --test --no-warnings tests/citations-status.test.mjs
// Retraction / correction / concern status (Pillar A, part 1). No network: fixtures are real
// Crossref and PubMed records saved on 2026-10-17 (see src/lib/citations/status.ts for the ids).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createResolver } from '../src/lib/citations/lookup.ts';
import { classifyCrossrefNotices, classifyPubmedXml, mergeFindings } from '../src/lib/citations/status.ts';

const fixture = (name) => readFileSync(fileURLToPath(new URL(`../src/lib/citations/fixtures/${name}`, import.meta.url)), 'utf8');
const updatedBy = (name) => JSON.parse(fixture(name)).message['updated-by'];

const respond = (status, body = '') => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: () => null },
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

const clockAt = (ms) => ({ now: () => ms, sleep: async () => {} });

function routedFetcher(routes) {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    for (const [pattern, response] of routes) if (url.includes(pattern)) return response;
    return respond(404, '');
  };
  return { fetcher, calls };
}

// ---- Crossref ----

test('Crossref: a paper with a retraction and a correction is retracted (worst wins)', () => {
  const out = classifyCrossrefNotices(updatedBy('status-crossref-retracted.json'));
  assert.equal(out.state, 'retracted');
  assert.equal(out.noticeDoi, '10.1016/s0140-6736(10)60175-4');
  assert.match(out.detail, /retracted/);
});

test('Crossref: an expression of concern is reported as concern', () => {
  const out = classifyCrossrefNotices(updatedBy('status-crossref-eoc.json'));
  assert.equal(out.state, 'concern');
  assert.equal(out.noticeDoi, '10.1016/j.lungcan.2026.109332');
  assert.match(out.detail, /2026-02-13/);
});

test('Crossref: a correction is reported as corrected', () => {
  const out = classifyCrossrefNotices(updatedBy('status-crossref-correction.json'));
  assert.equal(out.state, 'corrected');
  assert.match(out.detail, /correction/);
});

test('Crossref: no updated-by means clean, and other update types do not count', () => {
  assert.equal(classifyCrossrefNotices(undefined).state, 'clean');
  assert.equal(classifyCrossrefNotices([]).state, 'clean');
  assert.equal(classifyCrossrefNotices([{ DOI: '10.1/x', type: 'new_version' }]).state, 'clean');
});

test('Crossref: withdrawal is retracted and partial retraction is concern', () => {
  assert.equal(classifyCrossrefNotices([{ type: 'withdrawal' }]).state, 'retracted');
  assert.equal(classifyCrossrefNotices([{ type: 'partial_retraction' }]).state, 'concern');
});

// ---- PubMed ----

test('PubMed: the retracted 1998 Lancet record is retracted', () => {
  assert.equal(classifyPubmedXml(fixture('status-pubmed-retracted.xml')).state, 'retracted');
});

test('PubMed: an original with ExpressionOfConcernIn is concern', () => {
  assert.equal(classifyPubmedXml(fixture('status-pubmed-eoc.xml')).state, 'concern');
});

test('PubMed: an original with ErratumIn is corrected', () => {
  assert.equal(classifyPubmedXml(fixture('status-pubmed-erratum.xml')).state, 'corrected');
});

test('PubMed: a clean record is clean', () => {
  assert.equal(classifyPubmedXml(fixture('pubmed-efetch-23903748.xml')).state, 'clean');
});

test('PubMed: the expression-of-concern NOTICE itself is not flagged as a problem', () => {
  const notice =
    '<PublicationTypeList><PublicationType UI="D000075742">Expression of Concern</PublicationType></PublicationTypeList>' +
    '<CommentsCorrections RefType="ExpressionOfConcernFor"><PMID Version="1">31230489</PMID></CommentsCorrections>';
  assert.equal(classifyPubmedXml(notice).state, 'clean');
});

// ---- merging ----

test('mergeFindings: a problem from one source beats clean from another', () => {
  const out = mergeFindings([{ state: 'clean' }, { state: 'corrected', detail: 'x' }]);
  assert.equal(out.state, 'corrected');
});

test('mergeFindings: unknown never overrides an answer, and nothing answered is unknown', () => {
  assert.equal(mergeFindings([{ state: 'unknown' }, { state: 'clean' }]).state, 'clean');
  assert.equal(mergeFindings([{ state: 'clean' }, { state: 'unknown' }]).state, 'clean');
  assert.equal(mergeFindings([]).state, 'unknown');
});

// ---- resolver.checkStatus ----

test('checkStatus: DOI and PMID are both asked and the worst answer wins', async () => {
  const { fetcher, calls } = routedFetcher([
    ['api.crossref.org', respond(200, fixture('status-crossref-correction.json'))],
    ['efetch.fcgi', respond(200, fixture('status-pubmed-retracted.xml'))],
  ]);
  const resolver = createResolver({ fetcher, clock: clockAt(Date.UTC(2026, 9, 17)) });
  const out = await resolver.checkStatus({ doi: '10.1088/1361-6595/aaebdb', pmid: '9500320' });
  assert.equal(out.state, 'retracted');
  assert.equal(out.checkedAt, '2026-10-17T00:00:00.000Z');
  assert.equal(calls.length, 2);
});

test('checkStatus: when every lookup fails the state is unknown, never clean', async () => {
  const { fetcher } = routedFetcher([
    ['api.crossref.org', respond(500, '')],
    ['efetch.fcgi', respond(500, '')],
  ]);
  const resolver = createResolver({ fetcher, clock: clockAt(0) });
  const out = await resolver.checkStatus({ doi: '10.1/x', pmid: '1' });
  assert.equal(out.state, 'unknown');
});

test('checkStatus: a network error is unknown, and an unreachable source does not hide the other', async () => {
  const fetcher = async (url) => {
    if (url.includes('crossref')) throw new Error('offline');
    return respond(200, fixture('pubmed-efetch-23903748.xml'));
  };
  const resolver = createResolver({ fetcher, clock: clockAt(0) });
  assert.equal((await resolver.checkStatus({ doi: '10.1/x' })).state, 'unknown');
  assert.equal((await resolver.checkStatus({ doi: '10.1/x', pmid: '23903748' })).state, 'clean');
});

test('checkStatus: no identifiers means unknown and no requests', async () => {
  const { fetcher, calls } = routedFetcher([]);
  const resolver = createResolver({ fetcher, clock: clockAt(0) });
  assert.equal((await resolver.checkStatus({})).state, 'unknown');
  assert.equal(calls.length, 0);
});
