import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { getTemplate } from '../src/lib/paper/templates.ts';
import { templateToDoc } from '../src/lib/paper/docModel.ts';
import { paperExtensions } from '../src/lib/paper/editor/extensions.ts';
import { setBlockAttrs, applyStyle, styleOf, blockStateAt } from '../src/lib/paper/editor/format.ts';
import { sectionAt, addSectionAfter, deleteSection, deleteSectionHeading, hasHeading } from '../src/lib/paper/editor/structure.ts';

const schema = getSchema(paperExtensions({ hintFor: () => '' }));
const counter = () => { let n = 0; return () => `s${++n}`; };
const pmDoc = (templateId = 'imrad') => schema.nodeFromJSON(templateToDoc(getTemplate(templateId), counter()).pm);
const withText = (doc) => {
  const json = doc.toJSON();
  json.content[0].content[1] = { type: 'paragraph', content: [{ type: 'text', text: 'Some body text.' }] };
  return schema.nodeFromJSON(json);
};
const stateOn = (doc, from, to = from) => EditorState.create({ schema, doc, selection: TextSelection.create(doc, from, to) });
const firstParagraphPos = (doc) => { let pos = 0; doc.descendants((n, p) => { if (!pos && n.type.name === 'paragraph' && n.textContent) pos = p; }); return pos; };

test('alignment, spacing and first-line indent apply to the selected paragraphs', () => {
  const doc = withText(pmDoc());
  const pos = firstParagraphPos(doc);
  let state = stateOn(doc, pos + 3);
  state = state.apply(setBlockAttrs(state, { align: 'justify', line: '1.4', indent: 'first' }));
  const b = blockStateAt(state);
  assert.deepEqual([b.align, b.line, b.indent], ['justify', '1.4', 'first']);
  state = state.apply(setBlockAttrs(state, { align: null }));
  assert.equal(blockStateAt(state).align, null);
  state.doc.check();
});

test('a paragraph style sets the variant; Body clears it; headings become heading nodes and back', () => {
  const doc = withText(pmDoc());
  const pos = firstParagraphPos(doc);
  let state = stateOn(doc, pos + 3);
  assert.equal(styleOf(state), 'body');
  for (const id of ['caption', 'note', 'reference', 'label']) {
    state = state.apply(applyStyle(state, id));
    assert.equal(styleOf(state), id);
  }
  state = state.apply(applyStyle(state, 'h2'));
  assert.equal(blockStateAt(state).type, 'heading');
  assert.equal(styleOf(state), 'h2');
  state = state.apply(applyStyle(state, 'h3'));
  assert.equal(styleOf(state), 'h3');
  state = state.apply(applyStyle(state, 'body'));
  assert.equal(blockStateAt(state).type, 'paragraph');
  assert.equal(styleOf(state), 'body');
  assert.equal(state.doc.textContent.includes('Some body text.'), true);
  state.doc.check();
});

test('a style applies to every paragraph in a selection, and leaves section headings alone', () => {
  const doc = pmDoc();
  const state = stateOn(doc, 3, doc.content.size - 2);
  const next = state.apply(applyStyle(state, 'caption'));
  let headings = 0;
  next.doc.descendants((n) => { if (n.type.name === 'sectionHeading') headings++; });
  assert.equal(headings, 5);
  next.doc.check();
});

test('a new section goes after the current one with a heading to type over', () => {
  const doc = pmDoc();
  const state = stateOn(doc, 3);
  const next = state.apply(addSectionAfter(state, 3, counter()));
  const sections = next.doc.content.content;
  assert.equal(sections.length, 6);
  assert.equal(sections[1].firstChild.textContent, 'New section');
  assert.equal(sections[1].attrs.locked, false);
  assert.equal(next.selection.from < next.selection.to, true);
  next.doc.check();
});

test('a section can be deleted, even a template one; the last one is emptied instead', () => {
  const doc = pmDoc();
  let state = stateOn(doc, 3);
  state = state.apply(deleteSection(state, 3));
  assert.equal(state.doc.childCount, 4);
  assert.equal(state.doc.firstChild.firstChild.textContent, 'Methods');
  while (state.doc.childCount > 1) state = state.apply(deleteSection(state, 3));
  assert.equal(state.doc.childCount, 1);
  state = state.apply(deleteSection(state, 3));
  assert.equal(state.doc.childCount, 1);
  assert.equal(state.doc.firstChild.firstChild.type.name, 'paragraph');
  state.doc.check();
});

test('deleting a heading keeps the section text; a section with nothing left keeps a paragraph', () => {
  const doc = withText(pmDoc());
  let state = stateOn(doc, 3);
  assert.equal(hasHeading(state.doc, 3), true);
  state = state.apply(deleteSectionHeading(state, 3));
  const intro = state.doc.firstChild;
  assert.equal(intro.firstChild.type.name, 'paragraph');
  assert.equal(intro.textContent, 'Some body text.');
  assert.equal(hasHeading(state.doc, 3), false);
  assert.equal(deleteSectionHeading(state, 3), null);
  state.doc.check();
  const only = schema.nodeFromJSON({ type: 'doc', content: [{ type: 'section', attrs: { id: 'x' }, content: [{ type: 'sectionHeading', content: [{ type: 'text', text: 'Alone' }] }] }] });
  const s2 = stateOn(only, 3);
  const after = s2.apply(deleteSectionHeading(s2, 3));
  assert.equal(after.doc.firstChild.firstChild.type.name, 'paragraph');
  after.doc.check();
});

test('sectionAt finds the section for a position inside it, and a nearby one between sections', () => {
  const doc = pmDoc();
  assert.equal(sectionAt(doc, 3).node.firstChild.textContent, 'Introduction');
  assert.ok(sectionAt(doc, doc.firstChild.nodeSize));
});
