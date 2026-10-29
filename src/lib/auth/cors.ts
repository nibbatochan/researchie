// Which web pages may call /api from a browser. Kept free of app imports so it can be unit-tested on its own.
//
// Without accounts (local development) the API has no sign-in, so a page on any other site must not be able to read or
// change the local data: only this app, a page on this computer, and the extension are let in. With accounts the API
// is protected by the session or token, so other origins may call it, but never with cookies (no credentials header).

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export const CORS_METHODS = 'GET,OPTIONS,PATCH,DELETE,POST,PUT';
export const CORS_HEADERS = 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization';

/** True for an Origin header that is this site itself, this computer, or a browser extension. */
export function isTrustedLocalOrigin(origin: string, host: string | null | undefined): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol === 'chrome-extension:') return true;
    if (host && url.host === host) return true;
    return (url.protocol === 'http:' || url.protocol === 'https:') && LOOPBACK_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

export type CorsDecision =
  | { allow: false }
  | { allow: true; headers: Record<string, string> };

export function decideCors(opts: { authRequired: boolean; origin: string | null; host: string | null }): CorsDecision {
  const { authRequired, origin, host } = opts;
  const base = { 'Access-Control-Allow-Methods': CORS_METHODS, 'Access-Control-Allow-Headers': CORS_HEADERS };

  if (authRequired) {
    return { allow: true, headers: { ...base, 'Access-Control-Allow-Origin': '*' } };
  }
  // Same-site requests and non-browser clients send no Origin.
  if (!origin) return { allow: true, headers: {} };
  if (!isTrustedLocalOrigin(origin, host)) return { allow: false };
  return { allow: true, headers: { ...base, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } };
}
