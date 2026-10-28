// OpenAlex paper search, for better answers. It returns titles and abstracts only, never full text, so an answer
// built from these is marked as an abstract-based answer in the UI.
//
// Docs checked 2026-10-28 (live calls): https://api.openalex.org/works?search=… returns `abstract_inverted_index`,
// `is_retracted`, `cited_by_count`, `doi`, `publication_year`. Keyless use shares a $0.10/day budget per network;
// a free key (`api_key` parameter) raises it to $1/day. https://help.openalex.org/how-to-use-the-api/rate-limits-and-authentication

export const OPENALEX_WORKS_URL = 'https://api.openalex.org/works';
// Keeps each paper's abstract short so five of them fit in the model's context.
export const MAX_ABSTRACT_CHARS = 1500;

export interface PaperHit {
  id: string;
  title: string;
  year?: number;
  doi?: string;
  url: string;
  citedBy: number;
  abstract: string;
}

type Fetcher = typeof fetch;

/** Rebuilds plain text from OpenAlex's abstract_inverted_index (word -> list of positions). */
export function abstractFromInvertedIndex(index: unknown): string {
  if (!index || typeof index !== 'object') return '';
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index as Record<string, unknown>)) {
    if (!Array.isArray(positions)) continue;
    for (const p of positions) {
      if (typeof p === 'number' && Number.isInteger(p) && p >= 0 && p < 5000) words[p] = word;
    }
  }
  return words.filter((w) => typeof w === 'string').join(' ').replace(/\s+/g, ' ').trim();
}

/** Keeps the works that have an abstract and are not retracted. Exported for tests. */
export function parseOpenAlexSearch(json: any, limit: number): PaperHit[] {
  const results: any[] = Array.isArray(json?.results) ? json.results : [];
  const hits: PaperHit[] = [];
  for (const w of results) {
    if (hits.length >= limit) break;
    if (w?.is_retracted === true) continue;
    const full = abstractFromInvertedIndex(w?.abstract_inverted_index);
    const abstract = full.length > MAX_ABSTRACT_CHARS ? `${full.slice(0, MAX_ABSTRACT_CHARS).trimEnd()}…` : full;
    if (!abstract || typeof w?.title !== 'string' || typeof w?.id !== 'string') continue;
    hits.push({
      id: w.id,
      title: w.title.trim(),
      year: typeof w.publication_year === 'number' ? w.publication_year : undefined,
      doi: typeof w.doi === 'string' ? w.doi : undefined,
      url: typeof w.doi === 'string' ? w.doi : w.id,
      citedBy: typeof w.cited_by_count === 'number' ? w.cited_by_count : 0,
      abstract,
    });
  }
  return hits;
}

export type OpenAlexStatus = 'ok' | 'empty' | 'invalid_key' | 'rate_limited' | 'unreachable';

export interface PaperSearch {
  hits: PaperHit[];
  status: OpenAlexStatus;
}

/**
 * Searches OpenAlex and says why it returned nothing, so the caller can tell the user what to do.
 * `apiKey` is optional; keep it on the server only. Never throws.
 */
export async function searchPapersResult(
  query: string,
  options: { apiKey?: string; limit?: number; fetchImpl?: Fetcher; timeoutMs?: number } = {}
): Promise<PaperSearch> {
  const q = query.trim();
  if (!q) return { hits: [], status: 'empty' };
  const limit = options.limit ?? 5;
  const params = new URLSearchParams({
    search: q,
    'per-page': String(Math.min(limit * 3, 25)), // extra results, because some have no abstract or are retracted
    select: 'id,doi,title,publication_year,cited_by_count,abstract_inverted_index,is_retracted',
  });
  if (options.apiKey) params.set('api_key', options.apiKey);
  try {
    const res = await (options.fetchImpl ?? fetch)(`${OPENALEX_WORKS_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(options.timeoutMs ?? 15000),
    });
    if (res.status === 401 || res.status === 403) return { hits: [], status: 'invalid_key' };
    if (res.status === 429) return { hits: [], status: 'rate_limited' };
    if (!res.ok) return { hits: [], status: 'unreachable' };
    const hits = parseOpenAlexSearch(await res.json(), limit);
    return { hits, status: hits.length > 0 ? 'ok' : 'empty' };
  } catch {
    return { hits: [], status: 'unreachable' };
  }
}

/** Hits only. Returns [] on any failure. Kept for callers that do not need the reason. */
export async function searchPapers(query: string, options: Parameters<typeof searchPapersResult>[1] = {}): Promise<PaperHit[]> {
  return (await searchPapersResult(query, options)).hits;
}

/** Checks a key with one tiny call. 'rate_limited' still means the key was accepted. */
export async function checkOpenAlexKey(apiKey: string, fetchImpl: Fetcher = fetch): Promise<'valid' | 'invalid' | 'unreachable'> {
  const params = new URLSearchParams({ 'per-page': '1', select: 'id', api_key: apiKey });
  try {
    const res = await fetchImpl(`${OPENALEX_WORKS_URL}?${params}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (res.status === 401 || res.status === 403) return 'invalid';
    if (res.ok || res.status === 429) return 'valid';
    return 'unreachable';
  } catch {
    return 'unreachable';
  }
}
