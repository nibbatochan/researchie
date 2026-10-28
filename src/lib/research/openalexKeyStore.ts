import { supabaseAdmin } from '@/lib/supabase/admin';
import { openSecret } from '@/lib/ai/keyVault';

// The key used for one paper search. On the tester deployment it is the signed-in user's own saved key. Locally
// (no sign-in) it is OPENALEX_API_KEY from .env.local. Returns null when there is none or it cannot be read; the
// search then runs keyless, which has a small shared daily allowance.
export async function loadOpenAlexKey(userId: string | null, authRequired: boolean): Promise<string | null> {
  if (!authRequired) return process.env.OPENALEX_API_KEY?.trim() || null;
  if (!userId) return null;
  const { data } = await supabaseAdmin
    .from('user_openalex_keys')
    .select('ciphertext, iv, auth_tag')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  try {
    return openSecret({ ciphertext: data.ciphertext, iv: data.iv, authTag: data.auth_tag }, userId);
  } catch {
    return null;
  }
}
