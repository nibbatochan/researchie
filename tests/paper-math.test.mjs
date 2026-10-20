// Run: node --test --no-warnings tests/paper-math.test.mjs
// Finding LaTeX maths inside text. No DOM, no KaTeX.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitMath, hasMath, stripMath } from '../src/lib/paper/math.ts';

const types = (t) => splitMath(t).map((s) => `${s.type}:${s.value}`);

test('plain text is one text segment', () => {
  assert.deepEqual(splitMath('No maths here.'), [{ type: 'text', value: 'No maths here.' }]);
  assert.deepEqual(splitMath(''), [{ type: 'text', value: '' }]);
});

test('inline maths between dollar signs', () => {
  assert.deepEqual(types('Energy is $E = mc^2$ in physics.'), ['text:Energy is ', 'inline:E = mc^2', 'text: in physics.']);
});

test('display maths with $$ and with \\[ \\]; inline with \\( \\)', () => {
  assert.deepEqual(types('Before $$\\int_0^1 x\\,dx$$ after'), ['text:Before ', 'display:\\int_0^1 x\\,dx', 'text: after']);
  assert.deepEqual(types('A \\[a^2+b^2=c^2\\] B'), ['text:A ', 'display:a^2+b^2=c^2', 'text: B']);
  assert.deepEqual(types('So \\(x_1\\) works'), ['text:So ', 'inline:x_1', 'text: works']);
});

test('dollar amounts are not maths', () => {
  assert.deepEqual(types('It costs $5 and $10 each.'), ['text:It costs $5 and $10 each.']);
  assert.deepEqual(types('Pay $200 per month, or $ 20 now.'), ['text:Pay $200 per month, or $ 20 now.']);
});

test('an escaped dollar sign stays a dollar sign', () => {
  assert.deepEqual(types('Only \\$5 here, and $x$ there.'), ['text:Only $5 here, and ', 'inline:x', 'text: there.']);
});

test('several equations, in order, and chemistry', () => {
  assert.deepEqual(types('$a$ then $b$ and $\\ce{H2O}$'), ['inline:a', 'text: then ', 'inline:b', 'text: and ', 'inline:\\ce{H2O}']);
});

test('hasMath and stripMath', () => {
  assert.equal(hasMath('plain'), false);
  assert.equal(hasMath('with $x$'), true);
  assert.equal(stripMath('The slope $m = 2$ was steady in 12 trials.'), 'The slope was steady in 12 trials.');
  assert.equal(stripMath('Only $$x^2$$'), 'Only');
});

test('an unfinished dollar sign is left as text', () => {
  assert.deepEqual(types('Half open $x^2 and nothing else'), ['text:Half open $x^2 and nothing else']);
});
