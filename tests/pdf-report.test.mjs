import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportModel, stripMarkdown } from '../src/lib/export/pdf/pdfReport.ts';
import { DEFAULT_REPORT_OPTIONS } from '../src/lib/export/pdf/types.ts';

const opts = (over = {}) => ({
  ...DEFAULT_REPORT_OPTIONS,
  generatedAt: '2026-10-13T10:00:00.000Z',
  ...over,
  sections: { ...DEFAULT_REPORT_OPTIONS.sections, ...(over.sections ?? {}) },
});
const project = { title: 'Balance study', description: 'Notes on balance' };

const article = (over = {}) => ({
  status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', doi: '10.1/X',
  title: 'A title', authors: [{ family: 'Lee', given: 'Ann' }], journal: 'J Pets', year: 2020,
  volume: '5', pages: '10-20', missingFields: [], ...over,
});

const atom = (id, type, extra = {}) => ({
  id, projectId: 'p', type, title: `T-${id}`, content: {}, metadata: { sourceUrl: '', pageTitle: '' }, ...extra,
});
const withCit = (a, citation) => ({ ...a, metadata: { ...a.metadata, citation } });

test('sections come in fixed order with exact titles; document atoms skipped', () => {
  const atoms = [
    atom('l', 'link', { content: { targetUrl: 'https://x.org' } }),
    atom('i', 'image'),
    atom('b', 'block', { content: { rawText: 'blk' } }),
    atom('t', 'text', { content: { text: 'tx' } }),
    atom('q', 'quote', { content: { rawText: 'qq' } }),
    atom('n', 'note', { content: { description: 'nn' } }),
    atom('d', 'document'),
  ];
  const m = buildReportModel(project, atoms, opts());
  assert.deepEqual(m.sections.map((s) => s.title), [
    'Syntheses & Notes', 'Quotes & Key Excerpts', 'Captured Web Blocks & Tables', 'Visual Captures & Images', 'Bookmarks & Links',
  ]);
  assert.deepEqual(m.sections[1].items.map((i) => i.id), ['t', 'q']); // input order kept
  assert.equal(m.cover.clipCount, 6);
  assert.equal(m.cover.title, 'Balance study');
  assert.equal(m.cover.styleLabel, 'Vancouver');
});

test('empty section is left out, and a switched-off section too', () => {
  const atoms = [atom('n', 'note'), atom('q', 'quote')];
  assert.deepEqual(buildReportModel(project, atoms, opts()).sections.map((s) => s.key), ['syntheses', 'quotes']);
  assert.deepEqual(buildReportModel(project, atoms, opts({ sections: { quotes: false } })).sections.map((s) => s.key), ['syntheses']);
  assert.equal(buildReportModel(project, [], opts()).sections.length, 0);
});

test('stripMarkdown', () => {
  assert.equal(stripMarkdown('# Heading\n\nSome **bold** and *it* and `code` here.'), 'Heading\n\nSome bold and it and code here.');
  assert.equal(stripMarkdown('See [the site](https://a.org/x) now'), 'See the site now');
  assert.equal(stripMarkdown('- one\n* two\n1. three'), '• one\n• two\n• three');
  assert.equal(stripMarkdown('a\n\n\n\nb'), 'a\n\nb');
  assert.equal(stripMarkdown('snake_case_word and __strong__'), 'snake_case_word and strong');
  assert.equal(stripMarkdown(''), '');
});

test('note body prefers markdownContent, then description, then rawText', () => {
  const m = buildReportModel(project, [
    atom('1', 'note', { content: { markdownContent: '## Hi', description: 'd', rawText: 'r' } }),
    atom('2', 'note', { content: { description: 'd', rawText: 'r' } }),
    atom('3', 'note', { content: { rawText: 'r' } }),
  ], opts());
  assert.deepEqual(m.sections[0].items.map((i) => i.body), ['Hi', 'd', 'r']);
});

test('isAi detects the AI tags case-insensitively', () => {
  const m = buildReportModel(project, [
    atom('a', 'note', { tags: ['AI-Generated'] }),
    atom('b', 'note', { tags: ['Doc-Assistant'] }),
    atom('c', 'note', { tags: ['research'] }),
    atom('d', 'note'),
  ], opts());
  assert.deepEqual(m.sections[0].items.map((i) => i.isAi), [true, true, false, false]);
  assert.deepEqual(m.sections[0].items[3].tags, []);
});

test('item fields: source, body per kind, captured time, ocr', () => {
  const m = buildReportModel(project, [
    withCit(atom('q', 'quote', {
      content: { text: 'quoted' }, capturedAt: '2026-01-01T00:00:00Z',
      metadata: { sourceUrl: 'https://www.example.org/a', pageTitle: '', pageNumber: 4 },
    }), undefined),
    atom('i', 'image', { content: { description: 'desc', ocrText: 'ocr' } }),
    atom('l', 'link', { content: { targetUrl: 'https://t.org' } }),
  ], opts());
  const q = m.sections[0].items[0];
  assert.equal(q.body, 'quoted');
  assert.deepEqual(q.source, { label: 'example.org', url: 'https://www.example.org/a', page: 4 });
  assert.equal(q.capturedAt, '2026-01-01T00:00:00Z');
  const img = m.sections[1].items[0];
  assert.equal(img.body, 'desc');
  assert.equal(img.ocrText, 'ocr');
  assert.equal(m.sections[2].items[0].body, 'https://t.org');
});

test('two clips citing the same DOI share one entry and number', () => {
  const m = buildReportModel(project, [
    withCit(atom('a', 'note'), article({ doi: '10.1/X' })),
    withCit(atom('b', 'quote'), article({ doi: '10.1/x' })),
  ], opts());
  assert.equal(m.bibliography.length, 1);
  assert.deepEqual(m.bibliography[0].citedBy, ['a', 'b']);
  assert.equal(m.bibliography[0].href, 'https://doi.org/10.1/X');
  assert.equal(m.sections[0].items[0].citationNumber, 1);
  assert.equal(m.sections[1].items[0].citationNumber, 1);
  assert.equal(m.cover.sourceCount, 1);
});

test('numbering follows section order, not input order', () => {
  const m = buildReportModel(project, [
    withCit(atom('link1', 'link'), article({ doi: '10.1/second', title: 'Second' })),
    withCit(atom('note1', 'note'), article({ doi: '10.1/first', title: 'First' })),
  ], opts());
  assert.equal(m.sections[0].items[0].id, 'note1');
  assert.equal(m.sections[0].items[0].citationNumber, 1);
  assert.equal(m.sections[1].items[0].citationNumber, 2);
  assert.equal(m.bibliography[0].number, 1);
  assert.deepEqual(m.bibliography[0].citedBy, ['note1']);
});

test('dedupe falls back to PMID, URL and normalised title', () => {
  const web = (url, title) => ({ status: 'page_tags', sourceType: 'web_page', resolvedFrom: 'page_tags', authors: [], title, url, missingFields: [] });
  const m = buildReportModel(project, [
    withCit(atom('1', 'note'), article({ doi: undefined, pmid: '123' })),
    withCit(atom('2', 'note'), article({ doi: undefined, pmid: '123' })),
    withCit(atom('3', 'note'), web('https://a.org/p', 'Page')),
    withCit(atom('4', 'note'), web('https://a.org/p', 'Page again')),
    withCit(atom('5', 'note'), { ...article({ doi: undefined }), title: 'Same Title!' }),
    withCit(atom('6', 'note'), { ...article({ doi: undefined }), title: 'same title' }),
  ], opts());
  assert.equal(m.bibliography.length, 3);
  assert.equal(m.bibliography[1].status, 'web');
  assert.equal(m.bibliography[1].href, 'https://a.org/p');
});

test('the three citation styles give different text for one record', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ family: `Auth${i}`, given: 'Al' }));
  const atoms = [withCit(atom('a', 'note'), article({ authors: many }))];
  const texts = ['line', 'apa', 'ama'].map((citationStyle) => buildReportModel(project, atoms, opts({ citationStyle })).bibliography[0].text);
  assert.equal(new Set(texts).size, 3);
  assert.equal(buildReportModel(project, atoms, opts({ citationStyle: 'apa' })).cover.styleLabel, 'APA 7');
});

test('status mapping', () => {
  const st = (rec) => buildReportModel(project, [withCit(atom('a', 'note'), rec)], opts()).bibliography[0].status;
  assert.equal(st(article({ status: 'verified_pmid' })), 'verified');
  assert.equal(st(article({ status: 'page_tags', resolvedFrom: 'page_tags' })), 'web');
  assert.equal(st(article({ status: 'manual', resolvedFrom: 'manual' })), 'manual');
  assert.equal(st(article({ status: 'unreachable' })), 'unchecked');
  assert.equal(st(article({ status: 'incomplete', resolvedFrom: 'pubmed' })), 'verified');
  assert.equal(st(article({ status: 'incomplete', resolvedFrom: 'manual' })), 'manual');
});

test('flags: retracted, mismatch warning, unreachable; copied onto citing items', () => {
  const m = buildReportModel(project, [
    withCit(atom('r', 'note'), article({ doi: '10.1/r', retracted: true })),
    withCit(atom('w', 'note'), article({ doi: '10.1/w', confidence: { warnings: ['Title differs.', 'Other.'], notes: [] } })),
    withCit(atom('u', 'note'), article({ doi: '10.1/u', status: 'unreachable' })),
  ], opts());
  const [r, w, u] = m.bibliography;
  assert.deepEqual(r.flags.map((f) => f.kind), ['retracted']);
  assert.match(r.flags[0].text, /retracted/);
  assert.deepEqual(w.flags, [{ kind: 'verify', text: 'This might not be the source. Please verify. Title differs.' }]);
  assert.deepEqual(u.flags, [{ kind: 'unchecked', text: 'The source could not be checked.' }]);
  assert.deepEqual(m.sections[0].items[1].flags, w.flags);
});

test('includeFlags false gives no flags anywhere', () => {
  const m = buildReportModel(project, [
    withCit(atom('r', 'note'), article({ retracted: true, status: 'unreachable', confidence: { warnings: ['x'], notes: [] } })),
  ], opts({ includeFlags: false }));
  assert.deepEqual(m.bibliography[0].flags, []);
  assert.deepEqual(m.sections[0].items[0].flags, []);
});

test('includeNotes controls user notes', () => {
  const atoms = [atom('a', 'note', { userNotes: 'mine' }), atom('b', 'note', { user_notes: 'snake' }), atom('c', 'note', { userNotes: '' })];
  const on = buildReportModel(project, atoms, opts()).sections[0].items;
  assert.deepEqual(on.map((i) => i.notes), ['mine', 'snake', undefined]);
  const off = buildReportModel(project, atoms, opts({ includeNotes: false })).sections[0].items;
  assert.deepEqual(off.map((i) => i.notes), [undefined, undefined, undefined]);
});

test('includeImages false drops imageUrl but keeps OCR text', () => {
  const atoms = [atom('i', 'image', { content: { imageUrl: 'data:image/png;base64,AAA', ocrText: 'hello' } })];
  assert.equal(buildReportModel(project, atoms, opts()).sections[0].items[0].imageUrl, 'data:image/png;base64,AAA');
  const off = buildReportModel(project, atoms, opts({ includeImages: false })).sections[0].items[0];
  assert.equal(off.imageUrl, undefined);
  assert.equal(off.ocrText, 'hello');
});

test('bibliography off: no entries and no citationNumber', () => {
  const m = buildReportModel(project, [withCit(atom('a', 'note'), article())], opts({ sections: { bibliography: false } }));
  assert.deepEqual(m.bibliography, []);
  assert.equal(m.sections[0].items[0].citationNumber, undefined);
  assert.equal(m.cover.sourceCount, 0);
});

test('deepLink: explicit wins, else built from http(s) source and fragment', () => {
  const mk = (id, metadata) => atom(id, 'quote', { metadata: { pageTitle: 'P', ...metadata } });
  const items = buildReportModel(project, [
    mk('a', { sourceUrl: 'https://a.org/x#old', scrollToTextFragment: '#:~:text=foo' }),
    mk('b', { sourceUrl: 'https://a.org/x', textFragment: ':~:text=bar' }),
    mk('c', { sourceUrl: 'https://a.org/x', deepLink: 'https://a.org/x#:~:text=zzz', textFragment: '#:~:text=bar' }),
    mk('d', { sourceUrl: 'chrome://x', textFragment: '#:~:text=bar' }),
    mk('e', { sourceUrl: 'https://a.org/x' }),
  ], opts()).sections[0].items;
  assert.deepEqual(items.map((i) => i.deepLink), [
    'https://a.org/x#:~:text=foo', 'https://a.org/x#:~:text=bar', 'https://a.org/x#:~:text=zzz', undefined, undefined,
  ]);
  assert.equal(items[3].source?.url, undefined);
});

test('odd data does not throw', () => {
  const odd = [
    { id: 'x', type: 'note' },
    { id: 'y', type: 'quote', content: null, metadata: null, tags: null },
    atom('z', 'link', { metadata: { citation: { nonsense: true } } }),
    null,
    withCit(atom('w', 'image'), 'not a record'),
  ];
  const m = buildReportModel({ title: 'T' }, odd, opts());
  assert.equal(m.cover.description, '');
  assert.equal(m.cover.clipCount, 4);
  assert.equal(m.bibliography.length, 0);
  assert.equal(m.sections[0].items[0].title, 'Research Note');
  assert.doesNotThrow(() => buildReportModel({ title: 'T' }, [], opts()));
});
