// Claude adapter: request shape, forced JSON, error mapping. No network: fetch is replaced for each test.
// This runs under Playwright's runner, not `node --test`, because the adapter imports modules without
// file extensions, which Node's ESM loader cannot resolve.
import { test, expect } from '@playwright/test';
import { AnthropicAIAdapter } from '../src/lib/ai/adapters/anthropic';
import { AIKeyError, AIServiceBusyError } from '../src/lib/ai/types';

const KEY = 'sk-ant-test-abcdefghijklmnopqrstuvwxyz';
const BASE = 'https://api.anthropic.com/v1';
const passage = '[P1-1 | page 1] Latency fell by 40 percent after the cache was added.';

type Reply = { status: number; json?: unknown; headers?: Record<string, string> };

function stubFetch(reply: Reply) {
  const calls: { url: string; init: RequestInit; body: any }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    const headers = reply.headers ?? {};
    return {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      json: async () => reply.json,
      text: async () => JSON.stringify(reply.json ?? {}),
    } as unknown as Response;
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}

test('a Claude question sends the system prompt separately and forces a JSON tool result', async () => {
  const stub = stubFetch({
    status: 200,
    json: {
      model: 'claude-haiku-5-5',
      content: [
        {
          type: 'tool_use',
          name: 'record_result',
          input: { answer: 'Latency fell by **40 percent** [Page 1].', citations: [{ passageId: 'P1-1', quote: 'Latency fell by 40 percent' }] },
        },
      ],
    },
  });
  try {
    const ai = new AnthropicAIAdapter(KEY, 'claude-haiku-5-5', BASE, { strict: true });
    const result = await ai.askPageQuestion(passage, 'How much did latency fall?');
    const { url, init, body } = stub.calls[0];
    expect(url).toBe(`${BASE}/messages`);
    expect((init.headers as Record<string, string>)['x-api-key']).toBe(KEY);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(body.model).toBe('claude-haiku-5-5');
    expect(body.messages.some((m: { role: string }) => m.role === 'system')).toBe(false);
    expect(body.system).toMatch(/research AI assistant/);
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'record_result' });
    expect(body.tools[0].name).toBe('record_result');
    expect(result.model).toBe('claude-haiku-5-5');
    expect(result.answer).toBe('Latency fell by **40 percent** [Page 1].');
    expect(result.citations[0].passageId).toBe('p1-1');
  } finally {
    stub.restore();
  }
});

test('a rejected key becomes INVALID_KEY when strict, and a rate limit keeps its retry time', async () => {
  const strict = new AnthropicAIAdapter(KEY, 'claude-sonnet-5-5', BASE, { strict: true, keysUrl: 'https://console.anthropic.com/settings/keys' });
  const denied = stubFetch({ status: 401, json: { error: 'invalid x-api-key' } });
  try {
    await expect(strict.askPageQuestion(passage, 'Q')).rejects.toMatchObject({ code: 'INVALID_KEY' });
    await expect(strict.askPageQuestion(passage, 'Q')).rejects.toBeInstanceOf(AIKeyError);
  } finally {
    denied.restore();
  }
  const limited = stubFetch({ status: 429, json: {}, headers: { 'retry-after': '12' } });
  try {
    await expect(strict.askPageQuestion(passage, 'Q')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfterSec: 12 });
  } finally {
    limited.restore();
  }
});

test('a request too large for the model is flagged so the route retries with fewer passages', async () => {
  const stub = stubFetch({ status: 400, json: { error: { message: 'prompt is too long: 250000 tokens > 200000 maximum' } } });
  try {
    const ai = new AnthropicAIAdapter(KEY, 'claude-sonnet-5-5', BASE, { strict: true });
    const error = await ai.askPageQuestion(passage, 'Q').catch((e) => e);
    expect(error).toBeInstanceOf(AIServiceBusyError);
    expect(error.tooLarge).toBe(true);
  } finally {
    stub.restore();
  }
});
