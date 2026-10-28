import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import { paperExtensions } from '../src/lib/paper/editor/extensions.ts';
import { commentRanges, removeCommentMarks } from '../src/lib/paper/editor/comments.ts';

const schema = getSchema(paperExtensions({ hintFor: () => '' }));
const mark = (id) => [{ type: 'comment', attrs: { id } }];
const doc = (...content) => schema.nodeFromJSON({ type: 'doc', content: [{ type: 'section', attrs: { id: 's1', name: 'Intro', columns: null }, content }] });
const para = (...content) => ({ type: 'paragraph', content });
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) });

test('a comment mark is found with the text it covers, joined across nodes', () => {
  const d = doc(para(t('plain '), t('marked ', mark('a')), t('words', mark('a')), t(' tail')));
  const ranges = commentRanges(d);
  assert.equal(ranges.length, 1);
  assert.equal(ranges[0].id, 'a');
  assert.equal(ranges[0].quote, 'marked words');
  assert.equal(d.textBetween(ranges[0].from, ranges[0].to), 'marked words');
});

test('one comment with two stretches (after a copy) gives two ranges', () => {
  const d = doc(para(t('one', mark('a')), t(' and '), t('two', mark('a'))));
  assert.deepEqual(commentRanges(d).map((r) => r.quote), ['one', 'two']);
});

test('removing a comment clears its mark everywhere and leaves other comments', () => {
  const d = doc(para(t('one', mark('a')), t(' and '), t('two', mark('a')), t(' x', mark('b'))));
  const state = EditorState.create({ doc: d });
  const next = removeCommentMarks(state.tr, 'a').doc;
  const left = commentRanges(next);
  assert.deepEqual(left.map((r) => [r.id, r.quote]), [['b', ' x']]);
});
