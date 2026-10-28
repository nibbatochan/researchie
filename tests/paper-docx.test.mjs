// Run: node --test --no-warnings tests/paper-docx.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { markdownBody, markdownToDocx, paperToDocx } from '../src/lib/paper/docx.ts';
import { getTemplate } from '../src/lib/paper/templates.ts';
import { defaultMeta, citableNodes, collectCitations } from '../src/lib/paper/docModel.ts';
import { computeMarkers } from '../src/lib/paper/markers.ts';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const partOf = async (bytes, name) => JSZip.loadAsync(bytes).then((z) => z.file(name)?.async('string'));
/** The text of each paragraph, its runs joined, so text split across runs still reads as one line. */
const paraTexts = (xml) => [...xml.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g)].map((m) => [...m[1].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join('').replace(/&amp;/g, '&').replace(/&quot;/g, '"'));

const xmlOf = (bytes) => partOf(bytes, 'word/document.xml');

test('headings use Word heading styles, bold and italic become runs, lists use real numbering', () => {
  const xml = markdownBody('## Methods\n\n### Sub\n\nA **bold** and *slanted* word.\n\n- first\n  - nested\n1. one\n2. two\n\n> A quote [@smith2020]\n\n---');
  assert.match(xml, /<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t xml:space="preserve">Methods/);
  assert.match(xml, /<w:pStyle w:val="Heading2"\/>/);
  assert.match(xml, /<w:rPr><w:b\/><\/w:rPr><w:t xml:space="preserve">bold/);
  assert.match(xml, /<w:rPr><w:i\/><\/w:rPr><w:t xml:space="preserve">slanted/);
  assert.match(xml, /<w:numPr><w:ilvl w:val="0"\/><w:numId w:val="1"\/><\/w:numPr><\/w:pPr><w:r><w:t xml:space="preserve">first/);
  assert.match(xml, /<w:numPr><w:ilvl w:val="1"\/><w:numId w:val="1"\/><\/w:numPr>/);
  assert.match(xml, /<w:numId w:val="2"\/><\/w:numPr><\/w:pPr><w:r><w:t xml:space="preserve">one/);
  assert.doesNotMatch(xml, /•/);
  assert.doesNotMatch(xml, /<w:ind /); // the quote has no indent
  assert.match(xml, /A quote \[@smith2020\]/);
  assert.match(xml, /w:type="page"/);
});

test('each numbered list restarts at 1 with its own num', async () => {
  const bytes = await markdownToDocx('1. a\n2. b\n\nText\n\n1. c');
  const xml = await xmlOf(bytes);
  assert.match(xml, /<w:numId w:val="2"\/>[^]*<w:numId w:val="3"\/>/);
  const numbering = await partOf(bytes, 'word/numbering.xml');
  assert.match(numbering, /<w:num w:numId="2">[^]*<w:startOverride w:val="1"\/>/);
  assert.match(numbering, /<w:num w:numId="3">/);
  assert.match(numbering, /<w:numFmt w:val="decimal"\/>/);
  assert.match(numbering, /<w:numFmt w:val="bullet"\/>/);
});

test('a pipe table keeps its rows, drops the separator and uses the three-line style', () => {
  const xml = markdownBody('| Name | Score |\n| --- | --- |\n| Ana | 4 |\n| Ben | 5 |');
  assert.equal((xml.match(/<w:tr>/g) || []).length, 3);
  assert.doesNotMatch(xml, /---/);
  assert.match(xml, />Ben</);
  assert.match(xml, /<w:top w:val="single" w:sz="6"/);
  assert.match(xml, /<w:left w:val="nil"\/>/);
  assert.match(xml, /<w:insideH w:val="single" w:sz="4"/);
  assert.match(xml, /<w:tcBorders><w:bottom w:val="single" w:sz="6"/);
  assert.match(xml, /w:pStyle w:val="TableText"/);
});

test('a table caption sits right under the table in the Caption style', () => {
  const xml = markdownBody('| A |\n| --- |\n| 1 |\n\n*Table: Scores by group*');
  assert.match(xml, /<\/w:tbl><w:p><w:pPr><w:pStyle w:val="Caption"\/><\/w:pPr><w:r><w:t xml:space="preserve">Table: Scores by group/);
});

test('text is escaped, so a stray < or & cannot break the XML', () => {
  const xml = markdownBody('Tom & Jerry <3');
  assert.match(xml, /Tom &amp; Jerry &lt;3/);
});

test('sup and sub tags become raised and lowered runs', () => {
  const xml = markdownBody('H<sub>2</sub>O and x<sup>2</sup>');
  assert.match(xml, /<w:vertAlign w:val="subscript"\/>/);
  assert.match(xml, /<w:vertAlign w:val="superscript"\/>/);
  assert.doesNotMatch(xml, /&lt;sup/);
});

test('the file is a zip with styles, numbering and relationships; defaults are Arial 10 pt, line 1.4, justified, A4', async () => {
  const bytes = await markdownToDocx('# Title\n\nHello world.\n');
  const zip = await JSZip.loadAsync(bytes);
  for (const f of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels', 'word/styles.xml', 'word/numbering.xml']) assert.ok(zip.file(f), f);
  const xml = await xmlOf(bytes);
  assert.match(xml, /Hello world\./);
  assert.match(xml, /<w:pStyle w:val="Title"\/>/);
  assert.match(xml, /<w:pgSz w:w="11906" w:h="16838"\/>/);
  assert.match(xml, /<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/);
  const styles = await partOf(bytes, 'word/styles.xml');
  assert.match(styles, /<w:rFonts w:ascii="Arial"/);
  assert.match(styles, /<w:sz w:val="20"\/>/);
  assert.match(styles, /<w:spacing w:after="120" w:line="336" w:lineRule="auto"\/>/);
  assert.match(styles, /w:styleId="Normal"><w:name w:val="Normal"\/><w:qFormat\/><w:pPr><w:jc w:val="both"\/>/);
  const ct = await partOf(bytes, '[Content_Types].xml');
  assert.match(ct, /styles\+xml/);
  assert.match(ct, /numbering\+xml/);
  const rels = await partOf(bytes, 'word/_rels/document.xml.rels');
  assert.match(rels, /relationships\/styles"/);
  assert.match(rels, /relationships\/numbering"/);
});

test('styles: title 16 pt centred, headings 11 / 10 / 10 pt with outline levels, caption and reference 8 pt, hanging 1.6 em', async () => {
  const styles = await partOf(await markdownToDocx('x'), 'word/styles.xml');
  const style = (id) => styles.match(new RegExp(`w:styleId="${id}">[^]*?</w:style>`))[0];
  assert.match(style('Title'), /<w:jc w:val="center"\/>[^]*<w:b\/><w:sz w:val="32"\/>/);
  assert.match(style('Heading1'), /<w:outlineLvl w:val="0"\/>[^]*<w:sz w:val="22"\/>/);
  assert.match(style('Heading1'), /w:before="280" w:after="80"/);
  assert.match(style('Heading2'), /<w:outlineLvl w:val="1"\/>[^]*<w:sz w:val="20"\/>/);
  assert.match(style('Heading3'), /<w:outlineLvl w:val="2"\/>[^]*<w:b\/><w:i\/>/);
  assert.match(style('AbstractHeading'), /<w:sz w:val="28"\/>/);
  assert.match(style('Caption'), /<w:sz w:val="16"\/>/);
  assert.match(style('Reference'), /<w:ind w:left="256" w:hanging="256"\/>[^]*<w:sz w:val="16"\/>/);
  assert.match(style('Heading1'), /<w:basedOn w:val="Normal"\/>/);
});

// ── a whole paper ──

const sec = (title, ...blocks) => ({ type: 'section', attrs: { id: title }, content: [{ type: 'sectionHeading', content: [{ type: 'text', text: title }] }, ...blocks] });
const p = (...inline) => ({ type: 'paragraph', content: inline });
const t = (text) => ({ type: 'text', text });
const cite = (keys, locator = null) => ({ type: 'citation', attrs: { keys, locator } });
const author = (name, over = {}) => ({ id: name, name, affiliationIds: [], orcid: '', email: '', corresponding: false, ...over });
const rec = (over = {}) => ({
  status: 'verified_doi', sourceType: 'journal_article', resolvedFrom: 'crossref', missingFields: [],
  title: 'Sleep and memory in adults', journal: 'Journal of Examples', volume: '12', issue: '3', pages: '45-67', year: 2020,
  doi: '10.1000/xyz', authors: [{ family: 'Lee', given: 'Jane Alice' }, { family: 'Patel', given: 'Raj' }], ...over,
});
const info = (id, over) => ({ id, record: rec(over) });

function paper(style) {
  const meta = defaultMeta(getTemplate('imrad'), 'Sleep study');
  meta.front.authors = [author('Jane Lee', { affiliationIds: ['a1'], corresponding: true, email: 'jane@example.org' })];
  meta.front.affiliations = [{ id: 'a1', name: 'Example University', city: 'Leeds', country: 'UK' }];
  meta.front.abstract = { text: 'Short summary.' };
  meta.front.keywords = ['sleep', 'memory'];
  meta.cites = { lee2020: 'clip1', kim2021: 'clip2' };
  const pm = {
    type: 'doc',
    content: [
      sec('Introduction', p(t('Sleep matters '), cite(['lee2020']), t(' and more '), cite(['kim2021'], '14'), t('.')),
        { type: 'quote', attrs: { clipId: 'clip1', page: '5' }, content: [t('Sleep is key')] }),
    ],
  };
  const sources = { clips: new Map([['clip1', info('clip1')], ['clip2', info('clip2', { title: 'Other work', year: 2021, authors: [{ family: 'Kim', given: 'Sol' }], doi: '10.1000/abc' })]]), manual: [] };
  return { pm, meta, rendered: computeMarkers(pm, meta.cites, sources, style, meta.listed) };
}

test('citations show the style markers and the list comes from the formatter, never [@key]', async () => {
  for (const style of ['apa', 'ieee', 'vancouver', 'ama']) {
    const { pm, meta, rendered } = paper(style);
    const xml = await xmlOf(await paperToDocx(pm, meta, rendered));
    assert.doesNotMatch(xml, /\[@|\[\?\]/, style);
    const [m1, m2, m3] = rendered.markers;
    assert.ok(m1 && m2 && m3, style);
    const texts = paraTexts(xml);
    assert.ok(texts.includes(`Sleep matters ${m1} and more ${m2}.`), `${style}: ${m1} / ${m2}`);
    assert.ok(texts.includes(`“Sleep is key” ${m3}`), `${style} quote`);
    assert.equal(rendered.references.length, 2);
    for (const r of rendered.references) assert.ok(xml.includes(esc(r.label ? `${r.label} ${r.text}` : r.text)), `${style}: ${r.text}`);
    assert.doesNotMatch(xml, /- \[@/);
  }
});

test('APA example: author-date marker and a hanging reference entry', async () => {
  const { pm, meta, rendered } = paper('apa');
  const xml = await xmlOf(await paperToDocx(pm, meta, rendered));
  assert.match(xml, /\(Lee &amp; Patel, 2020\)/);
  assert.match(xml, /<w:pStyle w:val="Reference"\/>/);
  assert.match(xml, /<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t xml:space="preserve">References/);
});

test('front matter: title, authors with affiliation numbers, affiliation, abstract and keywords; no Markdown title leaks', async () => {
  const { pm, meta, rendered } = paper('apa');
  const xml = await xmlOf(await paperToDocx(pm, meta, rendered));
  assert.match(xml, /<w:pStyle w:val="Title"\/><\/w:pPr><w:r><w:t xml:space="preserve">Sleep study/);
  assert.match(xml, /<w:pStyle w:val="Authors"\/>[^]*Jane Lee/);
  assert.match(xml, /<w:pStyle w:val="Affiliation"\/>[^]*Example University, Leeds, UK/);
  assert.match(xml, /\* jane@example\.org/);
  assert.match(xml, /<w:pStyle w:val="AbstractHeading"\/>[^]*Abstract/);
  assert.match(xml, /Short summary\./);
  assert.match(xml, /Keywords: [^]*sleep, memory/);
  assert.equal((xml.match(/Sleep study/g) || []).length, 1);
  assert.match(xml, /<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t xml:space="preserve">Introduction/);
});

test('page size, margin, columns, font and numbering start come from the meta', async () => {
  const { pm, meta, rendered } = paper('apa');
  meta.page = { ...meta.page, size: 'letter', margin: 'narrow', columns: 2, font: 'serif', startAt: 3 };
  const bytes = await paperToDocx(pm, meta, rendered);
  const xml = await xmlOf(bytes);
  assert.match(xml, /<w:pgSz w:w="12240" w:h="15840"\/>/);
  assert.match(xml, /<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/);
  assert.match(xml, /<w:pgNumType w:start="3"\/>/);
  // three sections: front on one column, body on two, end matter on one
  assert.equal((xml.match(/<w:sectPr>/g) || []).length, 3);
  assert.match(xml, /<w:cols w:num="1" w:space="475"\/>[^]*<w:type w:val="continuous"\/>[^]*<w:cols w:num="2" w:space="475"\/>[^]*<w:cols w:num="1" w:space="475"\/>/);
  assert.match(await partOf(bytes, 'word/styles.xml'), /<w:rFonts w:ascii="Georgia"/);
  meta.page.margin = 'normal';
  meta.page.marginPx = 120;
  assert.match(await xmlOf(await paperToDocx(pm, meta, rendered)), /<w:pgMar w:top="1800"/);
});

test('footer and header: tokens, page fields, no first-page header when different first page is on', async () => {
  const { pm, meta, rendered } = paper('apa');
  meta.page.footer = { left: '', center: 'Page {page} of {pages}', right: '' };
  meta.page.header = { left: '{shortTitle}', center: '', right: '{author}' };
  meta.page.differentFirstPage = true;
  const bytes = await paperToDocx(pm, meta, rendered);
  const footer = await partOf(bytes, 'word/footer1.xml');
  assert.match(footer, /w:instr=" PAGE "/);
  assert.match(footer, /w:instr=" NUMPAGES "/);
  assert.match(footer, /Page /);
  const header = await partOf(bytes, 'word/header1.xml');
  assert.match(header, /Sleep study/);
  assert.match(header, /Lee/);
  const xml = await xmlOf(bytes);
  assert.match(xml, /<w:headerReference w:type="default" r:id="rIdHeader"\/><w:footerReference w:type="default" r:id="rIdFooter"\/>/);
  assert.match(xml, /<w:titlePg\/>/);
  assert.match(await partOf(bytes, 'word/_rels/document.xml.rels'), /header1\.xml/);
  assert.match(await partOf(bytes, '[Content_Types].xml'), /footer\+xml/);
  // an empty footer writes no footer part
  meta.page.footer = { left: '', center: '', right: '' };
  meta.page.header = { left: '', center: '', right: '' };
  const none = await JSZip.loadAsync(await paperToDocx(pm, meta, rendered));
  assert.equal(none.file('word/footer1.xml'), null);
  assert.equal(none.file('word/header1.xml'), null);
});

test('hidden blocks stay out; statements are written under the body', async () => {
  const { pm, meta, rendered } = paper('apa');
  meta.hide = { title: true, abstract: true, keywords: true, references: true };
  meta.front.statements.funding = 'No funding.';
  const xml = await xmlOf(await paperToDocx(pm, meta, rendered));
  assert.doesNotMatch(xml, /Sleep study|Short summary|Keywords|References/);
  assert.match(xml, /Funding\. [^]*No funding\./);
});

test('markers line up with the citable nodes the editor decorates', () => {
  const { pm, meta } = paper('apa');
  assert.equal(citableNodes(pm).length, 3);
  assert.equal(collectCitations(pm, meta.cites, { clips: new Map([['clip1', info('clip1')]]), manual: [] }).length, 3);
});
