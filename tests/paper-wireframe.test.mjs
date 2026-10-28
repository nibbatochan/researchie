import test from 'node:test';
import assert from 'node:assert/strict';
import { PAPER_TEMPLATE_LIST, getTemplate } from '../src/lib/paper/templates.ts';
import { buildWireframe, unplacedSections } from '../src/lib/paper/wireframe.ts';

test('every main section of every template sits on some page', () => {
  for (const t of PAPER_TEMPLATE_LIST) assert.deepEqual(unplacedSections(t), [], t.id);
});

test('research article: front page, four body pages, references last', () => {
  const pages = buildWireframe(getTemplate('imrad'));
  assert.equal(pages.length, 6);
  assert.deepEqual(pages[0].blocks.map((b) => b.kind), ['title', 'abstract']);
  assert.deepEqual(pages.slice(1, 5).map((p) => p.blocks.map((b) => b.title)), [['Introduction'], ['Methods'], ['Results'], ['Discussion', 'Conclusion']]);
  assert.deepEqual(pages[5].blocks.map((b) => b.kind), ['refs']);
});

test('a section carries its sub-headings', () => {
  const methods = buildWireframe(getTemplate('imrad'))[2].blocks[0];
  assert.deepEqual(methods.subs, ['Participants or materials', 'Procedure', 'Ethics', 'Statistical analysis']);
});

test('the conference template is two columns on body pages and one on the front page', () => {
  const pages = buildWireframe(getTemplate('conference'));
  assert.equal(pages[0].columns, 1);
  assert.ok(pages.slice(1).every((p) => p.columns === 2));
});

test('case report puts keywords on the front page', () => {
  const [front] = buildWireframe(getTemplate('case-report'));
  assert.ok(front.blocks.some((b) => b.kind === 'keywords'));
});

test('Blank is one empty page', () => {
  const pages = buildWireframe(getTemplate('blank'));
  assert.equal(pages.length, 1);
  assert.ok(pages[0].blocks.some((b) => b.kind === 'blank'));
});

test('some pages are two columns where journals print them so, and the rest stay one', () => {
  const pages = buildWireframe(getTemplate('imrad'));
  assert.deepEqual(pages.map((p) => p.columns), [1, 1, 1, 2, 2, 1]); // front, Intro, Methods, Results, Discussion, References
  assert.ok(buildWireframe(getTemplate('systematic-review')).some((p) => p.columns === 2));
  assert.ok(buildWireframe(getTemplate('case-report')).every((p) => p.columns === 1));
});
