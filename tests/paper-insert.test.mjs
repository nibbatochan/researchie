import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import { getTemplate } from '../src/lib/paper/templates.ts';
import { templateToDoc, clipToNodes, citationNode, citableNodes } from '../src/lib/paper/docModel.ts';
import { paperExtensions } from '../src/lib/paper/editor/extensions.ts';
import { blockPlacement, insertBlocks, insertInline } from '../src/lib/paper/editor/insert.ts';

const schema = getSchema(paperExtensions({ hintFor: () => '' }));
const counter = () => { let n = 0; return () => `s${++n}`; };
const stateOf = (templateId = 'imrad') => EditorState.create({ schema, doc: schema.nodeFromJSON(templateToDoc(getTemplate(templateId), counter()).pm) });
const titles = (doc) => doc.content.content.filter((n) => n.type.name === 'section').map((s) => s.firstChild.textContent);
const record = { type: 'article', title: 'Sleep', authors: [{ family: 'Lee', given: 'A' }], year: 2020, missingFields: [] };
const quoteClip = { id: 'c1', text: 'Sleep helps memory.\nIt really does.', kind: 'quote', record, page: 14 };

test('a quote clip becomes a quote node with its page, and its key goes in the cite map', () => {
  const { nodes, cites } = clipToNodes(quoteClip, {});
  assert.equal(nodes[0].type, 'quote');
  assert.equal(nodes[0].attrs.page, '14');
  assert.equal(nodes[0].content[0].text, 'Sleep helps memory. It really does.');
  assert.deepEqual(cites, { Lee2020: 'c1' });
});

test('a quote with no reference is still placed, and adds no key', () => {
  const { nodes, cites } = clipToNodes({ ...quoteClip, record: undefined }, {});
  assert.equal(nodes[0].type, 'quote');
  assert.deepEqual(cites, {});
});

test('an AI summary becomes a note that is never cited; the researcher\'s own note becomes paragraphs', () => {
  const ai = clipToNodes({ id: 'a', text: 'A summary', kind: 'ai-summary', record }, {});
  assert.equal(ai.nodes[0].type, 'clipNote');
  assert.deepEqual(ai.cites, {});
  const mine = clipToNodes({ id: 'm', text: 'First thought.\n\nSecond thought.', kind: 'mine' }, {});
  assert.deepEqual(mine.nodes.map((n) => n.type), ['paragraph', 'paragraph']);
});

test('an image clip becomes a figure and a table clip an editable table', () => {
  const img = clipToNodes({ id: 'i', text: '', kind: 'quote', record, media: { kind: 'image', src: 'x.png', caption: 'A chart' } }, {});
  assert.equal(img.nodes[0].type, 'figure');
  assert.equal(img.nodes[0].attrs.caption, 'A chart');
  const tbl = clipToNodes({ id: 't', text: '', kind: 'quote', media: { kind: 'table', caption: 'Results', table: { header: ['A', 'B'], rows: [['1', '2'], ['3']] } } }, {});
  assert.equal(tbl.nodes[0].type, 'tableFigure');
  const table = tbl.nodes[0].content[0];
  assert.equal(table.content.length, 3);
  assert.equal(table.content[2].content.length, 2); // a short row is padded
  schema.nodeFromJSON({ type: 'doc', content: [{ type: 'section', attrs: { id: 'x' }, content: [{ type: 'sectionHeading', content: [{ type: 'text', text: 'T' }] }, ...tbl.nodes] }] }).check();
});

test('a dropped block lands after the block it is dropped on, and replaces an empty paragraph', () => {
  const state = stateOf();
  // position inside the first empty paragraph of Introduction
  let pos = 0;
  state.doc.descendants((n, p) => { if (!pos && n.type.name === 'paragraph') pos = p + 1; });
  const tr = insertBlocks(state, pos, clipToNodes(quoteClip, {}).nodes);
  const intro = tr.doc.firstChild;
  assert.deepEqual(intro.content.content.map((n) => n.type.name), ['sectionHeading', 'quote', 'paragraph']); // empty paragraph replaced, one left to type in
  tr.doc.check();
});

test('a drop on a heading goes after the heading, not inside it', () => {
  const state = stateOf();
  const tr = insertBlocks(state, 3, clipToNodes(quoteClip, {}).nodes); // inside "Introduction"
  assert.equal(tr.doc.firstChild.child(0).type.name, 'sectionHeading');
  assert.equal(tr.doc.firstChild.child(0).textContent, 'Introduction');
  assert.ok(tr.doc.firstChild.content.content.some((n) => n.type.name === 'quote'));
  tr.doc.check();
});

test('a drop between sections goes at the end of the section before', () => {
  const state = stateOf();
  const intro = state.doc.firstChild;
  const between = intro.nodeSize; // between Introduction and Methods
  const { from } = blockPlacement(state.doc, between);
  assert.equal(from, between - 1);
  const tr = insertBlocks(state, between, clipToNodes(quoteClip, {}).nodes);
  assert.equal(titles(tr.doc).length, 5);
  assert.ok(tr.doc.firstChild.content.content.some((n) => n.type.name === 'quote'));
  tr.doc.check();
});

test('a citation goes inline at the cursor; in a heading it goes in a new paragraph below', () => {
  const state = stateOf();
  let pos = 0;
  state.doc.descendants((n, p) => { if (!pos && n.type.name === 'paragraph') pos = p + 1; });
  const { node } = citationNode({ id: 'c1', record }, {});
  const inline = insertInline(state, pos, node);
  assert.equal(citableNodes(inline.doc.toJSON()).length, 1);
  const inHeading = insertInline(state, 3, node);
  inHeading.doc.check();
  assert.equal(inHeading.doc.firstChild.child(0).textContent, 'Introduction'); // heading untouched
  assert.equal(citableNodes(inHeading.doc.toJSON()).length, 1);
});

test('with the cursor in a column, a figure goes into that column; a table goes after the whole set', () => {
  const state0 = stateOf();
  let pos = 0;
  state0.doc.descendants((n, p) => { if (!pos && n.type.name === 'paragraph') pos = p; return !pos; });
  const doc = state0.doc.type.schema.nodeFromJSON({
    type: 'doc',
    content: [{ type: 'section', attrs: state0.doc.firstChild.attrs, content: [
      { type: 'sectionHeading', content: [{ type: 'text', text: 'H' }] },
      { type: 'columns', content: [
        { type: 'column', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
        { type: 'column', content: [{ type: 'paragraph' }] },
      ] },
    ] }],
  });
  const state = EditorState.create({ schema, doc });
  let inCol = 0;
  doc.descendants((n, p) => { if (!inCol && n.type.name === 'column') inCol = p + 2; return !inCol; });
  const fig = insertBlocks(state, inCol, [{ type: 'figure', attrs: { clipId: 'i', caption: 'c', alt: '', width: null } }]);
  const col = fig.doc.firstChild.child(1).child(0);
  assert.equal(col.child(1).type.name, 'figure');
  const table = insertBlocks(state, inCol, [{ type: 'tableFigure', attrs: { clipId: 't', caption: 'c' }, content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph' }] }] }] }] }]);
  const sec = table.doc.firstChild;
  assert.equal(sec.child(1).childCount, 2); // still two columns, nothing added inside
  assert.equal(sec.child(2).type.name, 'tableFigure');
});
