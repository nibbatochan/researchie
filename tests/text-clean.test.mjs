import test from 'node:test';
import assert from 'node:assert/strict';
import { unwrapPdfLines } from '../src/lib/utils/pdfText.ts';
import { stripLinks } from '../src/lib/utils/plainText.ts';

test('wrapped PDF lines join into one paragraph', () => {
  const copied = 'Standing and walking are two fundamental\nmotor behaviors in human daily life. Both\nrequire sophisticated control.';
  assert.equal(unwrapPdfLines(copied), 'Standing and walking are two fundamental motor behaviors in human daily life. Both require sophisticated control.');
});

test('a blank line stays a paragraph break', () => {
  assert.equal(unwrapPdfLines('First line\nsecond line.\n\nNext paragraph\nwraps here.'), 'First line second line.\n\nNext paragraph wraps here.');
});

test('a word split by a hyphen at a line end is joined; a real hyphen before a capital stays', () => {
  assert.equal(unwrapPdfLines('the stabili-\nzation model and Gaussian-\nProcess fits'), 'the stabilization model and Gaussian- Process fits');
});

test('windows line ends and soft hyphens are handled; empty text stays empty', () => {
  assert.equal(unwrapPdfLines('a\r\nb\u00ADc\r\n\r\nd'), 'a bc\n\nd');
  assert.equal(unwrapPdfLines(''), '');
});

test('links are removed with their words kept', () => {
  const md = 'See [the study](https://example.org/a) and [Page 5](#cite-page-5). More at https://x.test/y now.';
  assert.equal(stripLinks(md), 'See the study and Page 5. More at now.');
  assert.equal(stripLinks('Plain text'), 'Plain text');
});
