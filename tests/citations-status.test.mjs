// Run: node --test --no-warnings tests/citations-status.test.mjs
// Retraction / correction / concern status (Pillar A, part 1). No network: fixtures are real
// Crossref and PubMed records saved on 2026-10-17 (see src/lib/citations/status.ts for the ids).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createResolver } from '../src/lib/citations/lookup.ts';
import { classifyCrossrefNotices, classifyCrossrefWork, classifyPubmedXml, classifyOpenAlex, describeNoIssue, mergeFindings } from '../src/lib/citations/status.ts';

const fixture = (name) => readFileSync(fileURLToPath(new URL(`../src/lib/citations/fixtures/${name}`, import.meta.url)), 'utf8');
const updatedBy = (name) => JSON.parse(fixture(name)).message['updated-by'];
const work = (name) => JSON.parse(fixture(name)).message;

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

test('Crossref: no updated-by means none_found, and other update types do not count', () => {
  assert.equal(classifyCrossrefNotices(undefined).state, 'none_found');
  assert.equal(classifyCrossrefNotices([]).state, 'none_found');
  assert.equal(classifyCrossrefNotices([{ DOI: '10.1/x', type: 'new_version' }]).state, 'none_found');
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

test('PubMed: a clean record is none_found', () => {
  assert.equal(classifyPubmedXml(fixture('pubmed-efetch-23903748.xml')).state, 'none_found');
});

test('PubMed: the expression-of-concern NOTICE itself is reported as a notice, not a problem paper', () => {
  const notice =
    '<PublicationTypeList><PublicationType UI="D000075742">Expression of Concern</PublicationType></PublicationTypeList>' +
    '<CommentsCorrections RefType="ExpressionOfConcernFor"><PMID Version="1">31230489</PMID></CommentsCorrections>';
  assert.equal(classifyPubmedXml(notice).state, 'notice');
});

// ---- merging ----

test('mergeFindings: a problem from one source beats clean from another', () => {
  const out = mergeFindings([{ state: 'none_found' }, { state: 'corrected', detail: 'x' }]);
  assert.equal(out.state, 'corrected');
});

test('mergeFindings: unknown never overrides an answer, and nothing answered is unknown', () => {
  assert.equal(mergeFindings([{ state: 'unknown' }, { state: 'none_found' }]).state, 'none_found');
  assert.equal(mergeFindings([{ state: 'none_found' }, { state: 'unknown' }]).state, 'none_found');
  assert.equal(mergeFindings([]).state, 'unknown');
});

// ---- resolver.checkStatus ----

test('checkStatus: DOI and PMID are both asked and the worst answer wins', async () => {
  const { fetcher, calls } = routedFetcher([
    ['api.crossref.org', respond(200, fixture('status-crossref-correction.json'))],
    ['efetch.fcgi', respond(200, fixture('status-pubmed-retracted.xml'))],
    ['api.openalex.org', respond(404, '')],
  ]);
  const resolver = createResolver({ fetcher, clock: clockAt(Date.UTC(2026, 9, 17)) });
  const out = await resolver.checkStatus({ doi: '10.1088/1361-6595/aaebdb', pmid: '9500320' });
  assert.equal(out.state, 'retracted');
  assert.equal(out.checkedAt, '2026-10-17T00:00:00.000Z');
  assert.equal(calls.length, 4); // Crossref, PubMed, OpenAlex by DOI, OpenAlex by PMID
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
    if (url.includes('openalex')) return respond(404, '');
    return respond(200, fixture('pubmed-efetch-23903748.xml'));
  };
  const resolver = createResolver({ fetcher, clock: clockAt(0) });
  assert.equal((await resolver.checkStatus({ doi: '10.1/x' })).state, 'unknown');
  assert.equal((await resolver.checkStatus({ doi: '10.1/x', pmid: '23903748' })).state, 'none_found');
});

test('checkStatus: no identifiers means unknown and no requests', async () => {
  const { fetcher, calls } = routedFetcher([]);
  const resolver = createResolver({ fetcher, clock: clockAt(0) });
  assert.equal((await resolver.checkStatus({})).state, 'unknown');
  assert.equal(calls.length, 0);
});

// ---- step 3: removal, republished, notices, OpenAlex ----

test('Crossref: a removal is reported as removed, and its self-pointing update-to is not a notice', () => {
  const out = classifyCrossrefWork(work('status-crossref-removal.json'));
  assert.equal(out.state, 'removed');
  assert.match(out.detail, /removed/);
});

test('Crossref: a retraction notice (update-to another DOI) is a notice, not a problem paper', () => {
  const out = classifyCrossrefWork(work('status-crossref-notice.json'));
  assert.equal(out.state, 'notice');
  assert.equal(out.noticeDoi, '10.1016/s0140-6736(97)11096-0');
});

test('Crossref: a plain paper with no notices is none_found', () => {
  assert.equal(classifyCrossrefWork(work('crossref-nature12373.json')).state, 'none_found');
});

test('PubMed: retracted and republished is retracted, with a pointer to the newer version', () => {
  const out = classifyPubmedXml(fixture('status-pubmed-republished.xml'));
  assert.equal(out.state, 'retracted');
  assert.equal(out.replaced, true);
  assert.match(out.detail, /newer version/);
});

test('PubMed: the republished version itself is not flagged', () => {
  const out = classifyPubmedXml(fixture('status-pubmed-republished-new-version.xml'));
  assert.equal(out.state, 'none_found');
  assert.match(out.detail, /republished version/);
});

test('PubMed: a retraction notice record is a notice (synthetic XML from the DTD names)', () => {
  const notice = '<PublicationTypeList><PublicationType UI="D016440">Retraction Notice</PublicationType></PublicationTypeList>';
  assert.equal(classifyPubmedXml(notice).state, 'notice');
});

test('PubMed: corrected and republished is corrected and replaced (synthetic XML from the DTD names)', () => {
  const xml = '<CommentsCorrections RefType="CorrectedandRepublishedIn"><PMID Version="1">1</PMID></CommentsCorrections>';
  const out = classifyPubmedXml(xml);
  assert.equal(out.state, 'corrected');
  assert.equal(out.replaced, true);
});

test('OpenAlex: retracted paper, clean paper, and a retraction notice flagged is_retracted', () => {
  const body = (name) => JSON.parse(fixture(name));
  assert.equal(classifyOpenAlex(body('status-openalex-retracted.json')).state, 'retracted');
  assert.equal(classifyOpenAlex(body('status-openalex-clean.json')).state, 'none_found');
  assert.equal(classifyOpenAlex(body('status-openalex-notice.json')).state, 'notice');
});

test('OpenAlex: an unusable body adds no finding', () => {
  assert.equal(classifyOpenAlex(null), null);
  assert.equal(classifyOpenAlex({}), null);
});

test('describeNoIssue names the sources and the date and does not say the paper is fine', () => {
  const line = describeNoIssue(['crossref', 'openalex', 'pubmed'], '2026-10-17T00:00:00.000Z');
  assert.match(line, /Crossref, OpenAlex and PubMed on 2026-10-17/);
  assert.match(line, /does not prove/);
});

test('mergeFindings: lists the sources that answered and carries replaced', () => {
  const out = mergeFindings([
    { state: 'none_found', source: 'crossref' },
    { state: 'retracted', source: 'pubmed', replaced: true },
  ]);
  assert.equal(out.state, 'retracted');
  assert.deepEqual(out.sources.sort(), ['crossref', 'pubmed']);
  assert.equal(out.replaced, true);
});

test('checkStatus: OpenAlex catches a retraction Crossref and PubMed missed, and sends the key', async () => {
  const { fetcher, calls } = routedFetcher([
    ['api.crossref.org', respond(200, { message: { DOI: '10.1/x' } })],
    ['api.openalex.org', respond(200, fixture('status-openalex-retracted.json'))],
  ]);
  const resolver = createResolver({ fetcher, clock: clockAt(0), openalexKey: 'test-key' });
  const out = await resolver.checkStatus({ doi: '10.1/x' });
  assert.equal(out.state, 'retracted');
  assert.deepEqual([...out.sources].sort(), ['crossref', 'openalex']);
  assert.ok(calls.some((u) => u.includes('api.openalex.org') && u.includes('api_key=test-key')));
});

test('checkStatus: all three sources clean gives a none_found line naming them', async () => {
  const { fetcher } = routedFetcher([
    ['api.crossref.org', respond(200, fixture('crossref-nature12373.json'))],
    ['efetch.fcgi', respond(200, fixture('pubmed-efetch-23903748.xml'))],
    ['api.openalex.org', respond(200, fixture('status-openalex-clean.json'))],
  ]);
  const resolver = createResolver({ fetcher, clock: clockAt(Date.UTC(2026, 9, 17)) });
  const out = await resolver.checkStatus({ doi: '10.1038/nature12373', pmid: '23903748' });
  assert.equal(out.state, 'none_found');
  assert.match(out.detail, /Crossref, OpenAlex and PubMed on 2026-10-17/);
});

test('checkStatus: OpenAlex 404 or failure leaves the other answers standing; no key means no api_key param', async () => {
  const { fetcher, calls } = routedFetcher([
    ['api.crossref.org', respond(200, fixture('status-crossref-correction.json'))],
    ['api.openalex.org', respond(404, '')],
  ]);
  const resolver = createResolver({ fetcher, clock: clockAt(0) });
  const out = await resolver.checkStatus({ doi: '10.1088/1361-6595/aaebdb' });
  assert.equal(out.state, 'corrected');
  assert.ok(calls.every((u) => !u.includes('api_key')));
});
