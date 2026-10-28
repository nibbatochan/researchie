import test from 'node:test';
import assert from 'node:assert/strict';
import { snapMargin, rulerTicks, marginLabel, unitFor, MARGIN_MIN, MARGIN_MAX, PX_PER_CM } from '../src/lib/paper/ruler.ts';
import { pageGeometry } from '../src/lib/paper/paginate.ts';

test('margins snap to eighths of an inch and stay between a quarter inch and two inches', () => {
  assert.equal(snapMargin(100), 96);
  assert.equal(snapMargin(103), 108);
  assert.equal(snapMargin(1), MARGIN_MIN);
  assert.equal(snapMargin(999), MARGIN_MAX);
});

test('A4 uses centimetres, Letter uses inches', () => {
  assert.equal(unitFor('a4'), 'cm');
  assert.equal(unitFor('letter'), 'in');
});

test('centimetre ticks: a labelled mark per cm and a half mark between', () => {
  const t = rulerTicks(794, 'cm');
  assert.equal(t[0].x, 0);
  assert.equal(t[2].label, '1');
  assert.ok(Math.abs(t[2].x - PX_PER_CM) < 0.01);
  assert.equal(t[1].kind, 'half');
  assert.equal(t.filter((x) => x.label).length, 21); // 1 to 21 cm fit in 794 px
});

test('inch ticks: eighths, with half and labelled marks', () => {
  const t = rulerTicks(816, 'in');
  assert.equal(t[8].label, '1');
  assert.equal(t[4].kind, 'half');
  assert.equal(t[1].kind, 'minor');
  assert.equal(t.filter((x) => x.label).length, 8);
});

test('margin labels read in the unit of the page', () => {
  assert.equal(marginLabel(96, 'in'), '1.00 in');
  assert.equal(marginLabel(96, 'cm'), '2.5 cm');
});

test('a margin set from the ruler wins over the preset; none falls back to it', () => {
  assert.equal(pageGeometry('a4', 'normal', 60).top, 60);
  assert.equal(pageGeometry('a4', 'wide', null).top, 120);
  assert.equal(pageGeometry('a4', 'narrow').top, 48);
});
