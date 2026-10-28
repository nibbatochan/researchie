import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { EditorState } from '@tiptap/pm/state';
import { paperExtensions } from '../src/lib/paper/editor/extensions.ts';
import { findMatches, replaceMatch, replaceAll, nextMatchIndex } from '../src/lib/paper/editor/find.ts';

const schema = getSchema(paperExtensions({ hintFor: () => '' }));
const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const bold = [{ type: 'bold' }];
const cite = { type: 'citation', attrs: { keys: ['K'], locator: null } };
const para = (...content) => ({ type: 'paragraph', content: content.map((c) => (typeof c === 'string' ? t(c) : c)) });
const sec = (...blocks) => ({ type: 'section', attrs: { id: 's1' }, content: blocks });
const docOf = (...sections) => schema.nodeFromJSON({ type: 'doc', content: sections });
const textOf = (doc, m) => doc.textBetween(m.from, m.to);
const stateOf = (doc) => EditorState.create({ schema, doc });

test('case-insensitive by default, case-sensitive on request', () => {
  const doc = docOf(sec(para('Beta beta BETA')));
  assert.equal(findMatches(doc, 'beta').length, 3);
  const exact = findMatches(doc, 'beta', { caseSensitive: true });
  assert.equal(exact.length, 1);
  assert.equal(textOf(doc, exact[0]), 'beta');
});

test('wholeWord skips matches inside longer words, letters, digits and underscores', () => {
  const doc = docOf(sec(para('cat concatenate cat_ cat')));
  assert.equal(findMatches(doc, 'cat').length, 4);
  const whole = findMatches(doc, 'cat', { wholeWord: true });
  assert.equal(whole.length, 2);
  assert.equal(whole[0].from, 2 + 0);
  assert.ok(whole.every((m) => textOf(doc, m) === 'cat'));
});

test('matches in two paragraphs keep their positions and never span blocks', () => {
  const doc = docOf(sec(para('alpha beta'), para('beta gamma')));
  const found = findMatches(doc, 'beta');
  assert.equal(found.length, 2);
  assert.ok(found.every((m) => textOf(doc, m) === 'beta'));
  assert.equal(findMatches(doc, 'beta alpha').length, 0);
  assert.equal(findMatches(doc, 'alpha beta').length, 1);
});

test('matches inside a column are found at their real positions', () => {
  const doc = docOf(sec(
    { type: 'sectionHeading', content: [t('Heading')] },
    {
      type: 'columns',
      content: [
        { type: 'column', content: [para('left needle')] },
        { type: 'column', content: [para('right'), para('needle again')] },
      ],
    },
  ));
  const found = findMatches(doc, 'needle');
  assert.equal(found.length, 2);
  assert.ok(found.every((m) => textOf(doc, m) === 'needle'));
});

test('a citation between words keeps the offsets right, and it breaks a word', () => {
  const doc = docOf(sec(para('see ', cite, ' beta and gamma')));
  const found = findMatches(doc, 'beta');
  assert.equal(found.length, 1);
  assert.equal(textOf(doc, found[0]), 'beta');
  assert.equal(findMatches(doc, 'gamma').length, 1);
  assert.equal(findMatches(doc, 'and gamma').length, 1);
  assert.equal(findMatches(doc, 'seebeta').length, 0);
  // the citation is one character, so text on either side of it does not join up
  const joined = docOf(sec(para('a', cite, 'b')));
  assert.equal(findMatches(joined, 'ab').length, 0);
  assert.equal(findMatches(joined, 'b', { wholeWord: true }).length, 1);
});

test('an empty query finds nothing', () => {
  assert.deepEqual(findMatches(docOf(sec(para('anything'))), ''), []);
});

test('regex characters in the query are literal', () => {
  const doc = docOf(sec(para('axb a.b (x) a+b')));
  const dot = findMatches(doc, 'a.b');
  assert.equal(dot.length, 1);
  assert.equal(textOf(doc, dot[0]), 'a.b');
  assert.equal(findMatches(doc, '(x)').length, 1);
  assert.equal(findMatches(doc, 'a+b').length, 1);
  assert.equal(findMatches(doc, 'a\\').length, 0);
});

test('replaceMatch keeps the bold mark of the replaced text', () => {
  const doc = docOf(sec({ type: 'paragraph', content: [t('plain '), t('bold', bold)] }));
  const state = stateOf(doc);
  const [m] = findMatches(state.doc, 'bold');
  const next = state.apply(replaceMatch(state, m, 'new'));
  assert.equal(next.doc.textContent, 'plain new');
  let boldNew = false;
  next.doc.descendants((n) => { if (n.isText && n.text === 'new' && n.marks.some((mk) => mk.type.name === 'bold')) boldNew = true; });
  assert.ok(boldNew);
});

test('replaceMatch with an empty replacement deletes the match', () => {
  const state = stateOf(docOf(sec(para('one two three'))));
  const [m] = findMatches(state.doc, 'two ');
  assert.equal(state.apply(replaceMatch(state, m, '')).doc.textContent, 'one three');
});

test('replaceAll replaces every match in one transaction', () => {
  const state = stateOf(docOf(sec(para('a x b x c'), para('x'))));
  const tr = replaceAll(state, 'x', 'yy');
  assert.ok(tr);
  assert.equal(tr.steps.length, 3);
  assert.equal(state.apply(tr).doc.textContent, 'a yy b yy cyy');
});

test('replaceAll returns null when nothing matches', () => {
  const state = stateOf(docOf(sec(para('nothing here'))));
  assert.equal(replaceAll(state, 'missing', 'x'), null);
});

test('nextMatchIndex moves forward and wraps to the start', () => {
  const matches = [{ from: 2, to: 4 }, { from: 6, to: 8 }, { from: 10, to: 12 }];
  assert.equal(nextMatchIndex(matches, 0, 1), 0);
  assert.equal(nextMatchIndex(matches, 7, 1), 2);
  assert.equal(nextMatchIndex(matches, 6, 1), 1);
  assert.equal(nextMatchIndex(matches, 13, 1), 0);
});

test('nextMatchIndex moves backward and wraps to the end', () => {
  const matches = [{ from: 2, to: 4 }, { from: 6, to: 8 }, { from: 10, to: 12 }];
  assert.equal(nextMatchIndex(matches, 9, -1), 1);
  assert.equal(nextMatchIndex(matches, 12, -1), 2);
  assert.equal(nextMatchIndex(matches, 1, -1), 2);
  assert.equal(nextMatchIndex([], 5, 1), -1);
  assert.equal(nextMatchIndex([], 5, -1), -1);
});
