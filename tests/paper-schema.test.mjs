import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { PAPER_TEMPLATE_LIST } from '../src/lib/paper/templates.ts';
import { templateToDoc } from '../src/lib/paper/docModel.ts';
import { paperExtensions } from '../src/lib/paper/editor/extensions.ts';

const schema = getSchema(paperExtensions({ hintFor: () => '' }));

test('the schema has every node the document model writes', () => {
  for (const name of ['doc', 'section', 'sectionHeading', 'quote', 'clipNote', 'citation', 'figure', 'tableFigure', 'unplaced', 'paragraph', 'heading', 'table', 'inlineMath', 'blockMath']) {
    assert.ok(schema.nodes[name], name);
  }
});

test('a document built from every template is valid under the schema', () => {
  for (const t of PAPER_TEMPLATE_LIST) {
    const doc = schema.nodeFromJSON(templateToDoc(t).pm);
    doc.check(); // throws on an invalid document
    assert.ok(doc.childCount >= 1, t.id);
  }
});

test('a body with citations, a quote, a figure and an Unplaced bin is valid', () => {
  const pm = {
    type: 'doc',
    content: [
      { type: 'section', attrs: { id: 'a', key: 'intro', locked: true }, content: [
        { type: 'sectionHeading', content: [{ type: 'text', text: 'Introduction' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello ' }, { type: 'citation', attrs: { keys: ['Lee2020'] } }] },
        { type: 'quote', attrs: { clipId: 'c1', page: '4' }, content: [{ type: 'text', text: 'words' }] },
        { type: 'figure', attrs: { clipId: 'c2', caption: 'A figure', alt: '' } },
        { type: 'clipNote', attrs: { clipId: 'c3' } },
      ] },
      { type: 'unplaced', content: [{ type: 'paragraph' }] },
    ],
  };
  schema.nodeFromJSON(pm).check();
});

test('a document with no section is refused by the schema', () => {
  assert.throws(() => schema.nodeFromJSON({ type: 'doc', content: [{ type: 'paragraph' }] }).check());
});

test('a section without a heading is valid, so a heading can be deleted and its text kept', () => {
  schema.nodeFromJSON({ type: 'doc', content: [{ type: 'section', attrs: { id: 'a' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'No heading here' }] }] }] }).check();
});

test('text blocks carry alignment, spacing, indent and a style, and runs carry a font size', () => {
  const pm = { type: 'doc', content: [{ type: 'section', attrs: { id: 'a' }, content: [
    { type: 'paragraph', attrs: { align: 'justify', line: '1.4', indent: 'first', variant: 'caption' }, content: [{ type: 'text', text: 'Fig 1.', marks: [{ type: 'fontSize', attrs: { size: '8' } }, { type: 'bold' }] }] },
  ] }] };
  const doc = schema.nodeFromJSON(pm);
  doc.check();
  assert.equal(doc.firstChild.firstChild.attrs.align, 'justify');
  assert.equal(doc.firstChild.firstChild.attrs.variant, 'caption');
});

test('a quote can carry any mark, not only italic', () => {
  schema.nodeFromJSON({ type: 'doc', content: [{ type: 'section', attrs: { id: 'a' }, content: [{ type: 'quote', attrs: { clipId: 'c' }, content: [{ type: 'text', text: 'x', marks: [{ type: 'bold' }] }] }] }] }).check();
});
