// Run: node --test --no-warnings tests/print-doc.test.mjs
// The page printed for the PDF export: it must always carry the "preview only" note. Pure.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrintDocument, escapeHtml, PREVIEW_ONLY_NOTE } from '../src/lib/paper/printDoc.ts';

const build = (over = {}) => buildPrintDocument({ title: 'Sleep & recall', articleHtml: '<article class="paper-article">Body</article>', headHtml: '<style>.x{}</style>', columns: 1, ...over });

test('the printed page always carries the preview-only note, drawn by the page itself', () => {
  const html = build();
  assert.ok(html.includes(escapeHtml(PREVIEW_ONLY_NOTE)));
  assert.match(html, /\.print-footer \{ position: fixed;/);
  assert.match(html, /<div class="print-footer" data-testid="print-note">/);
});

test('room is kept for the footer on every sheet with a table footer', () => {
  const html = build();
  assert.match(html, /<tfoot><tr><td><div class="space-bottom"><\/div><\/td><\/tr><\/tfoot>/);
});

test('the title is escaped and becomes the document title; an empty title falls back', () => {
  assert.match(build(), /<title>Sleep &amp; recall<\/title>/);
  assert.match(build({ title: '<script>alert(1)</script>' }), /<title>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/title>/);
  assert.match(build({ title: '   ' }), /<title>Paper preview<\/title>/);
});

test('the app styles and the article are included, in that order, and the columns are recorded', () => {
  const html = build({ columns: 2 });
  assert.ok(html.indexOf('<style>.x{}</style>') < html.indexOf('<article'));
  assert.match(html, /data-columns="2"/);
  assert.match(html, /\.paper-body\.paper-two-col \{ column-count: 2;/);
});

test('page numbers use the page margin boxes, but the note does not depend on them', () => {
  const html = build();
  assert.match(html, /@bottom-right \{ content: "Page " counter\(page\)/);
  assert.ok(!/@bottom-left/.test(html));
});

test('the printed page is white, whatever the app background is', () => {
  const html = build();
  assert.match(html, /html, body \{ margin: 0; background: #fff !important;/);
  assert.match(html, /article\.paper-article \{ background: #fff !important;/);
});
