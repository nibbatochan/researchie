import test from 'node:test';
import assert from 'node:assert/strict';
import * as OTPAuth from 'otpauth';
import { newTotpSecret, totpUri, checkTotp } from '../src/lib/auth/totp.ts';

test('a new secret is base32 and different each time', () => {
  const a = newTotpSecret();
  const b = newTotpSecret();
  assert.match(a, /^[A-Z2-7]+$/);
  assert.notEqual(a, b);
});

test('the address names the app and the account and carries the secret', () => {
  const secret = newTotpSecret();
  const uri = totpUri('pat@example.com', secret);
  assert.ok(uri.startsWith('otpauth://totp/'));
  assert.ok(uri.includes('issuer=Researchie'));
  assert.ok(uri.includes(`secret=${secret}`));
});

test('the current code is accepted; six digits that are wrong are refused', () => {
  const secret = newTotpSecret();
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), algorithm: 'SHA1', digits: 6, period: 30 });
  const now = totp.generate();
  assert.equal(checkTotp(secret, now), true);
  assert.equal(checkTotp(secret, ` ${now.slice(0, 3)} ${now.slice(3)} `), true, 'spaces are ignored');
  const wrong = now === '000000' ? '111111' : '000000';
  assert.equal(checkTotp(secret, wrong), false);
});

test('a code from one 30-second step earlier is still accepted; further back is not', () => {
  const secret = newTotpSecret();
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), algorithm: 'SHA1', digits: 6, period: 30 });
  const prev = totp.generate({ timestamp: Date.now() - 30_000 });
  const old = totp.generate({ timestamp: Date.now() - 120_000 });
  assert.equal(checkTotp(secret, prev), true);
  assert.equal(checkTotp(secret, old), false);
});

test('anything that is not six digits is refused without checking', () => {
  const secret = newTotpSecret();
  for (const bad of ['', '12345', '1234567', 'abcdef', null, undefined, 123456.5]) {
    assert.equal(checkTotp(secret, bad), false, `refused: ${String(bad)}`);
  }
});
