// Extension tokens and the request checks that need no database. Kept free of imports from the app so
// it can be unit-tested on its own.
import { createHash, randomBytes } from 'node:crypto';

export const TOKEN_PREFIX = 'rst_';

/** A new token. The plain text is shown to the user once; only the hash is stored. */
export function generateExtensionToken(): { token: string; hash: string; last4: string } {
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token), last4: token.slice(-4) };
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
