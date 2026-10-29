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

import { siteOrigin } from '../src/lib/auth/redirect.ts';

test('email links use the configured site address, else the request origin', () => {
  assert.equal(siteOrigin('https://app.example.com/some/path', 'https://evil.example'), 'https://app.example.com');
  assert.equal(siteOrigin(undefined, 'https://app.example.com'), 'https://app.example.com');
  assert.equal(siteOrigin('javascript:alert(1)', 'https://app.example.com'), 'https://app.example.com');
  assert.equal(siteOrigin('not a url', 'https://app.example.com'), 'https://app.example.com');
});

import { sanitizeBlockHtml } from '../src/lib/security/sanitizeBlockHtml.ts';
import { jsonForScript, buildIsolatedBlockDoc } from '../src/lib/utils/htmlBlockNormalizer.ts';
import { parseImageDataUrl } from '../src/lib/storage/imageData.ts';
import { publicAtom } from '../src/lib/data/sharing.ts';
import { SECURITY_HEADERS } from '../src/lib/security/headers.ts';

const BS = String.fromCharCode(92);

test('sanitizer: css escapes, positioning and srcset are removed; normal text styling stays', () => {
  const escaped = sanitizeBlockHtml(`<div style="background:${BS}75rl(https://evil.example/p.png)">x</div>`);
  assert.ok(!escaped.includes('evil.example') && !escaped.includes(BS), escaped);
  const overlay = sanitizeBlockHtml('<div style="position:fixed;inset:0;z-index:2147483647;color:red">x</div>');
  assert.ok(!/position|z-index|inset/.test(overlay), overlay);
  assert.ok(overlay.includes('color:red'), overlay);
  const img = sanitizeBlockHtml('<img src="https://ok.example/a.png" srcset="https://evil.example/t.gif 1x">');
  assert.ok(!img.includes('srcset') && !img.includes('evil.example'), img);
  const kept = sanitizeBlockHtml('<div style="padding:14px;color:#0f172a;text-align:center">x</div>');
  assert.ok(kept.includes('padding:14px') && kept.includes('color:#0f172a') && kept.includes('text-align:center'), kept);
});

test('a search word cannot end the highlight script block', () => {
  const json = jsonForScript('</script><img src=x onerror=alert(1)>');
  assert.ok(!json.includes('<') && !json.includes('>'), json);
  assert.equal(JSON.parse(json), '</script><img src=x onerror=alert(1)>');
  const doc = buildIsolatedBlockDoc({ sanitizedHtml: '<p>hello</p>', searchQuery: '</script><b>x</b>' });
  assert.equal((doc.match(/<\/script>/g) ?? []).length, 1, 'only the real end tag');
});

test('only small raster images are uploaded to the public bucket', () => {
  const png = 'data:image/png;base64,' + 'A'.repeat(100);
  assert.equal(parseImageDataUrl(png)?.contentType, 'image/png');
  assert.equal(parseImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), null);
  assert.equal(parseImageDataUrl('data:text/html;base64,PGh0bWw+'), null);
  assert.equal(parseImageDataUrl('https://example.com/' + 'a'.repeat(600)), null);
  assert.equal(parseImageDataUrl('data:image/png;base64,' + 'A'.repeat(6_000_000)), null);
  assert.equal(parseImageDataUrl(undefined), null);
});

test('a view link hides private notes, account ids and unlisted metadata', () => {
  const shown = publicAtom({
    id: 'a1', projectId: 'p1', userId: 'user-secret', type: 'quote', title: 't', content: { text: 'hi' },
    metadata: { sourceUrl: 'https://s.example', internalFlag: 'private', pinned: true }, tags: ['x'], userNotes: 'my private thought', capturedAt: 'now',
  });
  assert.equal(shown.userNotes, '');
  assert.equal(shown.userId, '');
  assert.deepEqual(shown.metadata, { sourceUrl: 'https://s.example', pinned: true });
  assert.equal(shown.content.text, 'hi');
});

test('every response can be set to refuse framing and type guessing', () => {
  assert.equal(SECURITY_HEADERS['X-Frame-Options'], 'DENY');
  assert.match(SECURITY_HEADERS['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(SECURITY_HEADERS['X-Content-Type-Options'], 'nosniff');
});

import { httpUrlOnly, isPlainId } from '../src/lib/security/inputChecks.ts';

test('record ids and source links from a client are checked before they are stored', () => {
  assert.equal(isPlainId('atom-1a2b3c4d5e6f7a8b'), true);
  assert.equal(isPlainId('"><img src=x onerror=alert(1)>'), false);
  assert.equal(isPlainId(''), false);
  assert.equal(isPlainId('a'.repeat(101)), false);
  assert.equal(isPlainId(42), false);
  assert.equal(httpUrlOnly('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(httpUrlOnly('http://localhost:3001/x'), 'http://localhost:3001/x');
  for (const bad of ['javascript:alert(1)', 'data:text/html,<b>x', 'file:///etc/passwd', 'not a url', '', undefined, null, 5]) {
    assert.equal(httpUrlOnly(bad), undefined, String(bad));
  }
});
