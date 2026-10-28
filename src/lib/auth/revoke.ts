// Stops every extension token of one account from working. Called when the person signs out of the website, so a
// signed-out account cannot keep receiving clips from a Chrome extension that was connected earlier. The tokens are
// kept as revoked rows (not deleted), the same as when one is revoked by hand. Returns false if the update failed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function revokeExtensionTokens(db: any, userId: string): Promise<boolean> {
  const { error } = await db
    .from('extension_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
  return !error;
}
