import { NextResponse } from 'next/server';
import { AUTH_REQUIRED, type AuthedUser } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { aiService } from './service';
import { GroqAIAdapter } from './adapters/groq';
import { AIKeyError, type AIServiceAdapter } from './types';
import { openSecret } from './keyVault';
import { getProvider } from './providers';

// Which AI client a request uses.
//   Local development (AUTH_REQUIRED off): the server's own key from .env.local, as before.
//   Tester deployment: the signed-in user's own key, decrypted for this request only. The server's key is
//   never used, and there is no fake-answer fallback.

export async function loadUserAI(userId: string): Promise<AIServiceAdapter> {
  const { data } = await supabaseAdmin
    .from('user_ai_keys')
    .select('provider, model, ciphertext, iv, auth_tag')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    throw new AIKeyError('NO_KEY', 'Add your AI key in Settings to use this feature.');
  }

  let key: string;
  try {
    key = openSecret({ ciphertext: data.ciphertext, iv: data.iv, authTag: data.auth_tag }, userId);
  } catch {
    // The stored key can no longer be read (the server secret changed). Ask for it again; say nothing about why.
    throw new AIKeyError('NO_KEY', 'Your saved AI key could not be read. Add it again in Settings.');
  }

  const provider = getProvider(data.provider);
  const model = data.model || provider.defaultModel;
  return new GroqAIAdapter(key, model, provider.baseUrl, {
    fallbackModels: provider.fallbackModels ?? [model],
    strict: true,
    keysUrl: provider.keysUrl,
  });
}

export async function resolveAI(user: AuthedUser): Promise<{ ai: AIServiceAdapter; response?: undefined } | { ai?: undefined; response: NextResponse }> {
  if (!AUTH_REQUIRED) return { ai: aiService };
  try {
    return { ai: await loadUserAI(user.id) };
  } catch (error) {
    const response = aiErrorResponse(error);
    if (response) return { response };
    throw error;
  }
}

/** A readable response for a key problem, or null when the error is something else. */
export function aiErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof AIKeyError)) return null;
  const headers = { 'Access-Control-Allow-Origin': '*' };
  if (error.code === 'NO_KEY') {
    return NextResponse.json(
      { success: false, code: 'NO_KEY', error: error.message, helpUrl: 'https://console.groq.com/keys' },
      { status: 402, headers }
    );
  }
  if (error.code === 'INVALID_KEY') {
    return NextResponse.json(
      { success: false, code: 'INVALID_KEY', error: 'Your AI provider rejected your key. Check or replace it in Settings.', helpUrl: error.helpUrl ?? 'https://console.groq.com/keys' },
      { status: 401, headers }
    );
  }
  const wait = error.retryAfterSec ? ` Try again in about ${error.retryAfterSec} seconds.` : ' Try again in a minute.';
  return NextResponse.json(
    {
      success: false,
      code: 'RATE_LIMITED',
      error: `Your AI provider's free limit is used up for now.${wait} Limits belong to your provider account, not to this app.`,
      retryAfterSec: error.retryAfterSec,
    },
    { status: 429, headers }
  );
}
