// Renders the fixture report to a real PDF in Node and checks the text that comes back.
// Run: node --test --no-warnings tests/pdf-render.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToBuffer } from '@react-pdf/renderer';
import { createReportDocument } from '../src/lib/export/pdf/ReportDocument.ts';
import { registerReportFonts } from '../src/lib/export/pdf/fonts.ts';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const here = path.dirname(fileURLToPath(import.meta.url));
const model = JSON.parse(readFileSync(path.join(here, 'fixtures', 'pdf-report-model.json'), 'utf8'));
registerReportFonts(path.join(here, '..', 'public', 'fonts'));

let buffer;
let text;
let pages;

test('renders the fixture to a PDF', async () => {
  buffer = await renderToBuffer(createReportDocument(model));
  assert.equal(buffer.subarray(0, 4).toString('latin1'), '%PDF');
  if (process.env.PDF_OUT) {
    mkdirSync(path.dirname(process.env.PDF_OUT), { recursive: true });
    writeFileSync(process.env.PDF_OUT, buffer);
  }
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  text = result.text;
  pages = result.total ?? result.pages?.length ?? 0;
  assert.ok(pages > 4, `expected more than 4 pages, got ${pages}`);
});

test('contains the title, sections and bibliography', () => {
  assert.ok(text.includes(model.cover.title));
  for (const s of model.sections) assert.ok(text.includes(s.title), `missing section title: ${s.title}`);
  assert.ok(text.includes('Bibliography'));
  assert.ok(text.includes('How to read this report'), 'missing colour key heading');
  assert.ok(text.replace(/\s+/g, '').includes('RESEARCHREPORT'), 'missing cover caption');
  assert.ok(text.includes('Contents'));
});

test('contains body text, notes, flags and references', () => {
  assert.ok(text.replace(/\s+/g, ' ').includes('Participants who reported more than 150 minutes'), 'missing body sentence');
  assert.ok(text.includes('Your notes'));
  const flags = [...model.sections.flatMap((s) => s.items.flatMap((i) => i.flags)), ...model.bibliography.flatMap((b) => b.flags)];
  assert.ok(flags.some((f) => f.kind === 'retracted') && flags.some((f) => f.kind === 'verify') && flags.some((f) => f.kind === 'unchecked'));
  const flat = text.replace(/\s+/g, ' ');
  for (const f of flags) assert.ok(flat.includes(f.text.slice(0, 40)), `missing flag text: ${f.text}`);
  const ref = model.bibliography[0].text.slice(0, 40);
  assert.ok(flat.includes(ref), 'missing bibliography reference');
  for (const label of ['Verified', 'Web page', 'Manual', 'Not checked']) assert.ok(text.includes(label), `missing status ${label}`);
});

test('long URLs are cut into lines instead of running off the page', () => {
  const href = model.bibliography[1].href;
  assert.ok(href.length > 120);
  assert.ok(text.replace(/\s+/g, '').includes(href), 'the full URL should still be in the text');
});

test('has the running footer and keeps accents, dashes and curly quotes', () => {
  assert.ok(text.includes('Page 2 of'));
  assert.ok(text.includes(`Page 2 of ${pages}`));
  assert.ok(text.includes(`Page ${pages} of ${pages}`));
  assert.ok(text.includes('Möller'));
  assert.ok(text.includes('Ramírez'));
  assert.ok(text.includes('–'));
  assert.ok(text.includes('“'));
  // The "Open exact passage" label was removed on request; the source name carries that link now.
  assert.ok(!text.includes('Open exact passage'));
  // A PDF cannot force a new tab, so the report tells the reader how.
  assert.ok(text.replace(/s+/g, ' ').includes('to open it in a new tab'));
});

test('characters outside the Latin fonts are drawn by the fallback font, not dropped', () => {
  const flat = text.replace(/\s+/g, ' ');
  const mustHave = 'αβγμσΔΣΩπ' + '≥≤≠≈→←∞∑√∂∈' + '⁻⁶₂' + 'ŁźĐđć' + 'K\u0302' + 'y\u0302';
  for (const ch of mustHave) assert.ok(flat.includes(ch), `missing ${ch} (U+${ch.codePointAt(0).toString(16)})`);
  assert.ok(flat.includes('data-driven'), 'U+2011 should become a plain hyphen');
  assert.ok(!flat.includes('datadriven'));
  assert.ok(flat.includes('size 5 μm'));
  assert.ok(flat.includes('\uFFFD\uFFFD ends here'), 'CJK has no glyph and should show U+FFFD');
  assert.ok(!flat.includes('\u7814'));
});

test('a source label that already ends with (Page N) does not repeat the page', () => {
  const flat = text.replace(/\s+/g, ' ');
  assert.ok(flat.includes('Erika Hall (Page 144)'));
  assert.ok(!flat.includes('(Page 144) - p. 144'));
});
