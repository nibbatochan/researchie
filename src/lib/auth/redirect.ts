// Where to send someone after sign-in. Only a path on this site is allowed: anything that could leave it
// ("//evil.com", "@evil.com", a full address, a backslash) becomes "/". Free of app imports so it can be tested alone.

export function safeNext(input: unknown): string {
  if (typeof input !== 'string') return '/';
  const next = input.trim();
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || next.length > 300) return '/';
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) return '/';
  return next;
}

/** A recently created account: made within the last minute, and signed in for the first time just now. */
export function isNewAccount(createdAt: string | undefined, lastSignInAt: string | undefined, now: number = Date.now()): boolean {
  const created = Date.parse(createdAt ?? '');
  if (Number.isNaN(created) || now - created > 60_000) return false;
  const last = Date.parse(lastSignInAt ?? '');
  return Number.isNaN(last) || Math.abs(last - created) < 60_000;
}
