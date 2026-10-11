// Identifier lookup chain (Decision 7; plan: "Limits on looping and lookups").
// DOI: Crossref, then the DOI agency decides the registrar, then DataCite.
// PMID: PubMed esummary, then efetch for the retraction check.
// Every HTTP lookup takes one unit from a per-request budget (cap 10).
// Retries: at most two, with backoff, on 429 and 503.

import type { CitationRecord } from './types.ts';
import { parseCrossrefResponse } from './crossref.ts';
import { mapDataCiteDoi } from './datacite.ts';
import { detectRetraction, mapPubmedSummary } from './pubmed.ts';

export interface HttpResponse {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type Fetcher = (url: string, init?: { headers?: Record<string, string> }) => Promise<HttpResponse>;

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export const LOOKUP_CAP = 10;
export const MAX_RETRIES = 2;

export interface ResolverConfig {
  fetcher: Fetcher;
  clock?: Clock;
  crossrefMailto?: string;
  ncbi?: { tool: string; email: string; apiKey?: string };
}

export interface Resolution {
  record: CitationRecord | null;
  reason?: 'budget_exhausted' | 'unreachable' | 'not_found';
}

export class LookupBudget {
  used = 0;
  readonly cap: number;

  constructor(cap: number = LOOKUP_CAP) {
    this.cap = cap;
  }

  take(): boolean {
    if (this.used >= this.cap) return false;
    this.used += 1;
    return true;
  }
}

// Spaces lookups at least minIntervalMs apart. Calls queue in order.
export function createRateLimiter(minIntervalMs: number, clock: Clock = realClock): () => Promise<void> {
  let chain: Promise<void> = Promise.resolve();
  let last = Number.NEGATIVE_INFINITY;
  return () => {
    const turn = chain.then(async () => {
      const wait = last + minIntervalMs - clock.now();
      if (wait > 0) await clock.sleep(wait);
      last = clock.now();
    });
    chain = turn.catch(() => undefined);
    return turn;
  };
}

// DOI slashes stay as path separators; other characters are encoded.
function doiPath(doi: string): string {
  return doi.split('/').map(encodeURIComponent).join('/');
}

function backoffMs(res: HttpResponse, attempt: number): number {
  const retryAfter = Number(res.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return 2 ** attempt * 1000;
}

async function get(
  url: string,
  headers: Record<string, string>,
  config: ResolverConfig,
  limiter: () => Promise<void>,
  clock: Clock,
): Promise<HttpResponse | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await limiter();
    let res: HttpResponse;
    try {
      res = await config.fetcher(url, { headers });
    } catch {
      return null; // network failure: unreachable
    }
    if (res.status === 429 || res.status === 503) {
      if (attempt === MAX_RETRIES) return null;
      await clock.sleep(backoffMs(res, attempt));
      continue;
    }
    return res;
  }
  return null;
}

export function createResolver(config: ResolverConfig) {
  const clock = config.clock ?? realClock;
  const userAgent = config.crossrefMailto
    ? `Researchie/1.0 (mailto:${config.crossrefMailto})`
    : 'Researchie/1.0';

  // Limits from docs/CITATION_API_RESEARCH.md: Crossref polite pool 10/s,
  // public pool 5/s; PubMed 3/s, 10/s with a key; doi.org and DataCite 10/s
  // as a conservative default (no numeric limit found).
  const limiters = {
    crossref: createRateLimiter(config.crossrefMailto ? 100 : 200, clock),
    doi: createRateLimiter(100, clock),
    datacite: createRateLimiter(100, clock),
    pubmed: createRateLimiter(config.ncbi?.apiKey ? 100 : 334, clock),
  };

  async function resolveDoi(doi: string, budget: LookupBudget): Promise<Resolution> {
    const path = doiPath(doi);
    const mailto = config.crossrefMailto ? `?mailto=${encodeURIComponent(config.crossrefMailto)}` : '';

    if (!budget.take()) return { record: null, reason: 'budget_exhausted' };
    const crossref = await get(
      `https://api.crossref.org/works/${path}${mailto}`,
      { 'User-Agent': userAgent },
      config,
      limiters.crossref,
      clock,
    );
    if (!crossref) return { record: null, reason: 'unreachable' };
    if (crossref.ok) return { record: parseCrossrefResponse(await crossref.json()) };
    if (crossref.status !== 404) return { record: null, reason: 'unreachable' };

    if (!budget.take()) return { record: null, reason: 'budget_exhausted' };
    const agency = await get(`https://doi.org/doiRA/${path}`, {}, config, limiters.doi, clock);
    if (!agency) return { record: null, reason: 'unreachable' };
    if (!agency.ok) return { record: null, reason: 'not_found' };
    const owner = await agency.json();
    const registrar = Array.isArray(owner) ? (owner[0] as { RA?: string } | undefined)?.RA : undefined;
    if (registrar !== 'DataCite') return { record: null, reason: 'not_found' };

    if (!budget.take()) return { record: null, reason: 'budget_exhausted' };
    const datacite = await get(
      `https://api.datacite.org/dois/${path}`,
      { 'User-Agent': userAgent },
      config,
      limiters.datacite,
      clock,
    );
    if (!datacite) return { record: null, reason: 'unreachable' };
    if (!datacite.ok) return { record: null, reason: 'not_found' };
    return { record: mapDataCiteDoi(await datacite.json()) };
  }

  async function resolvePmid(pmid: string, budget: LookupBudget): Promise<Resolution> {
    const ncbi = config.ncbi
      ? { tool: config.ncbi.tool, email: config.ncbi.email, ...(config.ncbi.apiKey ? { api_key: config.ncbi.apiKey } : {}) }
      : {};
    const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
    const query = (extra: Record<string, string>) => new URLSearchParams({ db: 'pubmed', id: pmid, ...ncbi, ...extra });

    if (!budget.take()) return { record: null, reason: 'budget_exhausted' };
    const summary = await get(`${base}/esummary.fcgi?${query({ retmode: 'json' })}`, {}, config, limiters.pubmed, clock);
    if (!summary) return { record: null, reason: 'unreachable' };
    if (!summary.ok) return { record: null, reason: 'not_found' };
    const record = mapPubmedSummary(await summary.json(), pmid);
    if (!record) return { record: null, reason: 'not_found' };

    // Retraction check. If it cannot run, say so; never assume the paper is clean.
    const markCheckFailed = () => {
      record.retracted = undefined;
      record.missingFields.push('retraction check');
      record.status = 'incomplete';
    };
    if (!budget.take()) {
      markCheckFailed();
      return { record, reason: 'budget_exhausted' };
    }
    const fetched = await get(`${base}/efetch.fcgi?${query({ rettype: 'abstract', retmode: 'xml' })}`, {}, config, limiters.pubmed, clock);
    if (!fetched || !fetched.ok) {
      markCheckFailed();
      return { record };
    }
    record.retracted = detectRetraction(await fetched.text());
    return { record };
  }

  // Tries the DOI first, then the PMID, and stops at the first record found.
  async function resolveIdentifiers(ids: { doi?: string; pmid?: string }, budget = new LookupBudget()): Promise<Resolution> {
    let last: Resolution = { record: null, reason: 'not_found' };
    if (ids.doi) {
      last = await resolveDoi(ids.doi, budget);
      if (last.record) return last;
    }
    if (ids.pmid) {
      last = await resolvePmid(ids.pmid, budget);
      if (last.record) return last;
    }
    return last;
  }

  return { resolveIdentifiers, resolveDoi, resolvePmid };
}
