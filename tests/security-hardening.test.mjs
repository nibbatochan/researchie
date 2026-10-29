import test from 'node:test';
import assert from 'node:assert/strict';
import { decideCors, isTrustedLocalOrigin } from '../src/lib/auth/cors.ts';
import { isPrivateAddress, fetchPublic } from '../src/lib/security/safeFetch.ts';

test('local mode: other websites are refused, this app and the extension are let in', () => {
  const host = 'localhost:3001';
  assert.equal(decideCors({ authRequired: false, origin: 'https://evil.example', host }).allow, false);
  assert.equal(decideCors({ authRequired: false, origin: 'null', host }).allow, false);
  const same = decideCors({ authRequired: false, origin: 'http://localhost:3001', host });
  assert.ok(same.allow && same.headers['Access-Control-Allow-Origin'] === 'http://localhost:3001');
  assert.equal(decideCors({ authRequired: false, origin: 'chrome-extension://abcdef', host }).allow, true);
  assert.deepEqual(decideCors({ authRequired: false, origin: null, host }), { allow: true, headers: {} });
});

test('local mode: a look-alike host is not trusted', () => {
  assert.equal(isTrustedLocalOrigin('http://localhost.evil.example', 'localhost:3001'), false);
  assert.equal(isTrustedLocalOrigin('http://127.0.0.1.evil.example', 'localhost:3001'), false);
});

test('accounts mode: any origin may call, never with credentials', () => {
  const d = decideCors({ authRequired: true, origin: 'https://other.example', host: 'app.example' });
  assert.ok(d.allow);
  assert.equal(d.headers['Access-Control-Allow-Origin'], '*');
  assert.equal(d.headers['Access-Control-Allow-Credentials'], undefined);
});

test('private, loopback, metadata and mapped addresses are refused', () => {
  for (const a of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe']) {
    assert.equal(isPrivateAddress(a), true, a);
  }
  for (const a of ['8.8.8.8', '93.184.216.34', '2606:4700:4700::1111']) {
    assert.equal(isPrivateAddress(a), false, a);
  }
});

test('fetchPublic refuses a private address before connecting', async () => {
  for (const url of ['http://127.0.0.1:1/', 'http://169.254.169.254/latest/meta-data/', 'http://[::ffff:7f00:1]/', 'file:///etc/passwd']) {
    await assert.rejects(fetchPublic(url), /not a public web page/, url);
  }
});
