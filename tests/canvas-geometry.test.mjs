import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rotatePoint,
  boxCenter,
  boxCorners,
  boxBounds,
  portPoint,
  resizeBox,
  angleFrom,
  normalizeAngle,
  snapAngle,
} from '../src/lib/canvas/geometry.ts';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not near ${b}`);
const nearPt = (p, x, y) => {
  near(p.x, x);
  near(p.y, y);
};

test('rotatePoint turns a point a quarter turn around a centre', () => {
  nearPt(rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90), 0, 10);
  nearPt(rotatePoint({ x: 3, y: 4 }, { x: 3, y: 4 }, 123), 3, 4);
  nearPt(rotatePoint({ x: 5, y: 5 }, { x: 0, y: 0 }, 0), 5, 5);
});

test('a rotated box keeps its centre and its bounds grow', () => {
  const box = { x: 0, y: 0, width: 100, height: 50, rotation: 90 };
  nearPt(boxCenter(box), 50, 25);
  const b = boxBounds(box);
  near(b.maxX - b.minX, 50);
  near(b.maxY - b.minY, 100);
  nearPt({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }, 50, 25);
  assert.equal(boxCorners(box).length, 4);
});

test('ports follow the rotation', () => {
  const box = { x: 0, y: 0, width: 100, height: 50, rotation: 0 };
  nearPt(portPoint(box, 'right'), 100, 25);
  nearPt(portPoint({ ...box, rotation: 90 }, 'right'), 50, 75);
  nearPt(portPoint({ ...box, rotation: 180 }, 'top'), 50, 50);
});

test('resize without rotation moves only the dragged side', () => {
  const box = { x: 10, y: 20, width: 100, height: 60 };
  const east = resizeBox(box, 'e', 30, 99);
  assert.deepEqual([east.x, east.y, east.width, east.height], [10, 20, 130, 60]);
  const west = resizeBox(box, 'w', -20, 0);
  assert.deepEqual([west.x, west.y, west.width, west.height], [-10, 20, 120, 60]);
  const north = resizeBox(box, 'n', 0, 15);
  assert.deepEqual([north.x, north.y, north.width, north.height], [10, 35, 100, 45]);
  const se = resizeBox(box, 'se', 10, 10);
  assert.deepEqual([se.x, se.y, se.width, se.height], [10, 20, 110, 70]);
  const nw = resizeBox(box, 'nw', 10, 10);
  assert.deepEqual([nw.x, nw.y, nw.width, nw.height], [20, 30, 90, 50]);
});

test('resize respects the minimum size and never moves the fixed side', () => {
  const box = { x: 0, y: 0, width: 100, height: 60 };
  const small = resizeBox(box, 'w', 500, 0, { minWidth: 40 });
  assert.equal(small.width, 40);
  near(small.x + small.width, 100); // the east side did not move
});

test('resize with keepAspect scales both sides together', () => {
  const box = { x: 0, y: 0, width: 100, height: 50 };
  const r = resizeBox(box, 'se', 100, 10, { keepAspect: true });
  near(r.width / r.height, 2);
  assert.equal(r.x, 0);
  assert.equal(r.y, 0);
});

test('resize of a rotated box keeps the opposite side where it was on the canvas', () => {
  const box = { x: 0, y: 0, width: 100, height: 50, rotation: 90 };
  // Rotated 90 degrees, the box's east side faces down the canvas. Pull it down by 20.
  const r = resizeBox(box, 'e', 0, 20);
  near(r.width, 120);
  near(r.height, 50);
  // The west side (now the top of the rotated box) is the anchor: it stays at (50, -25).
  nearPt(portPoint(r, 'left'), 50, -25);
  nearPt(boxCenter(r), 50, 35);
});

test('resize of a rotated box by a corner keeps the opposite corner fixed', () => {
  const box = { x: 100, y: 100, width: 80, height: 40, rotation: 30 };
  const before = boxCorners(box);
  const r = resizeBox(box, 'se', 25, -10);
  const after = boxCorners(r);
  nearPt(after[0], before[0].x, before[0].y); // top-left is the anchor of the south-east handle
});

test('angle helpers', () => {
  near(angleFrom({ x: 0, y: 0 }, { x: 0, y: 10 }), 90);
  near(angleFrom({ x: 0, y: 0 }, { x: -10, y: 0 }), 180);
  near(normalizeAngle(270), -90);
  near(normalizeAngle(-190), 170);
  near(normalizeAngle(180), 180);
  assert.equal(snapAngle(52), 45);
  assert.equal(snapAngle(53, 15), 60);
});
