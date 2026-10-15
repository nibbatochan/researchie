// Checks what a person pasted as a Notion integration token before it is sent anywhere. Free of imports so it
// can be unit-tested on its own.

export type CleanedNotionToken = { ok: true; token: string } | { ok: false; error: string };

export function cleanNotionToken(input: unknown): CleanedNotionToken {
  if (typeof input !== 'string') return { ok: false, error: 'Paste your Notion integration token.' };
  const token = input.trim();
  if (!token) return { ok: false, error: 'Paste your Notion integration token.' };
  if (/\s/.test(token)) return { ok: false, error: 'The token has a space or line break in it. Copy it again.' };
  if (token.length < 20 || token.length > 300) return { ok: false, error: 'That does not look like a Notion token. It is a long string that starts with secret_ or ntn_.' };
  if (!/^[A-Za-z0-9_\-]+$/.test(token)) return { ok: false, error: 'The token has characters it should not. Copy it again from notion.so/my-integrations.' };
  return { ok: true, token };
}
