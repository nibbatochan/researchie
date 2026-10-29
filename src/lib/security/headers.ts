// Headers added to every response (src/middleware.ts). They stop the app being framed by another site (a signed-in
// person could be tricked into clicking delete, share or token buttons), stop browsers guessing file types, and keep
// the page address out of requests to other sites. A full script-src policy is not set: Next.js writes inline
// scripts, and that needs nonces first.

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
