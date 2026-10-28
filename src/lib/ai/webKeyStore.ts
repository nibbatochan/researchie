import { supabaseAdmin } from '@/lib/supabase/admin';
import { openSecret } from './keyVault';
import { isWebEffort, type WebEffort } from './webResearch';

// The signed-in user's saved Perplexity key and search depth, decrypted for one request. Returns null when there
// is none or it can no longer be read (the server secret changed); the caller asks the user to add it again.
export async function loadWebKey(userId: string): Promise<{ apiKey: string; effort: WebEffort } | null> {
  const { data } = await supabaseAdmin
    .from('user_web_keys')
    .select('ciphertext, iv, auth_tag, effort')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  try {
    const apiKey = openSecret({ ciphertext: data.ciphertext, iv: data.iv, authTag: data.auth_tag }, userId);
    return { apiKey, effort: isWebEffort(data.effort) ? data.effort : 'fast' };
  } catch {
    return null;
  }
}
