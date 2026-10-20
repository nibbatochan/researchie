// Run: node --test --no-warnings tests/paper-table.test.mjs
// Reading a table out of clipped HTML as plain text cells. No DOM.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTable, hasTable } from '../src/lib/paper/tableParse.ts';

const HTML = `<div><table class="x"><caption>Recall by sleep</caption>
<thead><tr><th>Hours</th><th>Words &amp; names</th></tr></thead>
<tbody><tr><td>5</td><td><b>12</b>&nbsp;&plusmn; 2</td></tr><tr><td>8</td><td>19<br>words</td></tr></tbody></table></div>`;

test('header, rows, caption and entities are read as plain text', () => {
  assert.deepEqual(parseTable(HTML), {
    caption: 'Recall by sleep',
    header: ['Hours', 'Words & names'],
    rows: [['5', '12 ± 2'], ['8', '19 words']],
  });
});

test('a table with no header row keeps every row as data', () => {
  assert.deepEqual(parseTable('<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>'), { header: [], rows: [['a', 'b'], ['c', 'd']] });
});

test('no tag, attribute, link or script comes through', () => {
  const t = parseTable('<table><tr><td><a href="javascript:alert(1)" onclick="x()">link</a><script>alert(1)</script><img src=x onerror=alert(1)>text</td></tr></table>');
  assert.deepEqual(t.rows, [['link text']]);
});

test('no table, an empty table, or nothing returns undefined', () => {
  assert.equal(parseTable('<p>just text</p>'), undefined);
  assert.equal(parseTable('<table></table>'), undefined);
  assert.equal(parseTable(''), undefined);
  assert.equal(hasTable(undefined), false);
  assert.equal(hasTable(HTML), true);
});

test('only the first table is read', () => {
  const t = parseTable('<table><tr><td>one</td></tr></table><table><tr><td>two</td></tr></table>');
  assert.deepEqual(t.rows, [['one']]);
});
