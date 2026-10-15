// The Notion token a user saved in their account (tester deployment). Server-only.
import { supabaseAdmin } from '@/lib/supabase/admin';
import { openSecret } from '@/lib/ai/keyVault';

/** The user's saved token in plain form, or null when none is saved or it cannot be read. */
export async function readStoredNotionToken(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
      .from('user_notion_tokens')
      .select('ciphertext, iv, auth_tag')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return null;
    return openSecret({ ciphertext: data.ciphertext, iv: data.iv, authTag: data.auth_tag }, userId);
  } catch {
    // A changed KEY_ENCRYPTION_SECRET leaves rows that cannot be opened; the person saves the token again.
    return null;
  }
}
