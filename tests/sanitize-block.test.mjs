import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeBlockHtml } from '../src/lib/security/sanitizeBlockHtml.ts';

test('script, iframe, form and object are removed with their content', () => {
  const out = sanitizeBlockHtml('<div>ok<script>alert(1)</script><iframe src="https://evil.example"></iframe><form action="https://x"><input name=a></form><object data="x"></object></div>');
  assert.match(out, /ok/);
  for (const bad of ['<script', 'alert(1)', '<iframe', '<form', '<input', '<object', 'evil.example']) {
    assert.ok(!out.includes(bad), bad);
  }
});

test('event handlers are dropped, whatever their name', () => {
  const out = sanitizeBlockHtml('<img src="https://a.example/x.png" onerror="alert(1)"><div onclick="steal()" onmouseover="x()">hi</div><a href="https://a.example" onmouseenter="y()">link</a>');
  assert.ok(!/onerror|onclick|onmouseover|onmouseenter/i.test(out));
  assert.ok(out.includes('hi'));
});

test('javascript:, vbscript: and data: links are removed; https and mailto links stay', () => {
  const bad = sanitizeBlockHtml('<a href="javascript:alert(1)">x</a><a href="vbscript:msgbox">y</a><a href="data:text/html,<script>1</script>">z</a>');
  assert.ok(!/javascript:|vbscript:|data:text/i.test(bad));
  const good = sanitizeBlockHtml('<a href="https://example.org/p">ok</a><a href="mailto:a@b.co">mail</a>');
  assert.ok(good.includes('https://example.org/p'));
  assert.ok(good.includes('mailto:a@b.co'));
});

test('links opened in a new tab cannot reach the page that opened them', () => {
  const out = sanitizeBlockHtml('<a href="https://example.org" target="_blank">go</a>');
  assert.match(out, /rel="noopener noreferrer"/);
});

test('images: web and inline image sources stay; script-like sources are removed', () => {
  assert.ok(sanitizeBlockHtml('<img src="https://img.example/a.png" alt="a">').includes('https://img.example/a.png'));
  assert.ok(sanitizeBlockHtml('<img src="data:image/png;base64,iVBORw0KGgo=">').includes('data:image/png'));
  const bad = sanitizeBlockHtml('<img src="javascript:alert(1)"><img src="data:text/html,<script>x</script>">');
  assert.ok(!/javascript:|data:text/i.test(bad));
});

test('style attributes cannot load anything: url(), image-set(), expression() and @import are removed', () => {
  const out = sanitizeBlockHtml('<div style="background:url(https://track.example/p.gif); color:red; width:expression(alert(1))">x</div><span style="background-image: image-set(\'https://t.example/a.png\' 1x)">y</span>');
  assert.ok(!/url\(|image-set|expression|track\.example/i.test(out));
  assert.ok(out.includes('color:red'));
});

test('ordinary captured layout survives: tables, lists, headings, classes and text', () => {
  const html = '<div class="card" style="padding:14px;color:#0f172a"><h2>Results</h2><table><thead><tr><th colspan="2">Metric</th></tr></thead><tbody><tr><td>Speed</td><td>1.25 m/s</td></tr></tbody></table><ul><li>first</li></ul></div>';
  const out = sanitizeBlockHtml(html);
  for (const keep of ['class="card"', 'padding:14px', '<h2>Results</h2>', '<table>', 'colspan="2"', '1.25 m/s', '<li>first</li>']) {
    assert.ok(out.includes(keep), keep);
  }
});

test('empty and missing input is safe', () => {
  assert.equal(sanitizeBlockHtml(''), '');
  assert.equal(sanitizeBlockHtml(undefined), '');
});
