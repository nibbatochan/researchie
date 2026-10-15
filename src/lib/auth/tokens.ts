// Extension tokens and the request checks that need no database. Kept free of imports from the app so
// it can be unit-tested on its own.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const TOKEN_PREFIX = 'rst_';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/**
 * A new token. The plain text is shown to the user once; only the hash is stored.
 * With an origin, the token ends in ".<that address, encoded>", so the extension needs only the token: it reads
 * the server address from it. The address is not a secret and does not make the token easier to guess.
 */
export function generateExtensionToken(origin?: string): { token: string; hash: string; last4: string } {
  const secret = randomBytes(32).toString('base64url');
  const token = TOKEN_PREFIX + secret + (origin ? '.' + Buffer.from(origin, 'utf8').toString('base64url') : '');
  return { token, hash: hashToken(token), last4: token.slice(-4) };
}

/** The pairing token of a local server: it only tells the extension where the server is. Nothing is stored. */
export function localPairingToken(origin: string): string {
  return `${TOKEN_PREFIX}local.${Buffer.from(origin, 'utf8').toString('base64url')}`;
}

/**
 * The server address inside a token, or null when there is none or it is not an address the extension may
 * send clips to (https anywhere, or http only for this computer).
 */
export function originFromToken(token: string | null | undefined): string | null {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  try {
    const decoded = Buffer.from(token.slice(dot + 1), 'base64url').toString('utf8');
    const url = new URL(decoded);
    const local = LOCAL_HOSTS.includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    if (url.username || url.password || url.origin !== decoded) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** This server's own public address, from the request's headers (it is behind a proxy on Vercel). */
export function requestOrigin(headers: { get(name: string): string | null }): string | null {
  const host = (headers.get('x-forwarded-host') || headers.get('host') || '').split(',')[0].trim();
  if (!host) return null;
  const hostname = host.replace(/:\d+$/, '').toLowerCase();
  const proto = (headers.get('x-forwarded-proto') || '').split(',')[0].trim() || (LOCAL_HOSTS.includes(hostname) ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** The bearer token from an Authorization header, or null when it is not one of ours. */
export function readBearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  return match[1].startsWith(TOKEN_PREFIX) && match[1].length >= 20 ? match[1] : null;
}

/**
 * Cookie sessions are sent by the browser automatically, so a state-changing request that carries one must
 * come from our own site. A request from another origin is refused. Token requests are not affected.
 */
export function isCrossSiteWrite(method: string, originHeader: string | null | undefined, host: string | null | undefined): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) return false;
  if (!originHeader) return false; // same-origin requests from older browsers and non-browser clients send none
  try {
    return new URL(originHeader).host !== host;
  } catch {
    return true;
  }
}

/**
 * The sign-up gate. With no code configured (SIGNUP_INVITE_CODE unset) everyone passes. With one, the code
 * must match. Both sides are hashed first so the comparison takes the same time whatever was typed.
 */
export function inviteCodeMatches(provided: unknown, expected: string | undefined): boolean {
  const want = (expected ?? '').trim();
  if (!want) return true;
  if (typeof provided !== 'string') return false;
  const a = createHash('sha256').update(provided.trim()).digest();
  const b = createHash('sha256').update(want).digest();
  return timingSafeEqual(a, b);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(email: unknown, password: unknown): { ok: true; email: string; password: string } | { ok: false; error: string } {
  if (typeof email !== 'string' || !EMAIL.test(email.trim()) || email.length > 254) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, error: 'Use a password of at least 8 characters.' };
  }
  if (password.length > 200) return { ok: false, error: 'That password is too long.' };
  return { ok: true, email: email.trim().toLowerCase(), password };
}
