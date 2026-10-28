import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { getTemplate } from '../src/lib/paper/templates.ts';
import { templateToDoc } from '../src/lib/paper/docModel.ts';
import { paperExtensions } from '../src/lib/paper/editor/extensions.ts';
import { insertColumns, columnsAt, equalWidths, removeColumns, presetWidths } from '../src/lib/paper/editor/columns.ts';

const schema = getSchema(paperExtensions({ hintFor: () => '' }));
const counter = () => { let n = 0; return () => `s${++n}`; };
const base = () => {
  const doc = schema.nodeFromJSON(templateToDoc(getTemplate('imrad'), counter()).pm);
  let pos = 0;
  doc.descendants((n, p) => { if (!pos && n.type.name === 'paragraph') pos = p + 1; return !pos; });
  const state = EditorState.create({ schema, doc });
  return state.apply(state.tr.setSelection(TextSelection.create(doc, pos)));
};

test('presets: equal is stored empty, first and last give one column double width', () => {
  assert.equal(presetWidths(3, 'equal'), '');
  assert.equal(presetWidths(3, 'first'), '2,1,1');
  assert.equal(presetWidths(4, 'last'), '1,1,1,2');
});

test('insertColumns adds the columns and a paragraph to leave by, with the cursor in the first column', () => {
  let state = base();
  state = state.apply(insertColumns(state, 3, 'first'));
  const at = columnsAt(state);
  assert.ok(at);
  assert.equal(at.node.childCount, 3);
  assert.equal(at.node.attrs.widths, '2,1,1');
  assert.equal(state.doc.nodeAt(at.pos + at.node.nodeSize).type.name, 'paragraph');
});

test('inside columns, a second insert goes after them, not nested', () => {
  let state = base();
  state = state.apply(insertColumns(state, 2));
  state = state.apply(insertColumns(state, 2));
  let count = 0;
  state.doc.descendants((n) => { if (n.type.name === 'columns') count++; });
  assert.equal(count, 2);
});

test('equal widths resets the widths; remove keeps the text of every column', () => {
  let state = base();
  state = state.apply(insertColumns(state, 2, 'last'));
  state = state.apply(equalWidths(state));
  assert.equal(columnsAt(state).node.attrs.widths, '');
  const text = 'kept';
  state = state.apply(state.tr.insertText(text));
  state = state.apply(removeColumns(state));
  assert.equal(columnsAt(state), null);
  assert.ok(state.doc.textContent.includes(text));
});

test('outside columns, equalWidths and removeColumns do nothing', () => {
  const state = base();
  assert.equal(equalWidths(state), null);
  assert.equal(removeColumns(state), null);
});
