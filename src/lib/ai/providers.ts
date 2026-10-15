// The AI providers a user can bring their own key for. Safe to import in the browser: it holds no secrets.
//
// All four speak the OpenAI "chat completions" format, so one adapter serves them all; only the address,
// the default model and the key check differ. The free-tier and privacy notes below were checked against
// each provider's own pages on 2026-10-15. Where a claim could not be confirmed, the note says so.

export type ProviderId = 'groq' | 'cerebras' | 'openrouter' | 'google';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  /** Where the user gets a free key. */
  keysUrl: string;
  /** Models to fall back to when the first is busy. null = only the chosen model. */
  fallbackModels: string[] | null;
  /** How the key is checked when saved or tested. */
  keyCheck: { url: string };
  freeTier: string;
  privacy: { level: 'ok' | 'check' | 'warn'; text: string };
  recommended?: boolean;
}

export const DEFAULT_PROVIDER: ProviderId = 'groq';

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  groq: {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
    keysUrl: 'https://console.groq.com/keys',
    fallbackModels: ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'allam-2-7b'],
    keyCheck: { url: 'https://api.groq.com/openai/v1/models' },
    freeTier: 'Fast. The free tier has rate limits that apply per Groq account, not per key, so each person should use their own Groq account.',
    privacy: {
      level: 'ok',
      text: 'Groq says it does not keep your prompts or answers, except briefly for troubleshooting or abuse checks (up to 30 days). You can switch that off under Data Controls in your Groq console. Read Groq\'s terms for the full policy.',
    },
    recommended: true,
  },
  cerebras: {
    id: 'cerebras',
    label: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1',
    defaultModel: 'gpt-oss-120b',
    keysUrl: 'https://cloud.cerebras.ai/',
    fallbackModels: null,
    keyCheck: { url: 'https://api.cerebras.ai/v1/models' },
    freeTier: 'Free tier: about 1 million tokens a day, but only 5 requests a minute on the current models.',
    privacy: {
      level: 'check',
      text: 'Cerebras says inference inputs and outputs are not retained. We could not confirm this for the free API tier, so check Cerebras\'s terms before sending sensitive text.',
    },
    recommended: true,
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-oss-120b:free',
    keysUrl: 'https://openrouter.ai/keys',
    fallbackModels: null,
    keyCheck: { url: 'https://openrouter.ai/api/v1/key' },
    freeTier: 'One key reaches many models. Free models allow 20 requests a minute and only 50 a day, unless you have bought at least 10 credits, which raises the daily limit to 1,000.',
    privacy: {
      level: 'check',
      text: 'OpenRouter passes your text to whichever company runs the model, and each has its own data policy. We have not verified how free models handle prompts. Check the model page before sending sensitive text.',
    },
  },
  google: {
    id: 'google',
    label: 'Google AI Studio (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    keysUrl: 'https://aistudio.google.com/apikey',
    fallbackModels: null,
    keyCheck: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/models' },
    freeTier: 'Free, with a long context window.',
    privacy: {
      level: 'warn',
      text: 'On the free tier Google may use what you send to improve its products, and people may read it. Do not use this with sensitive, confidential or personal data. In the EU, UK and Switzerland the paid-tier data terms apply even to free use.',
    },
  },
};

export const PROVIDER_ORDER: ProviderId[] = ['groq', 'cerebras', 'openrouter', 'google'];

/** Shown under the dropdown for everyone. */
export const MEDICAL_DATA_NOTICE =
  'If your clips contain patient or other identifiable medical data, do not send them to any free AI tier. Groq and Cerebras are the defaults to try first. Mistral\'s free plan, which is not offered here, trains on your data unless you opt out.';

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

export function getProvider(id: unknown): ProviderInfo {
  return isProviderId(id) ? PROVIDERS[id] : PROVIDERS[DEFAULT_PROVIDER];
}

/** A pasted key must look like a key: no spaces, a sane length. Whether it works is checked with the provider. */
export function cleanKeyInput(raw: unknown): { ok: true; key: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Paste your API key.' };
  const key = raw.trim();
  if (key.length < 20) return { ok: false, error: 'That key looks too short. Copy the whole key from your provider.' };
  if (key.length > 300) return { ok: false, error: 'That key looks too long. Paste only the key.' };
  if (/\s/.test(key)) return { ok: false, error: 'A key has no spaces. Paste only the key.' };
  return { ok: true, key };
}

export type KeyCheckStatus = 'valid' | 'invalid' | 'rate_limited' | 'unreachable';

/**
 * Asks the provider whether the key is accepted, using a read-only call that spends no tokens.
 * `fetchImpl` is a parameter so tests can run without the network.
 */
export async function checkProviderKey(
  provider: ProviderInfo,
  key: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ status: KeyCheckStatus; httpStatus?: number }> {
  try {
    const res = await fetchImpl(provider.keyCheck.url, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return { status: 'valid', httpStatus: res.status };
    if (res.status === 401 || res.status === 403) return { status: 'invalid', httpStatus: res.status };
    if (res.status === 429) return { status: 'rate_limited', httpStatus: res.status };
    // 400 from Google's compatibility layer means "API key not valid".
    if (res.status === 400) return { status: 'invalid', httpStatus: res.status };
    return { status: 'unreachable', httpStatus: res.status };
  } catch {
    return { status: 'unreachable' };
  }
}
