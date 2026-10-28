// Web research with Perplexity's Agent API (POST /v1/agent). It answers from the open web, not from the user's
// clips, so its answers are kept apart from clip Q&A and are labelled as web answers in the chat.
//
// Docs checked 2026-10-28: https://docs.perplexity.ai/docs/agent-api/quickstart (endpoint, web_search tool, output
// items) and https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview (search_results item fields).

import { AIKeyError } from './types';

export const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai/v1';
// Help page for creating a key (the console link itself is not in the docs we could read).
export const PERPLEXITY_KEYS_HELP_URL = 'https://docs.perplexity.ai/docs/admin/api-key-management';

// Search depth. Perplexity's Agent API effort levels; the user picks one in Settings. Costs rise with depth.
export type WebEffort = 'fast' | 'low' | 'medium';
export const WEB_EFFORTS: { id: WebEffort; label: string }[] = [
  { id: 'fast', label: 'Fast (cheapest, quick answers)' },
  { id: 'low', label: 'Low (more sources, a little slower)' },
  { id: 'medium', label: 'Medium (deeper search, slowest, costs most)' },
];

export function isWebEffort(value: unknown): value is WebEffort {
  return WEB_EFFORTS.some((e) => e.id === value);
}

export interface WebSource {
  title: string;
  url: string;
  date?: string;
  snippet?: string;
}

export interface WebResearchResult {
  answer: string;
  sources: WebSource[];
  // The model the Agent API reports it used, shown in the chat.
  model?: string;
}

type Fetcher = typeof fetch;

/** Asks Perplexity a question with web search on. `effort: 'fast'` keeps cost and latency low. */
export async function searchWeb(
  apiKey: string,
  query: string,
  options: { effort?: 'fast' | 'low' | 'medium'; fetchImpl?: Fetcher; timeoutMs?: number } = {}
): Promise<WebResearchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl(`${PERPLEXITY_BASE_URL}/agent`, {
    method: 'POST',
    signal: AbortSignal.timeout(options.timeoutMs ?? 60000),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      effort: options.effort ?? 'fast',
      input: query,
      tools: [{ type: 'web_search' }],
      instructions:
        'Answer the question from current web sources. Keep the answer under 300 words, in plain sentences. Name the sources you relied on.',
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new AIKeyError('INVALID_KEY', 'Perplexity rejected your API key.', undefined, PERPLEXITY_KEYS_HELP_URL);
  }
  if (res.status === 429) {
    const retry = Number(res.headers.get('retry-after'));
    throw new AIKeyError('RATE_LIMITED', 'Perplexity limit reached for now.', Number.isFinite(retry) && retry > 0 ? Math.ceil(retry) : undefined, PERPLEXITY_KEYS_HELP_URL);
  }
  if (!res.ok) {
    throw new Error(`Perplexity error ${res.status}`);
  }

  const json: any = await res.json();
  return parseAgentResponse(json);
}

/** Pulls the answer text and the source list out of an Agent API response. Exported for tests. */
export function parseAgentResponse(json: any): WebResearchResult {
  const items: any[] = Array.isArray(json?.output) ? json.output : [];

  const answer = items
    .filter((item) => item?.type === 'message')
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((part) => part?.type === 'output_text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();

  const seen = new Set<string>();
  const sources: WebSource[] = [];
  for (const item of items.filter((i) => i?.type === 'search_results')) {
    const results: any[] = Array.isArray(item.results) ? item.results : [];
    for (const r of results) {
      if (typeof r?.url !== 'string' || !/^https?:\/\//.test(r.url) || seen.has(r.url)) continue;
      seen.add(r.url);
      sources.push({
        title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : r.url,
        url: r.url,
        date: typeof r.date === 'string' ? r.date : undefined,
        snippet: typeof r.snippet === 'string' ? r.snippet : undefined,
      });
    }
  }

  return { answer, sources, model: typeof json?.model === 'string' ? json.model : undefined };
}

/** A cheap check that a key works: one short fast-effort call. Costs a few tokens; the caller says so in the UI. */
export async function checkPerplexityKey(apiKey: string, fetchImpl: Fetcher = fetch): Promise<'valid' | 'invalid' | 'unreachable'> {
  try {
    await searchWeb(apiKey, 'Reply with the word OK.', { fetchImpl, timeoutMs: 20000 });
    return 'valid';
  } catch (error) {
    if (error instanceof AIKeyError && error.code === 'INVALID_KEY') return 'invalid';
    if (error instanceof AIKeyError) return 'valid'; // rate limited: the key itself was accepted
    return 'unreachable';
  }
}
