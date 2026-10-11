// Run: node --test tests/citations-resolvers.test.mjs
// No network: a fake fetcher returns recorded responses and a fake clock
// records sleeps, so rate limits and backoff are checked without waiting.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createResolver, LookupBudget, createRateLimiter } from '../src/lib/citations/lookup.ts';
import { mapPubmedSummary, detectRetraction } from '../src/lib/citations/pubmed.ts';
import { mapDataCiteDoi } from '../src/lib/citations/datacite.ts';

const fixture = (name) => readFileSync(fileURLToPath(new URL(`../src/lib/citations/fixtures/${name}`, import.meta.url)), 'utf8');
const json = (name) => JSON.parse(fixture(name));

const respond = (status, body = '', headers = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

function fakeClock() {
  const clock = {
    time: 0,
    sleeps: [],
    now() {
      return clock.time;
    },
    async sleep(ms) {
      clock.sleeps.push(ms);
      clock.time += ms;
    },
  };
  return clock;
}

// Routes each URL to a canned response; records every call.
function routedFetcher(routes) {
  const calls = [];
  const fetcher = async (url) => {
    calls.push(url);
    for (const [pattern, handler] of routes) {
      if (url.includes(pattern)) return typeof handler === 'function' ? handler(url) : handler;
    }
    return respond(404, '');
  };
  return { fetcher, calls };
}

test('DOI resolves through Crossref and sends the mailto', async () => {
  const { fetcher, calls } = routedFetcher([['api.crossref.org', respond(200, json('crossref-nature12373.json'))]]);
  const resolver = createResolver({ fetcher, clock: fakeClock(), crossrefMailto: 'dev@example.com' });
  const out = await resolver.resolveIdentifiers({ doi: '10.1038/nature12373' });
  assert.equal(out.record.resolvedFrom, 'crossref');
  assert.equal(out.record.status, 'verified_doi');
  assert.equal(calls.length, 1);
  assert.match(calls[0], /mailto=dev%40example\.com/);
});

test('a Crossref 404 falls through to the DOI agency, then DataCite', async () => {
  const { fetcher, calls } = routedFetcher([
    ['api.crossref.org', respond(404, '')],
    ['doi.org/doiRA/', respond(200, [{ DOI: '10.5281/zenodo.23304857', RA: 'DataCite' }])],
    ['api.datacite.org', respond(200, json('datacite-zenodo-23304857.json'))],
  ]);
  const resolver = createResolver({ fetcher, clock: fakeClock() });
  const out = await resolver.resolveIdentifiers({ doi: '10.5281/zenodo.23304857' });
  assert.equal(out.record.resolvedFrom, 'datacite');
  assert.equal(out.record.sourceType, 'report');
  assert.equal(out.record.year, 2026);
  assert.equal(calls.length, 3);
});

test('a DOI registered elsewhere is not_found after Crossref and the agency', async () => {
  const { fetcher } = routedFetcher([
    ['api.crossref.org', respond(404, '')],
    ['doi.org/doiRA/', respond(200, [{ DOI: '10.1000/x', RA: 'mEDRA' }])],
  ]);
  const out = await createResolver({ fetcher, clock: fakeClock() }).resolveIdentifiers({ doi: '10.1000/x' });
  assert.deepEqual(out, { record: null, reason: 'not_found' });
});

test('429 is retried with backoff, then succeeds', async () => {
  let attempts = 0;
  const { fetcher } = routedFetcher([
    [
      'api.crossref.org',
      () => {
        attempts += 1;
        return attempts === 1 ? respond(429, '') : respond(200, json('crossref-nature12373.json'));
      },
    ],
  ]);
  const clock = fakeClock();
  const out = await createResolver({ fetcher, clock }).resolveIdentifiers({ doi: '10.1038/nature12373' });
  assert.equal(out.record.resolvedFrom, 'crossref');
  assert.equal(attempts, 2);
  assert.ok(clock.sleeps.includes(1000), 'waited the first backoff step');
});

test('retries stop after two, then the lookup is unreachable', async () => {
  let attempts = 0;
  const { fetcher } = routedFetcher([
    [
      'api.crossref.org',
      () => {
        attempts += 1;
        return respond(503, '');
      },
    ],
  ]);
  const out = await createResolver({ fetcher, clock: fakeClock() }).resolveIdentifiers({ doi: '10.1038/nature12373' });
  assert.equal(attempts, 3); // first try plus two retries
  assert.deepEqual(out, { record: null, reason: 'unreachable' });
});

test('a network error is unreachable, not a crash', async () => {
  const fetcher = async () => {
    throw new Error('ECONNRESET');
  };
  const out = await createResolver({ fetcher, clock: fakeClock() }).resolveIdentifiers({ doi: '10.1038/nature12373' });
  assert.deepEqual(out, { record: null, reason: 'unreachable' });
});

test('the per-request budget stops lookups and reports budget_exhausted', async () => {
  const { fetcher, calls } = routedFetcher([['api.crossref.org', respond(404, '')]]);
  const out = await createResolver({ fetcher, clock: fakeClock() }).resolveIdentifiers(
    { doi: '10.1000/x' },
    new LookupBudget(1),
  );
  assert.equal(out.reason, 'budget_exhausted');
  assert.equal(calls.length, 1); // the agency lookup never ran
});

test('a PMID resolves through esummary and efetch with a retraction check', async () => {
  const { fetcher, calls } = routedFetcher([
    ['esummary.fcgi', respond(200, json('pubmed-esummary-23903748.json'))],
    ['efetch.fcgi', respond(200, fixture('pubmed-efetch-23903748.xml'))],
  ]);
  const out = await createResolver({ fetcher, clock: fakeClock(), ncbi: { tool: 'researchie', email: 'dev@example.com' } })
    .resolveIdentifiers({ pmid: '23903748' });
  assert.equal(out.record.resolvedFrom, 'pubmed');
  assert.equal(out.record.status, 'verified_pmid');
  assert.equal(out.record.retracted, false);
  assert.equal(out.record.doi, '10.1038/nature12373');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /rettype=abstract/);
});

test('a failed efetch leaves the retraction check open and marks the record incomplete', async () => {
  const { fetcher } = routedFetcher([
    ['esummary.fcgi', respond(200, json('pubmed-esummary-23903748.json'))],
    ['efetch.fcgi', respond(500, '')],
  ]);
  const out = await createResolver({ fetcher, clock: fakeClock() }).resolveIdentifiers({ pmid: '23903748' });
  assert.equal(out.record.retracted, undefined);
  assert.equal(out.record.status, 'incomplete');
  assert.ok(out.record.missingFields.includes('retraction check'));
});

test('PubMed author names split into family and initials', () => {
  const record = mapPubmedSummary(json('pubmed-esummary-23903748.json'), '23903748');
  assert.deepEqual(record.authors[0], { family: 'Kucsko', given: 'G' });
  assert.equal(record.title, 'Nanometre-scale thermometry in a living cell'); // trailing full stop removed
  assert.equal(record.year, 2013);
  assert.equal(record.pages, '54-8'); // PubMed abbreviates the page range; kept as given
});

test('detectRetraction recognises the retraction publication-type IDs (synthetic XML)', () => {
  const retracted = '<PublicationTypeList><PublicationType UI="D016441">Retracted Publication</PublicationType></PublicationTypeList>';
  assert.equal(detectRetraction(retracted), true);
  assert.equal(detectRetraction('<PublicationType UI="D016440">Retraction of Publication</PublicationType>'), true);
  assert.equal(detectRetraction(fixture('pubmed-efetch-23903748.xml')), false);
});

test('mapDataCiteDoi returns null for a body without attributes', () => {
  assert.equal(mapDataCiteDoi({}), null);
});

test('the rate limiter spaces calls at least the interval apart', async () => {
  const clock = fakeClock();
  const limit = createRateLimiter(100, clock);
  await limit();
  await limit();
  await limit();
  assert.equal(clock.time, 200);
});

test('title search returns candidates that have a DOI and drops the rest', async () => {
  const body = {
    message: {
      items: [
        { DOI: '10.1101/2025.11.24.690121', type: 'posted-content', title: ['Different stabilizing mechanisms'], author: [{ family: 'Geng', given: 'Y.' }], issued: { 'date-parts': [[2025]] } },
        { title: ['No DOI here'], author: [{ family: 'Nobody' }] },
        { DOI: '10.1371/journal.pone.0355849', type: 'journal-article', title: ['Different stabilizing mechanisms'], author: [{ family: 'Geng', given: 'Y.' }], 'container-title': ['PLOS One'], issued: { 'date-parts': [[2026]] } },
      ],
    },
  };
  const { fetcher, calls } = routedFetcher([['api.crossref.org/works?query.bibliographic', respond(200, body)]]);
  const out = await createResolver({ fetcher, clock: fakeClock(), crossrefMailto: 'dev@example.com' })
    .searchTitle('Different stabilizing mechanisms standing walking', new LookupBudget());
  assert.deepEqual(out.candidates.map((c) => c.doi), ['10.1101/2025.11.24.690121', '10.1371/journal.pone.0355849']);
  assert.equal(out.candidates[0].sourceType, 'preprint');
  assert.equal(out.candidates[1].sourceType, 'journal_article');
  assert.match(calls[0], /query\.bibliographic=Different%20stabilizing/);
  assert.equal(out.reason, undefined);
});

test('title search with no matches reports not_found', async () => {
  const { fetcher } = routedFetcher([['api.crossref.org/works?query.bibliographic', respond(200, { message: { items: [] } })]]);
  const out = await createResolver({ fetcher, clock: fakeClock() }).searchTitle('zzzz nothing matches this', new LookupBudget());
  assert.deepEqual(out, { candidates: [], reason: 'not_found' });
});
