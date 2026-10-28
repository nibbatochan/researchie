import test from 'node:test';
import assert from 'node:assert/strict';
import { getTemplate } from '../src/lib/paper/templates.ts';
import {
  templateToDoc, defaultMeta, upgradeDoc, upgradeMeta, docBytes, wordCount, citableNodes, collectCitations,
  pruneCiteMap, sectionToAuthored, sectionsOf,
} from '../src/lib/paper/docModel.ts';
import { resolveTokens, authorToken, runningHead } from '../src/lib/paper/headerTokens.ts';
import { checkAuthored } from '../src/lib/paper/authored.ts';
import { renderCitations } from '../src/lib/citations/inText.ts';

const counter = () => { let n = 0; return () => `s${++n}`; };
const titleOf = (s) => s.content[0].content[0].text;

test('a template becomes sections and leaves out Abstract, Keywords and References', () => {
  const { pm } = templateToDoc(getTemplate('imrad'), counter());
  const titles = sectionsOf(pm).map(titleOf);
  assert.deepEqual(titles, ['Introduction', 'Methods', 'Results', 'Discussion', 'Conclusion']);
  assert.ok(sectionsOf(pm).every((s) => s.attrs.locked === false)); // nothing is locked any more
  assert.equal(sectionsOf(pm)[1].attrs.key, 'methods');
});

test('template sub-headings become level 2 headings, each followed by an empty paragraph', () => {
  const { pm } = templateToDoc(getTemplate('imrad'), counter());
  const methods = sectionsOf(pm)[1].content;
  assert.deepEqual(methods[0].type, 'sectionHeading');
  const heads = methods.filter((n) => n.type === 'heading').map((n) => n.content[0].text);
  assert.deepEqual(heads, ['Participants or materials', 'Procedure', 'Ethics', 'Statistical analysis']);
  assert.equal(methods[1].type, 'heading');
  assert.equal(methods[2].type, 'paragraph');
});

test('every section has a body to type in, and Keywords stay out of the body for the case report', () => {
  const { pm } = templateToDoc(getTemplate('case-report'), counter());
  assert.ok(sectionsOf(pm).every((s) => s.content.length >= 2));
  assert.ok(!sectionsOf(pm).map(titleOf).includes('Keywords'));
});

test('Blank gives one custom section', () => {
  const { pm } = templateToDoc(getTemplate('blank'), counter());
  assert.equal(sectionsOf(pm).length, 1);
  assert.match(sectionsOf(pm)[0].attrs.key, /^custom-/);
});

test('upgradeDoc builds a first document when none is stored, and keeps a stored one', () => {
  const t = getTemplate('imrad');
  assert.equal(sectionsOf(upgradeDoc({}, t, counter()).pm).length, 5);
  const stored = { v: 1, pm: { type: 'doc', content: [{ type: 'section', attrs: {}, content: [] }] } };
  assert.equal(upgradeDoc(stored, t), stored);
  assert.equal(sectionsOf(upgradeDoc(null, t).pm).length, 5);
});

test('upgradeMeta keeps what the wizard stored and fills the rest', () => {
  const t = getTemplate('imrad');
  const meta = upgradeMeta({ venue: 'Nature', wordLimit: 3000 }, t, 'My paper');
  assert.equal(meta.venue, 'Nature');
  assert.equal(meta.wordLimit, 3000);
  assert.equal(meta.front.title, 'My paper');
  assert.deepEqual(meta.cites, {});
  assert.ok('parts' in meta.front.abstract); // IMRaD has a structured abstract
  assert.equal(upgradeMeta({}, t, 'X').v, 1);
  assert.equal(upgradeMeta('junk', t, 'X').front.title, 'X');
});

test('the conference template starts with a bare first-page header and a footer page number', () => {
  const meta = defaultMeta(getTemplate('conference'), 'T');
  assert.equal(meta.page.differentFirstPage, true);
  assert.equal(meta.page.footer.center, '{page}');
});

const doc = (...sections) => ({ type: 'doc', content: sections });
const sec = (title, ...blocks) => ({ type: 'section', attrs: { id: title }, content: [{ type: 'sectionHeading', content: [{ type: 'text', text: title }] }, ...blocks] });
const p = (...inline) => ({ type: 'paragraph', content: inline });
const t = (text) => ({ type: 'text', text });
const cite = (...keys) => ({ type: 'citation', attrs: { keys } });

test('wordCount skips headings, sub-headings, AI notes and the Unplaced bin', () => {
  const pm = doc(sec('Intro', p(t('one two three'))), sec('Methods', { type: 'heading', attrs: { level: 2 }, content: [t('A sub heading')] }, p(t('four five')), { type: 'clipNote', attrs: { clipId: 'x' } }), { type: 'unplaced', content: [p(t('lots of words here that do not count'))] });
  assert.equal(wordCount(pm), 5);
});

test('docBytes counts doc and meta', () => {
  assert.ok(docBytes({ a: 'x'.repeat(100) }, {}) > 100);
  assert.ok(docBytes(null, null) > 0);
});

const rec = (family, year) => ({ type: 'article', title: `${family} study`, authors: [{ family, given: 'A' }], year, missingFields: [], container: 'Journal', volume: '1', pages: '1-2', doi: '10.1/x' });
const clips = new Map([
  ['c1', { id: 'c1', text: 'The sky is blue today.', kind: 'quote', record: rec('Lee', 2020), page: 14 }],
  ['c2', { id: 'c2', text: 'Grass is green.', kind: 'quote', record: rec('Abe', 2018) }],
  ['c3', { id: 'c3', text: 'a summary', kind: 'ai-summary' }],
]);
const sources = { clips, manual: [{ id: 'm1', record: rec('Kim', 2021) }] };
const cites = { Lee2020: 'c1', Abe2018: 'c2', Kim2021: 'manual:m1', Old1999: 'c1' };

test('citations are collected in document order, one group per node, and the bin is skipped', () => {
  const pm = doc(
    sec('Intro', p(t('A '), cite('Abe2018'), t(' B '), cite('Lee2020', 'Kim2021'))),
    sec('Methods', { type: 'quote', attrs: { clipId: 'c1', page: '14' }, content: [t('The sky is blue today.')] }),
    { type: 'unplaced', content: [p(cite('Old1999'))] },
  );
  assert.equal(citableNodes(pm).length, 3);
  const groups = collectCitations(pm, cites, sources);
  assert.deepEqual(groups.map((g) => g.map((s) => s.sourceId)), [['c2'], ['c1', 'manual:m1'], ['c1']]);
});

test('the same document renders in both styles and the document is untouched', () => {
  const pm = doc(sec('Intro', p(cite('Abe2018'), cite('Lee2020'))));
  const before = JSON.stringify(pm);
  const groups = collectCitations(pm, cites, sources);
  const harvard = renderCitations('harvard', groups);
  const ieee = renderCitations('ieee', groups);
  assert.match(harvard.markers[0].map((m) => m.text).join(''), /Abe, 2018/);
  assert.equal(ieee.markers[0].map((m) => m.text).join(''), '[1]');
  assert.equal(JSON.stringify(pm), before);
});

test('a citation whose key or clip is gone gets an empty group, so groups still line up', () => {
  const pm = doc(sec('Intro', p(cite('Nope'), cite('Abe2018'))));
  const groups = collectCitations(pm, cites, sources);
  assert.deepEqual(groups.map((g) => g.length), [0, 1]);
  assert.equal(collectCitations(pm, { Abe2018: 'gone' }, sources)[1].length, 0);
});

test('a lone citation with a locator shows the page', () => {
  const pm = doc(sec('Intro', p({ type: 'citation', attrs: { keys: ['Abe2018'], locator: '7' } })));
  assert.equal(collectCitations(pm, cites, sources)[0][0].page, '7');
});

test('pruneCiteMap drops keys nothing uses and keeps the key of a quoted clip', () => {
  const pm = doc(sec('Intro', p(cite('Abe2018'))), sec('Methods', { type: 'quote', attrs: { clipId: 'c1' }, content: [t('x')] }), { type: 'unplaced', content: [p(cite('Kim2021'))] });
  const pruned = pruneCiteMap(pm, cites);
  assert.deepEqual(Object.keys(pruned).sort(), ['Abe2018', 'Lee2020', 'Old1999'].sort()); // both keys of c1 stay
  assert.ok(!('Kim2021' in pruned));
});

test('sectionToAuthored writes the old [@key] form, and checkAuthored runs on it unchanged', () => {
  const section = sec('Intro', p(t('Grass is green '), cite('Abe2018'), t(' and so on and on.')), { type: 'quote', attrs: { clipId: 'c1' }, content: [t('The sky is blue today.')] });
  const text = sectionToAuthored(section, cites);
  assert.match(text, /Grass is green \[@Abe2018\] and so on/);
  assert.match(text, /"The sky is blue today\." \[@Lee2020\]/);
  assert.equal(checkAuthored(text, cites, clips).issues.filter((i) => i.severity === 'block').length, 0);
  const bad = sectionToAuthored(sec('X', { type: 'quote', attrs: { clipId: 'c1' }, content: [t('The sky is green today.')] }), cites);
  assert.ok(checkAuthored(bad, cites, clips).issues.some((i) => i.id === 'authored-bad-quote'));
});

test('a citation of an AI summary is caught by the same check', () => {
  const text = sectionToAuthored(sec('X', p(t('Something said '), cite('S1'), t(' here.'))), { S1: 'c3' });
  assert.ok(checkAuthored(text, { S1: 'c3' }, clips).issues.some((i) => i.id === 'authored-ai-summary'));
});

test('header tokens fill in title, running head, author, page and total pages', () => {
  const meta = defaultMeta(getTemplate('imrad'), 'A very long title about sleep and memory in adolescents of many kinds');
  meta.front.authors = [{ id: 'a', name: 'Jane Q. Lee', affiliationIds: [], orcid: '', email: '', corresponding: false }, { id: 'b', name: 'Raj Patel', affiliationIds: [], orcid: '', email: '', corresponding: false }];
  assert.equal(resolveTokens('{author} — {page}/{pages}', meta, 2, 9), 'Lee et al. — 2/9');
  assert.ok(runningHead(meta.front).length <= 50);
  assert.equal(resolveTokens('{shortTitle}', meta, 1, 1), runningHead(meta.front));
  meta.front.shortTitle = 'Sleep and memory';
  assert.equal(resolveTokens('{shortTitle}', meta, 1, 1), 'Sleep and memory');
  assert.equal(authorToken({ ...meta.front, authors: [meta.front.authors[0]] }), 'Lee');
  assert.equal(resolveTokens('{unknown} {page}', meta, 3, 3), '{unknown} 3');
});

import { computeMarkers, familyOf } from '../src/lib/paper/markers.ts';
import { classifyFailure } from '../src/lib/paper/useAutosave.ts';

test('markers line up with citable nodes; a citation with no source shows [?], a sourceless quote shows nothing', () => {
  const pm = doc(sec('Intro', p(cite('Abe2018'), cite('Gone')), { type: 'quote', attrs: { clipId: 'nope' }, content: [t('x')] }));
  const { markers, references } = computeMarkers(pm, cites, sources, 'harvard');
  assert.equal(markers.length, 3);
  assert.match(markers[0], /Abe, 2018/);
  assert.equal(markers[1], '[?]');
  assert.equal(markers[2], '');
  assert.equal(references.length, 1);
});

test('each style draws its own markers', () => {
  for (const id of ['apa', 'harvard', 'ieee', 'vancouver', 'ama']) assert.equal(familyOf(id), id);
  const pm = doc(sec('Intro', p(cite('Abe2018'))));
  assert.equal(computeMarkers(pm, cites, sources, 'ieee').markers[0], '[1]');
  assert.equal(computeMarkers(pm, cites, sources, 'vancouver').markers[0], '(1)');
  assert.equal(computeMarkers(pm, cites, sources, 'ama').markers[0], '¹');
});

test('what to do after a failed save depends on the status', () => {
  assert.equal(classifyFailure(409), 'conflict');
  assert.equal(classifyFailure(401), 'signin');
  assert.equal(classifyFailure(413), 'refused');
  assert.equal(classifyFailure(400), 'refused');
  assert.equal(classifyFailure(500), 'retry');
  assert.equal(classifyFailure(0), 'retry');
});

test('new meta has the page layout fields and no hidden blocks; old meta gets them filled in', () => {
  const m = defaultMeta(getTemplate('imrad'), 'T');
  assert.equal(m.page.columns, 1);
  assert.equal(m.page.margin, 'normal');
  assert.equal(m.page.font, 'sans');
  assert.deepEqual(m.hide, {});
  assert.equal(defaultMeta(getTemplate('conference'), 'T').page.columns, 2);
  const old = upgradeMeta({ page: { size: 'letter', header: { left: 'x' } } }, getTemplate('imrad'), 'T');
  assert.equal(old.page.size, 'letter');
  assert.equal(old.page.columns, 1);
  assert.equal(old.page.header.left, 'x');
  assert.deepEqual(upgradeMeta({ hide: { abstract: true } }, getTemplate('imrad'), 'T').hide, { abstract: true });
});

test('the {venue} header token fills in the journal or conference', () => {
  const m = defaultMeta(getTemplate('imrad'), 'T', { venue: 'PLOS One' });
  assert.equal(resolveTokens('{venue} | {page}', m, 3, 9), 'PLOS One | 3');
});

test('odd and even pages: off by default, even zones mirror the odd ones left and right', () => {
  const m = defaultMeta(getTemplate('imrad'), 'T');
  assert.equal(m.page.oddEven, false);
  assert.deepEqual(m.page.header, { left: '{shortTitle}', center: '', right: '{page}' });
  assert.deepEqual(m.page.headerEven, { left: '{page}', center: '', right: '{shortTitle}' });
  assert.deepEqual(m.page.footerEven, { left: '', center: '', right: '' });
  const c = defaultMeta(getTemplate('conference'), 'T');
  assert.deepEqual(c.page.footerEven, { left: '', center: '{page}', right: '' });
});

test('upgradeMeta gives an old paper oddEven off and the default even zones', () => {
  const t = getTemplate('imrad');
  const old = upgradeMeta({ page: { size: 'a4', header: { left: 'Mine', center: '', right: '' } } }, t, 'T');
  assert.equal(old.page.oddEven, false);
  assert.equal(old.page.header.left, 'Mine');
  assert.deepEqual(old.page.headerEven, { left: '{page}', center: '', right: '{shortTitle}' });
  assert.deepEqual(old.page.footerEven, { left: '', center: '', right: '' });
  const kept = upgradeMeta({ page: { oddEven: true, headerEven: { left: 'E', center: '', right: '' } } }, t, 'T');
  assert.equal(kept.page.oddEven, true);
  assert.equal(kept.page.headerEven.left, 'E');
  assert.equal(kept.page.headerEven.right, '');
});
