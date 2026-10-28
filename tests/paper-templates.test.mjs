import test from 'node:test';
import assert from 'node:assert/strict';
import { PAPER_TEMPLATE_LIST, PICKER_TEMPLATES, getTemplate, previewHeadings } from '../src/lib/paper/templates.ts';
import { PAPER_TEMPLATES } from '../src/lib/paper/outline.ts';

const STYLES = ['apa', 'harvard', 'ieee', 'vancouver', 'ama'];

test('the picker offers Blank first, then five templates, and hides the legacy one', () => {
  assert.equal(PICKER_TEMPLATES[0].id, 'blank');
  assert.equal(PICKER_TEMPLATES.length, 6);
  assert.equal(PICKER_TEMPLATES.some((t) => t.hidden), false);
});

test('template ids are unique and valid database ids', () => {
  const ids = PAPER_TEMPLATE_LIST.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9][a-z0-9-]{0,39}$/);
});

test('every template names a known citation style and every section has a hint', () => {
  for (const t of PAPER_TEMPLATE_LIST) {
    assert.ok(STYLES.includes(t.citationStyle), t.id);
    for (const s of t.sections) assert.ok(s.title && s.hint, `${t.id}: ${s.title}`);
  }
});

test('Blank has no sections; every other template ends with References', () => {
  assert.equal(getTemplate('blank').sections.length, 0);
  for (const t of PAPER_TEMPLATE_LIST.filter((x) => x.id !== 'blank')) {
    const main = previewHeadings(t);
    assert.equal(main[main.length - 1].title, 'References', t.id);
    assert.equal(main[0].title, 'Abstract', t.id);
  }
});

test('PRISMA template carries the guideline and CARE has an informed-consent section', () => {
  assert.equal(getTemplate('systematic-review').guideline, 'PRISMA 2020');
  assert.ok(getTemplate('case-report').sections.some((s) => s.title === 'Informed consent'));
});

test('the old outline template ids still resolve, so old papers open', () => {
  for (const id of Object.keys(PAPER_TEMPLATES)) assert.ok(getTemplate(id), id);
});
