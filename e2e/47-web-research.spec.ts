// Web research (Perplexity Agent API): request shape, response parsing, key errors. No network: fetch is stubbed.
// Under Playwright's runner, like 46-anthropic-adapter, because the modules import without file extensions.
import { test, expect } from '@playwright/test';
import { searchWeb, parseAgentResponse, checkPerplexityKey } from '../src/lib/ai/webResearch';

const KEY = 'pplx-test-abcdefghijklmnopqrstuvwxyz';

type Reply = { status: number; json?: unknown; headers?: Record<string, string> };

function fake(reply: Reply) {
  const calls: { url: string; init: RequestInit; body: any }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    const headers = reply.headers ?? {};
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      json: async () => reply.json,
    } as unknown as Response;
  }) as typeof fetch;
  return { calls, fetchImpl };
}

const agentJson = {
  model: 'openai/gpt-5.6-sol',
  output: [
    { type: 'search_results', results: [
      { title: 'Transformer paper', url: 'https://arxiv.org/abs/1706.03762', date: '2017-06-12', snippet: 'Attention is all you need.' },
      { title: 'Duplicate', url: 'https://arxiv.org/abs/1706.03762' },
      { title: 'Not a web link', url: 'javascript:alert(1)' },
    ] },
    { type: 'message', content: [{ type: 'output_text', text: 'The Transformer uses ' }, { type: 'output_text', text: 'self-attention.' }] },
  ],
};

test('the request uses the Agent API endpoint, a bearer key and the web_search tool', async () => {
  const f = fake({ status: 200, json: agentJson });
  await searchWeb(KEY, 'What is a Transformer?', { fetchImpl: f.fetchImpl });
  const [call] = f.calls;
  expect(call.url).toBe('https://api.perplexity.ai/v1/agent');
  expect((call.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
  expect(call.body.input).toBe('What is a Transformer?');
  expect(call.body.tools).toEqual([{ type: 'web_search' }]);
  expect(call.body.effort).toBe('fast');
});

test('the answer and sources are read from the output items, with duplicates and non-web links dropped', async () => {
  const f = fake({ status: 200, json: agentJson });
  const result = await searchWeb(KEY, 'Q', { fetchImpl: f.fetchImpl });
  expect(result.answer).toBe('The Transformer uses self-attention.');
  expect(result.model).toBe('openai/gpt-5.6-sol');
  expect(result.sources).toEqual([
    { title: 'Transformer paper', url: 'https://arxiv.org/abs/1706.03762', date: '2017-06-12', snippet: 'Attention is all you need.' },
  ]);
});

test('an empty answer parses to empty text and no sources', () => {
  expect(parseAgentResponse({ output: [] })).toEqual({ answer: '', sources: [], model: undefined });
});

test('a rejected key becomes INVALID_KEY, and a rate limit keeps its retry time', async () => {
  await expect(searchWeb(KEY, 'Q', { fetchImpl: fake({ status: 401 }).fetchImpl })).rejects.toMatchObject({ code: 'INVALID_KEY' });
  await expect(
    searchWeb(KEY, 'Q', { fetchImpl: fake({ status: 429, headers: { 'retry-after': '7' } }).fetchImpl })
  ).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSec: 7 });
});

test('key check: valid, invalid, rate limited counts as valid, unreachable on network failure', async () => {
  expect(await checkPerplexityKey(KEY, fake({ status: 200, json: agentJson }).fetchImpl)).toBe('valid');
  expect(await checkPerplexityKey(KEY, fake({ status: 401 }).fetchImpl)).toBe('invalid');
  expect(await checkPerplexityKey(KEY, fake({ status: 429 }).fetchImpl)).toBe('valid');
  const offline = (async () => {
    throw new Error('offline');
  }) as typeof fetch;
  expect(await checkPerplexityKey(KEY, offline)).toBe('unreachable');
});
