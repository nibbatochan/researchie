import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicHttpUrl } from '../src/lib/security/publicUrl.ts';

test('ordinary public pages pass', () => {
  for (const u of ['https://example.org/a?b=1', 'http://news.bbc.co.uk/x', 'https://8.8.8.8/', 'https://172.32.0.1/', 'https://sub.domain.example.com:8443/p']) {
    assert.equal(isPublicHttpUrl(u), true, u);
  }
});

test('local and private addresses are refused', () => {
  for (const u of [
    'http://localhost:3001/api/atoms',
    'http://foo.localhost/',
    'http://127.0.0.1/',
    'http://10.0.0.5/',
    'http://172.16.4.4/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/',
    'http://0.0.0.0/',
    'http://[::1]/',
    'http://[fd00::1]/',
    'http://[fe80::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://2130706433/',
    'http://0x7f000001/',
    'http://printer.local/',
    'http://db.internal/',
    'http://user:pw@example.org/',
    'file:///etc/passwd',
    'ftp://example.org/',
    'javascript:alert(1)',
    'not a url',
    '',
  ]) {
    assert.equal(isPublicHttpUrl(u), false, u);
  }
});
