import test from 'node:test';
import assert from 'node:assert/strict';
import { pageGeometry, layoutPages, pageCount, pageOf, contentStart, contentLimit } from '../src/lib/paper/paginate.ts';

const A4 = pageGeometry('a4', 'normal'); // H 1123, G 24, S 1147, top 96, bottom 96
const block = (top, height, pad = 0, breakBefore = false) => ({ top, height, pad, breakBefore });

test('a block that fits on the first page does not move', () => {
  const { pads } = layoutPages([block(100, 40), block(150, 40)], A4);
  assert.deepEqual(pads, [0, 0]);
});

test('a block that would cross the bottom margin moves to the top of the next page', () => {
  const y = contentLimit(0, A4) - 20; // 20 px of room left
  const { pads, tops } = layoutPages([block(y, 60)], A4);
  assert.equal(tops[0], y);
  assert.equal(y + pads[0], contentStart(1, A4));
});

test('content after a moved block moves with it, so later blocks keep their order', () => {
  const y = contentLimit(0, A4) - 20;
  const blocks = [block(y, 60), block(y + 70, 40)];
  const { pads } = layoutPages(blocks, A4);
  assert.ok(pads[0] > 0);
  assert.equal(pads[1], 0); // already on page 2 after the first one moved, nothing else needed
});

test('a block that starts in the bottom margin is moved to the next page', () => {
  const { pads } = layoutPages([block(contentLimit(0, A4) + 5, 10)], A4);
  assert.equal(pads[0] > 0, true);
});

test('a block that starts in the gap between pages belongs to the next page', () => {
  const inGap = A4.H + 5; // inside the grey gap after page 1
  const { pads, tops } = layoutPages([block(inGap, 20)], A4);
  assert.equal(tops[0], inGap);
  assert.equal(inGap + pads[0], contentStart(1, A4));
});

test('a block that starts in the top margin is moved down to the content start', () => {
  const { pads } = layoutPages([block(10, 20)], A4);
  assert.equal(10 + pads[0], contentStart(0, A4));
});

test('a block taller than a page is not pushed forever', () => {
  const { pads } = layoutPages([block(contentStart(0, A4), A4.H * 2)], A4);
  assert.equal(pads[0], 0);
});

test('a forced break starts the next block on a new page, but not when it is already at a page top', () => {
  const { pads } = layoutPages([block(200, 30), block(240, 30, 0, true)], A4);
  assert.equal(pads[1] > 0, true);
  const top = layoutPages([block(contentStart(0, A4), 30, 0, true)], A4);
  assert.equal(top.pads[0], 0);
});

test('running the layout again on its own result gives the same pads (stable, so no save loop)', () => {
  const first = [block(contentLimit(0, A4) - 20, 60), block(contentLimit(0, A4) + 60, 40), block(contentLimit(0, A4) + 120, 50)];
  const once = layoutPages(first, A4);
  const applied = first.map((b, i) => ({ top: b.top + once.pads.slice(0, i).reduce((a, x) => a + x, 0), height: b.height + once.pads[i], pad: once.pads[i], breakBefore: b.breakBefore }));
  const twice = layoutPages(applied, A4);
  assert.deepEqual(twice.pads.map((x) => Math.round(x)), once.pads.map((x) => Math.round(x)));
});

test('letter pages are shorter than A4 and the margins change the content area', () => {
  const letter = pageGeometry('letter', 'wide');
  assert.equal(letter.H, 1056);
  assert.equal(letter.top, 120);
  assert.ok(contentLimit(0, letter) < contentLimit(0, pageGeometry('a4', 'narrow')));
});

test('page count: content that ends on the first page is one page; content past the gap is two', () => {
  assert.equal(pageCount(500, A4), 1);
  assert.equal(pageCount(A4.S + 10, A4), 2);
  assert.equal(pageCount(0, A4), 1);
  assert.equal(pageOf(A4.S + 1, A4), 1);
});

test('a heading stays with the start of the block after it', () => {
  const y = contentLimit(0, A4) - 30; // room for the heading, not for a line after it
  const blocks = [{ ...block(y, 20), keepWithNext: true }, block(y + 24, 200)];
  const { pads, tops } = layoutPages(blocks, A4);
  assert.equal(tops[0] + pads[0], contentStart(1, A4)); // the heading moved to page 2 with its text
  assert.equal(pads[1], 0);
});

test('a heading with plenty of room below it does not move', () => {
  const blocks = [{ ...block(200, 20), keepWithNext: true }, block(224, 200)];
  assert.deepEqual(layoutPages(blocks, A4).pads, [0, 0]);
});

test('a heading at the very end of the paper has nothing to keep it with and stays', () => {
  const blocks = [{ ...block(200, 20), keepWithNext: true }];
  assert.deepEqual(layoutPages(blocks, A4).pads, [0]);
});

test('a block taller than a page text area is reported as tall, and a normal one is not', () => {
  const area = A4.H - A4.top - A4.bottom;
  const { tall } = layoutPages([block(100, area + 50), block(100 + area + 60, 40)], A4);
  assert.deepEqual(tall, [true, false]);
});

test('many short blocks such as a long reference list fill page after page without crossing an edge', () => {
  const blocks = [];
  let y = contentStart(0, A4);
  for (let i = 0; i < 200; i++) { blocks.push(block(y, 30)); y += 34; }
  const { pads, tops } = layoutPages(blocks, A4);
  blocks.forEach((b, i) => {
    const start = tops[i] + pads[i];
    const page = pageOf(start, A4);
    assert.ok(start >= contentStart(page, A4) - 0.5, `block ${i} starts inside the top margin`);
    assert.ok(start + 30 <= contentLimit(page, A4) + 0.5, `block ${i} crosses the bottom margin`);
  });
});

const linesOf = (n, h = 20) => Array.from({ length: n }, (_, k) => ({ top: k * h, bottom: (k + 1) * h }));

test('a paragraph taller than a page is split by line, starting where it is, with every line inside a page', () => {
  const y = contentStart(0, A4) + 100; // starts a little down the first page
  const lines = linesOf(150); // 3000 px
  const b = { top: y, height: 3000, pad: 0, lines, extras: 0 };
  const out = layoutPages([b], A4);
  assert.equal(out.pads[0], 0); // not pushed to a page of its own
  assert.equal(out.tall[0], false);
  assert.ok(out.splits[0].length >= 3);
  let shift = 0;
  const gaps = new Map(out.splits[0].map((s) => [s.line, s.height]));
  lines.forEach((l, k) => {
    shift += gaps.get(k) ?? 0;
    const top = y + shift + l.top;
    const page = pageOf(top, A4);
    assert.ok(top >= contentStart(page, A4) - 0.5, `line ${k} starts in the top margin`);
    assert.ok(top + 20 <= contentLimit(page, A4) + 0.5, `line ${k} crosses the bottom margin`);
  });
});

test('the split is stable: measuring again with the gaps in place gives the same gaps', () => {
  const y = contentStart(0, A4) + 100;
  const lines = linesOf(150);
  const first = layoutPages([{ top: y, height: 3000, pad: 0, lines, extras: 0 }], A4);
  const extras = first.splits[0].reduce((n, s) => n + s.height, 0);
  const second = layoutPages([{ top: y, height: 3000 + extras, pad: 0, lines, extras }], A4);
  assert.deepEqual(second.splits[0], first.splits[0]);
  assert.equal(second.pads[0], 0);
});

test('a block after a split paragraph is placed after the gaps', () => {
  const y = contentStart(0, A4);
  const lines = linesOf(100); // 2000 px
  const first = layoutPages([{ top: y, height: 2000, pad: 0, lines, extras: 0 }, block(y + 2010, 40)], A4);
  const extras = first.splits[0].reduce((n, s) => n + s.height, 0);
  // with the gaps in the page the second block really sits `extras` lower; it must not be moved again
  const again = layoutPages([{ top: y, height: 2000 + extras, pad: 0, lines, extras }, block(y + 2010 + extras, 40)], A4);
  assert.equal(again.pads[1], first.pads[1] === 0 ? 0 : again.pads[1]);
  const start = y + 2010 + extras + again.pads[1];
  const page = pageOf(start, A4);
  assert.ok(start >= contentStart(page, A4) - 0.5 && start + 40 <= contentLimit(page, A4) + 0.5);
});

test('a paragraph without line data keeps the old behaviour: it is only flagged', () => {
  const area = A4.H - A4.top - A4.bottom;
  const out = layoutPages([block(100, area + 200)], A4);
  assert.equal(out.tall[0], true);
  assert.deepEqual(out.splits[0], []);
});
