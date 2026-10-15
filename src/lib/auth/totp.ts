// Authenticator-app codes (TOTP, RFC 6238) for confirming an account deletion. Kept free of database imports
// so it can be unit-tested on its own.
import * as OTPAuth from 'otpauth';

export const TOTP_ISSUER = 'Researchie';

/** A new random secret, in the base32 form authenticator apps expect. */
export function newTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totpFor(label: string, secret: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/** The otpauth:// address an authenticator app reads (the secret is in it). */
export function totpUri(email: string, secret: string): string {
  return totpFor(email, secret).toString();
}

/** True when the code is six digits and matches this secret now, or one 30-second step either side. */
export function checkTotp(secret: string, code: unknown): boolean {
  const clean = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  return totpFor('check', secret).validate({ token: clean, window: 1 }) !== null;
}
