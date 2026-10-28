// The AI providers a user can bring their own key for. Safe to import in the browser: it holds no secrets.
//
// All four speak the OpenAI "chat completions" format, so one adapter serves them all; only the address,
// the default model and the key check differ. The free-tier and privacy notes below were checked against
// each provider's own pages on 2026-10-15. Where a claim could not be confirmed, the note says so.

export type ProviderId = 'groq' | 'cerebras' | 'openrouter' | 'google' | 'anthropic';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  baseUrl: string;
  defaultModel: string;
  /** Models the user can pick from. Absent = the user types a model name. */
  models?: { id: string; label: string }[];
  /** Where the user gets a free key. */
  keysUrl: string;
  /** Models to fall back to when the first is busy. null = only the chosen model. */
  fallbackModels: string[] | null;
  /** How the key is checked when saved or tested. `headers` defaults to a Bearer token. */
  keyCheck: { url: string; headers?: (key: string) => Record<string, string> };
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
    // Groq's production models (checked 2026-10-28 against the models page). Preview models are left out.
    models: [
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (default, strongest)' },
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (faster, smaller)' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fastest, weakest)' },
    ],
    keysUrl: 'https://console.groq.com/keys',
    // Production models in Groq's list (checked 2026-10-15). qwen/qwen3.8-27b is preview-only and allam-2-7b is no longer listed.
    fallbackModels: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'],
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
    freeTier: 'Free tier: about 1 million tokens a day, but only 5 requests a minute on the current models. A tester reported that sign-up asked for card details, so it is not offered as the first choice.',
    privacy: {
      level: 'check',
      text: 'Cerebras says inference inputs and outputs are not retained. We could not confirm this for the free API tier, so check Cerebras\'s terms before sending sensitive text.',
    },
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    // openrouter/free picks a currently available free model for you. Named free models come and go (the one
    // used here at first no longer exists), so a fixed name would break; type one in the Model box to pin it.
    defaultModel: 'openrouter/free',
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
    // Google's own OpenAI-compatibility example uses this model. gemini-2.5-flash is still served but only to
    // accounts that used the 2.5 models before, so a new tester could not use it.
    defaultModel: 'gemini-3.8-flash',
    keysUrl: 'https://aistudio.google.com/apikey',
    fallbackModels: null,
    keyCheck: { url: 'https://generativelanguage.googleapis.com/v1beta/openai/models' },
    freeTier: 'Free, with a long context window.',
    privacy: {
      level: 'warn',
      text: 'On the free tier Google may use what you send to improve its products, and people may read it. Do not use this with sensitive, confidential or personal data. In the EU, UK and Switzerland the paid-tier data terms apply even to free use.',
    },
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-5-5',
    models: [
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (fastest, lowest cost)' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (balanced)' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (most capable)' },
      { id: 'claude-fable-5-1', label: 'Claude Fable 5.1' },
    ],
    keysUrl: 'https://console.anthropic.com/settings/keys',
    // A fixed list of Claude models; no fallback to another model, so a Claude answer is always a Claude answer.
    fallbackModels: null,
    keyCheck: {
      url: 'https://api.anthropic.com/v1/models',
      headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    },
    freeTier: 'No free tier. You pay per token on your own Anthropic API account. A Claude.ai Pro or Max subscription cannot be used here: Anthropic does not allow third-party apps to use plan credentials.',
    privacy: {
      level: 'check',
      text: 'Anthropic API requests are covered by Anthropic\'s API terms, not the consumer app terms. We have not checked the current API data-retention terms, so read them before sending sensitive text.',
    },
  },
};

// Groq is the default. Claude (Anthropic) is offered from 2026-10-28 so testers can pick a Claude model. Cerebras,
// OpenRouter and Google stay in the code, and a key saved earlier for one of them keeps working; they are just not
// in the list. Add an id here to offer it again.
export const PROVIDER_ORDER: ProviderId[] = ['groq', 'anthropic'];

/** Shown under the dropdown for everyone. */
export const MEDICAL_DATA_NOTICE =
  'If your clips contain patient or other identifiable medical data, do not send them to any free AI tier. Groq is the one to try first. Mistral\'s free plan, which is not offered here, trains on your data unless you opt out.';

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
      headers: provider.keyCheck.headers ? provider.keyCheck.headers(key) : { Authorization: `Bearer ${key}` },
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
