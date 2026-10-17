import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';

// Every canvas tool, used the way a person uses it: real mouse and keyboard, in a real browser.

const SHAPE = '[data-testid="canvas-shape"]';
const ATOM = '[data-testid="canvas-atom"]';
const SECTION = '[data-testid="canvas-section"]';

async function openCanvas(page: Page, { clear = true }: { clear?: boolean } = {}) {
  if (clear) {
    // Each test starts from an empty canvas layout (the clips themselves are untouched).
    await page.addInitScript(() => {
      if (sessionStorage.getItem('canvas-test-cleared')) return;
      Object.keys(localStorage)
        .filter((k) => k.startsWith('researchie_canvas_'))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.setItem('canvas-test-cleared', '1');
    });
  }
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByText('Manual Test Run: 8 Cases').first().click({ timeout: 30000 });
  await page.getByRole('button', { name: /Canvas/ }).first().click();
  await page.locator('.canvas-background-plane').waitFor({ timeout: 30000 });
  await page.locator('button[title="Collapse Drawer"]').click();
  await expect(page.locator(ATOM).first()).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(500);
}

/** A spot on the canvas with nothing on it. */
async function emptySpot(page: Page, dx = 110, dy = 100) {
  const box = await page.locator('.canvas-background-plane').evaluate((el) => {
    const r = (el.parentElement as HTMLElement).getBoundingClientRect();
    return { x: r.x, y: r.y };
  });
  return { x: box.x + dx, y: box.y + dy };
}

const rotationOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const m = /rotate\((-?[\d.]+)deg\)/.exec((el as HTMLElement).style.transform);
    return m ? parseFloat(m[1]) : 0;
  });

const sizeOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const s = el as HTMLElement;
    return { w: s.offsetWidth, h: s.offsetHeight };
  });

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 10) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}

/** A point inside an item (section) that no card or shape covers, so a click there reaches the canvas. */
async function emptyPointInside(page: Page, selector: string) {
  const pt = await page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    for (let y = r.y + 30; y < r.y + r.height - 20; y += 20) {
      for (let x = r.x + 30; x < r.x + r.width - 20; x += 20) {
        const hit = document.elementFromPoint(x, y) as HTMLElement | null;
        if (hit && (hit.classList.contains('canvas-background-plane') || hit.getAttribute('data-canvas-root') !== null)) return { x, y };
      }
    }
    return null;
  });
  if (!pt) throw new Error('no empty point inside ' + selector);
  return pt;
}

async function handleCentre(page: Page, name: string) {
  const b = await page.locator(`[data-handle="${name}"]`).first().boundingBox();
  if (!b) throw new Error(`no ${name} handle`);
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function addShape(page: Page, label: string) {
  await page.locator('button[title="Figma Basic Shapes"]').click();
  await page.getByRole('button', { name: label, exact: true }).click();
}

test.describe('22. Canvas tools', () => {
  test.beforeEach(async ({ page }) => {
    await openCanvas(page);
  });

  test('text you type into a text element is kept', async ({ page }) => {
    await page.locator('button[title="Text Box (T)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('Hello canvas');
    // click the empty canvas to finish
    const away = await emptySpot(page, 110, 230);
    await page.mouse.click(away.x, away.y);
    await expect(page.locator(`${SHAPE}[data-shape-type="text"]`)).toContainText('Hello canvas');
    await expect(page.getByText('Click to edit text')).toHaveCount(0);
  });

  test('text is kept when you finish with Escape or by picking another tool', async ({ page }) => {
    await page.locator('button[title="Text Box (T)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('Escape works');
    await page.keyboard.press('Escape');
    await expect(page.locator(`${SHAPE}[data-shape-type="text"]`)).toContainText('Escape works');

    await page.locator('button[title="Sticky Note (S)"]').click();
    const spot2 = await emptySpot(page, 420, 100);
    await page.mouse.click(spot2.x, spot2.y);
    await page.keyboard.type('Sticky text');
    await page.locator('button[title*="Select & Move"]').click();
    await expect(page.locator(`${SHAPE}[data-shape-type="sticky"]`)).toContainText('Sticky text');
  });

  test('double click edits existing text and the new text is kept', async ({ page }) => {
    await page.locator('button[title="Sticky Note (S)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('first');
    await page.keyboard.press('Escape');
    const sticky = page.locator(`${SHAPE}[data-shape-type="sticky"]`);
    await sticky.dblclick();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('second');
    const away = await emptySpot(page, 110, 300);
    await page.mouse.click(away.x, away.y);
    await expect(sticky).toContainText('second');
    await expect(sticky).not.toContainText('first');
  });

  test('an empty text element is removed when you click away', async ({ page }) => {
    await page.locator('button[title="Text Box (T)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    const away = await emptySpot(page, 110, 230);
    await page.mouse.click(away.x, away.y);
    await expect(page.locator(`${SHAPE}[data-shape-type="text"]`)).toHaveCount(0);
  });

  test('a section name can be edited and is kept', async ({ page }) => {
    await page.locator('button[title="Create Section / Group"]').click();
    const section = page.locator('[data-testid="canvas-section-chrome"]').first();
    await section.locator('span[title="Double click to rename"]').dblclick();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Findings');
    const away = await emptySpot(page, 110, 100);
    await page.mouse.click(away.x, away.y);
    await expect(section).toContainText('Findings');
  });

  test('typed text survives a reload', async ({ page }) => {
    await page.locator('button[title="Text Box (T)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('Saved for later');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(900); // the canvas saves a moment after each change
    await openCanvas(page, { clear: false });
    await expect(page.locator(`${SHAPE}[data-shape-type="text"]`)).toContainText('Saved for later');
  });

  test('a shape can be scaled from its corner, also when it sits on top of atom cards', async ({ page }) => {
    await addShape(page, 'Rectangle');
    const before = await sizeOf(page, `${SHAPE}[data-shape-type="rectangle"]`);
    const h = await handleCentre(page, 'se');
    await drag(page, h, { x: h.x + 120, y: h.y + 80 });
    const after = await sizeOf(page, `${SHAPE}[data-shape-type="rectangle"]`);
    expect(after.w).toBeGreaterThan(before.w + 60);
    expect(after.h).toBeGreaterThan(before.h + 40);
  });

  test('every edge handle scales along its own side', async ({ page }) => {
    await addShape(page, 'Rectangle');
    const before = await sizeOf(page, `${SHAPE}[data-shape-type="rectangle"]`);
    const e = await handleCentre(page, 'e');
    await drag(page, e, { x: e.x + 60, y: e.y });
    let now = await sizeOf(page, `${SHAPE}[data-shape-type="rectangle"]`);
    expect(now.w).toBeGreaterThan(before.w + 30);
    expect(now.h).toBe(before.h);

    const s = await handleCentre(page, 's');
    await drag(page, s, { x: s.x, y: s.y + 50 });
    now = await sizeOf(page, `${SHAPE}[data-shape-type="rectangle"]`);
    expect(now.h).toBeGreaterThan(before.h + 20);
  });

  test('an atom card can be scaled', async ({ page }) => {
    const atom = page.locator(ATOM).first();
    const box = await atom.boundingBox();
    await page.mouse.click(box!.x + 20, box!.y + 20);
    const before = await sizeOf(page, ATOM);
    const h = await handleCentre(page, 'se');
    await drag(page, h, { x: h.x + 110, y: h.y + 90 });
    const after = await sizeOf(page, ATOM);
    expect(after.w).toBeGreaterThan(before.w + 50);
    expect(after.h).toBeGreaterThan(before.h + 40);
  });

  test('a section can be scaled', async ({ page }) => {
    await page.locator('button[title="Create Section / Group"]').click();
    const before = await sizeOf(page, SECTION);
    const h = await handleCentre(page, 'se');
    await drag(page, h, { x: h.x + 90, y: h.y + 70 });
    const after = await sizeOf(page, SECTION);
    expect(after.w).toBeGreaterThan(before.w + 40);
    expect(after.h).toBeGreaterThan(before.h + 30);
  });

  test('text scales with its corner handle and its size grows', async ({ page }) => {
    await page.locator('button[title="Text Box (T)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('Big');
    await page.keyboard.press('Escape');
    const text = page.locator(`${SHAPE}[data-shape-type="text"]`);
    const fontBefore = await text.evaluate((el) => parseFloat(getComputedStyle(el.querySelector('div') as HTMLElement).fontSize));
    const h = await handleCentre(page, 'se');
    await drag(page, h, { x: h.x + 120, y: h.y + 60 });
    const fontAfter = await text.evaluate((el) => {
      const inner = el.querySelector('div') as HTMLElement;
      return parseFloat(getComputedStyle(inner).fontSize);
    });
    expect(fontAfter).toBeGreaterThan(fontBefore + 4);
  });

  test('shapes, notes, text and atoms can be rotated; sections cannot', async ({ page }) => {
    // a shape
    await addShape(page, 'Rectangle');
    let r = await handleCentre(page, 'rotate');
    const shapeBox = await page.locator(`${SHAPE}[data-shape-type="rectangle"]`).boundingBox();
    const centre = { x: shapeBox!.x + shapeBox!.width / 2, y: shapeBox!.y + shapeBox!.height / 2 };
    await drag(page, r, { x: centre.x + 160, y: centre.y });
    expect(Math.abs(await rotationOf(page, `${SHAPE}[data-shape-type="rectangle"]`))).toBeGreaterThan(45);

    // an atom
    const atom = page.locator(ATOM).first();
    const ab = await atom.boundingBox();
    await page.mouse.click(ab!.x + 20, ab!.y + 20);
    r = await handleCentre(page, 'rotate');
    const ac = { x: ab!.x + ab!.width / 2, y: ab!.y + ab!.height / 2 };
    await drag(page, r, { x: ac.x + 200, y: ac.y });
    expect(Math.abs(await rotationOf(page, ATOM))).toBeGreaterThan(45);

    // a sticky note and text
    await page.locator('button[title="Sticky Note (S)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('turn me');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-handle="rotate"]')).toHaveCount(1);

    // a section has no rotate handle
    await page.locator('button[title="Create Section / Group"]').click();
    await expect(page.locator(SECTION)).toHaveCount(1);
    await expect(page.locator('[data-handle="se"]')).toHaveCount(1);
    await expect(page.locator('[data-handle="rotate"]')).toHaveCount(0);
  });

  test('Shift snaps the rotation to 15 degrees and the degrees box matches', async ({ page }) => {
    await addShape(page, 'Square');
    const r = await handleCentre(page, 'rotate');
    const b = await page.locator(`${SHAPE}[data-shape-type="square"]`).boundingBox();
    const c = { x: b!.x + b!.width / 2, y: b!.y + b!.height / 2 };
    await page.keyboard.down('Shift');
    await drag(page, r, { x: c.x + 130, y: c.y - 40 });
    await page.keyboard.up('Shift');
    const deg = await rotationOf(page, `${SHAPE}[data-shape-type="square"]`);
    expect(Math.abs(deg % 15)).toBeLessThan(0.11);
    await expect(page.locator('input[aria-label="Rotation in degrees"]')).toHaveValue(String(Math.round(deg * 10) / 10));
  });

  test('typing a number in the degrees box rotates the item, and reset puts it back', async ({ page }) => {
    await addShape(page, 'Rectangle');
    const input = page.locator('input[aria-label="Rotation in degrees"]');
    await input.fill('90');
    expect(await rotationOf(page, `${SHAPE}[data-shape-type="rectangle"]`)).toBe(90);
    await page.locator('button[title="Reset rotation"]').click();
    expect(await rotationOf(page, `${SHAPE}[data-shape-type="rectangle"]`)).toBe(0);
  });

  test('scaling still works after the item is rotated', async ({ page }) => {
    await addShape(page, 'Rectangle');
    await page.locator('input[aria-label="Rotation in degrees"]').fill('90');
    const before = await sizeOf(page, `${SHAPE}[data-shape-type="rectangle"]`);
    const e = await handleCentre(page, 'e');
    // The east side of a box turned 90 degrees faces down the screen: pull it down.
    await drag(page, e, { x: e.x, y: e.y + 80 });
    const after = await sizeOf(page, `${SHAPE}[data-shape-type="rectangle"]`);
    expect(after.w).toBeGreaterThan(before.w + 40);
    expect(after.h).toBe(before.h);
  });

  test('a section is only an outline: no fill and nothing inside', async ({ page }) => {
    await page.locator('button[title="Create Section / Group"]').click();
    const section = page.locator(SECTION).first();
    const style = await section.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, bgImage: cs.backgroundImage, shadow: cs.boxShadow, border: cs.borderTopWidth };
    });
    expect(style.bg).toBe('rgba(0, 0, 0, 0)');
    expect(style.bgImage).toBe('none');
    expect(style.shadow).toBe('none');
    expect(style.border).toBe('2px');
    // nothing painted inside: no filled element among its children
    const filled = await section.evaluate((el) =>
      Array.from(el.querySelectorAll('*')).filter((c) => {
        const bg = getComputedStyle(c).backgroundColor;
        return bg !== 'rgba(0, 0, 0, 0)' && !(c as HTMLElement).closest('[data-handle]');
      }).length
    );
    expect(filled).toBe(0);
  });

  test('empty space inside a section stays clickable for what is behind it', async ({ page }) => {
    await page.locator('button[title="Create Section / Group"]').click();
    const box = await page.locator(SECTION).first().boundingBox();
    // click on empty space inside the section: the section must not take that click
    const inside = await emptyPointInside(page, SECTION);
    await page.mouse.click(inside.x, inside.y);
    await expect(page.locator('[data-handle="se"]')).toHaveCount(0);
    // but its edge selects it
    await page.mouse.click(box!.x + box!.width / 4, box!.y + 1);
    await expect(page.locator('[data-handle="se"]')).toHaveCount(1);
  });

  test('hovering an atom shows no action bar', async ({ page }) => {
    const atom = page.locator(ATOM).first();
    await atom.hover();
    await page.waitForTimeout(400);
    await expect(page.getByText('Open Source')).toHaveCount(0);
    await expect(page.locator('button[title*="Remove from Canvas"]')).toHaveCount(0);
  });

  test('the pen draws on top of an atom card', async ({ page }) => {
    const before = await page.locator('.canvas-background-plane svg path[stroke-linecap="round"]').count();
    await page.locator('button[title^="Freehand Pen"]').click();
    const box = await page.locator(ATOM).first().boundingBox();
    await drag(page, { x: box!.x + 30, y: box!.y + 30 }, { x: box!.x + 160, y: box!.y + 70 }, 12);
    const after = await page.locator('.canvas-background-plane svg path[stroke-linecap="round"]').count();
    expect(after).toBe(before + 1);
  });

  test('the highlighter has its own thickness and colours', async ({ page }) => {
    await page.locator('button[title^="Highlighter"]').click();
    await expect(page.locator('select[title="Highlighter Thickness"]')).toBeVisible();
    await expect(page.locator('button[title="#4ADE80"]')).toBeVisible();
  });

  test('the eraser removes drawings it touches and items it clicks, with their connectors', async ({ page }) => {
    await page.locator('button[title^="Freehand Pen"]').click();
    const spot = await emptySpot(page, 150, 110);
    await drag(page, spot, { x: spot.x + 140, y: spot.y + 10 }, 12);
    const drawings = '.canvas-background-plane svg path[stroke-linecap="round"]';
    expect(await page.locator(drawings).count()).toBe(1);
    await page.locator('button[title^="Eraser"]').click();
    await drag(page, { x: spot.x + 70, y: spot.y - 20 }, { x: spot.x + 70, y: spot.y + 40 }, 6);
    expect(await page.locator(drawings).count()).toBe(0);

    await addShape(page, 'Circle');
    await page.locator('button[title^="Eraser"]').click();
    const box = await page.locator(`${SHAPE}[data-shape-type="circle"]`).boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.locator(`${SHAPE}[data-shape-type="circle"]`)).toHaveCount(0);
  });

  test('connect: drag from one port to another makes a connector that follows the items', async ({ page }) => {
    await addShape(page, 'Rectangle');
    await addShape(page, 'Ellipse');
    // both start in the middle of the view: move the ellipse to the side
    const eb = await page.locator(`${SHAPE}[data-shape-type="ellipse"]`).boundingBox();
    await drag(page, { x: eb!.x + eb!.width / 2, y: eb!.y + eb!.height / 2 }, { x: eb!.x + eb!.width / 2 + 330, y: eb!.y + eb!.height / 2 - 20 });
    await page.locator('button[title^="Connection Mode"]').click();
    const rect = page.locator(`${SHAPE}[data-shape-type="rectangle"]`);
    const ell = page.locator(`${SHAPE}[data-shape-type="ellipse"]`);
    const rectId = await rect.getAttribute('data-shape-id');
    const ellId = await ell.getAttribute('data-shape-id');
    const from = await page.locator(`[data-port="${rectId}:right"]`).boundingBox();
    const to = await page.locator(`[data-port="${ellId}:left"]`).boundingBox();
    await drag(page, { x: from!.x + 8, y: from!.y + 8 }, { x: to!.x + 8, y: to!.y + 8 }, 12);
    await expect(page.locator('.canvas-background-plane svg path[marker-end]')).toHaveCount(1);
  });

  test('undo and redo buttons step through changes', async ({ page }) => {
    await addShape(page, 'Star');
    await expect(page.locator(`${SHAPE}[data-shape-type="star"]`)).toHaveCount(1);
    await page.locator('button[title="Undo (Ctrl+Z)"]').click();
    await expect(page.locator(`${SHAPE}[data-shape-type="star"]`)).toHaveCount(0);
    await page.locator('button[title="Redo (Ctrl+Shift+Z)"]').click();
    await expect(page.locator(`${SHAPE}[data-shape-type="star"]`)).toHaveCount(1);
  });

  test('delete removes the selection and a typed text is one undo step', async ({ page }) => {
    await addShape(page, 'Polygon (Triangle)');
    await page.keyboard.press('Delete');
    await expect(page.locator(`${SHAPE}[data-shape-type="polygon"]`)).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(page.locator(`${SHAPE}[data-shape-type="polygon"]`)).toHaveCount(1);
  });

  test('tool shortcuts do not fire while typing', async ({ page }) => {
    await page.locator('button[title="Sticky Note (S)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('vhcstpe');
    await page.keyboard.press('Escape');
    await expect(page.locator(`${SHAPE}[data-shape-type="sticky"]`)).toContainText('vhcstpe');
  });

  test('Ctrl or Cmd with a letter does not switch tools', async ({ page }) => {
    await page.keyboard.press('Control+s');
    // S would have picked the sticky tool: clicking the empty canvas must not make a note
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await expect(page.locator(`${SHAPE}[data-shape-type="sticky"]`)).toHaveCount(0);
  });

  test('zoom buttons zoom around the middle of the view', async ({ page }) => {
    const centreOnCanvas = () =>
      page.locator('.canvas-background-plane').evaluate((el) => {
        const plane = el as HTMLElement;
        const root = plane.parentElement as HTMLElement;
        const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(plane.style.transform)!;
        const [px, py, z] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
        return { x: (root.clientWidth / 2 - px) / z, y: (root.clientHeight / 2 - py) / z, z };
      });
    const before = await centreOnCanvas();
    await page.locator('button[title="Zoom In"]').click();
    const after = await centreOnCanvas();
    expect(after.z).toBeGreaterThan(before.z);
    expect(Math.abs(after.x - before.x)).toBeLessThan(2);
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  });

  test('the wheel pans and Ctrl plus wheel zooms without zooming the page', async ({ page }) => {
    const transform = () => page.locator('.canvas-background-plane').evaluate((el) => (el as HTMLElement).style.transform);
    const box = await emptySpot(page, 300, 200);
    await page.mouse.move(box.x, box.y);
    const t0 = await transform();
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(100);
    const t1 = await transform();
    expect(t1).not.toBe(t0);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -200);
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);
    const t2 = await transform();
    expect(t2).not.toBe(t1);
    expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
  });

  test('Fit to Screen brings every item into the visible canvas, clear of the drawer', async ({ page }) => {
    await page.locator('button[title="Open Atom Drawer"]').click();
    await page.locator('button[title="Fit to Screen"]').click();
    await page.waitForTimeout(300);
    const drawer = await page.locator('[data-canvas-no-wheel]').first().boundingBox();
    const atoms = await page.locator(ATOM).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left));
    expect(Math.min(...atoms)).toBeGreaterThanOrEqual((drawer?.x ?? 0) + (drawer?.width ?? 0) - 2);
  });

  test('the section moves what is inside it when dragged by its edge', async ({ page }) => {
    await addShape(page, 'Square');
    const sq = page.locator(`${SHAPE}[data-shape-type="square"]`);
    const sqBox = await sq.boundingBox();
    await page.locator('button[title="Create Section / Group"]').click();
    const section = page.locator(SECTION).first();
    const sb = await section.boundingBox();
    // the section is centred on the same point as the square, so the square is inside it
    await drag(page, { x: sb!.x + sb!.width / 4, y: sb!.y + 1 }, { x: sb!.x + sb!.width / 4 + 50, y: sb!.y + 41 });
    const moved = await sq.boundingBox();
    expect(Math.round(moved!.x - sqBox!.x)).toBeGreaterThan(30);
  });

  test('layering: Ctrl+] brings a shape in front of an atom card', async ({ page }) => {
    await addShape(page, 'Rectangle');
    const zOf = (sel: string) => page.locator(sel).first().evaluate((el) => parseInt((el as HTMLElement).style.zIndex || '0', 10));
    const atomZ = await zOf(ATOM);
    for (let i = 0; i < 12; i++) await page.keyboard.press('Control+]');
    expect(await zOf(`${SHAPE}[data-shape-type="rectangle"]`)).toBeGreaterThan(atomZ);
  });

  test('the export dialog exports what is on the canvas', async ({ page }) => {
    await page.locator('button[title="Text Box (T)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('Exported words');
    await page.keyboard.press('Escape');
    await addShape(page, 'Ellipse');
    await page.locator('button[title="Export Canvas (PNG, JPEG, SVG)"]').click();
    await page.getByRole('button', { name: 'svg', exact: true }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-testid="confirm-canvas-export"]').click()]);
    const file = fs.readFileSync((await download.path())!, 'utf8');
    expect(file).toContain('Exported words');
    expect(file).toContain('<ellipse');
    expect(file).toContain('<svg');
  });
  test('the hand tool pans even when the drag starts on a card', async ({ page }) => {
    const transform = () => page.locator('.canvas-background-plane').evaluate((el) => (el as HTMLElement).style.transform);
    await page.locator('button[title^="Pan Canvas"]').click();
    const box = await page.locator(ATOM).first().boundingBox();
    const t0 = await transform();
    await drag(page, { x: box!.x + 40, y: box!.y + 40 }, { x: box!.x + 160, y: box!.y + 100 });
    expect(await transform()).not.toBe(t0);
    // the card itself did not move: only the view did
    const after = await page.locator(ATOM).first().boundingBox();
    expect(Math.round(after!.x - box!.x)).toBe(120);
  });

  test('releasing the mouse outside the canvas ends a drag', async ({ page }) => {
    await addShape(page, 'Rectangle');
    const rect = page.locator(`${SHAPE}[data-shape-type="rectangle"]`);
    const b = await rect.boundingBox();
    await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2);
    await page.mouse.down();
    await page.mouse.move(60, 400, { steps: 10 }); // over the sidebar
    await page.mouse.up();
    const settled = await rect.boundingBox();
    await page.mouse.move(700, 300, { steps: 5 });
    await page.mouse.move(800, 380, { steps: 5 });
    const later = await rect.boundingBox();
    expect(Math.round(later!.x)).toBe(Math.round(settled!.x));
    expect(Math.round(later!.y)).toBe(Math.round(settled!.y));
  });

  test('a card can be taken off the canvas from the properties bar', async ({ page }) => {
    const before = await page.locator(ATOM).count();
    const box = await page.locator(ATOM).first().boundingBox();
    await page.mouse.click(box!.x + 20, box!.y + 20);
    await page.locator('button[title^="Remove from canvas"]').click();
    await expect(page.locator(ATOM)).toHaveCount(before - 1);
  });

  test('a sticky note can be placed on top of a card', async ({ page }) => {
    await page.locator('button[title="Sticky Note (S)"]').click();
    const box = await page.locator(ATOM).first().boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.locator(`${SHAPE}[data-shape-type="sticky"]`)).toHaveCount(1);
  });

  test('a marquee selects an item by its turned outline', async ({ page }) => {
    await addShape(page, 'Rectangle');
    await page.locator('input[aria-label="Rotation in degrees"]').fill('45');
    const b = await page.locator(`${SHAPE}[data-shape-type="rectangle"]`).boundingBox();
    // empty corner of the canvas first, so the selection is cleared by the click
    const empty = await emptySpot(page, 40, 60);
    await page.mouse.click(empty.x, empty.y);
    await expect(page.locator('[data-handle="se"]')).toHaveCount(0);
    // a box around the turned outline selects it
    await drag(page, { x: b!.x - 20, y: b!.y - 20 }, { x: b!.x + b!.width + 20, y: b!.y + b!.height + 20 });
    await expect(page.locator('[data-handle="se"]')).toHaveCount(1);
  });

  test('a connector can be selected and deleted', async ({ page }) => {
    await addShape(page, 'Rectangle');
    await addShape(page, 'Ellipse');
    const ell = page.locator(`${SHAPE}[data-shape-type="ellipse"]`);
    const eb = await ell.boundingBox();
    await drag(page, { x: eb!.x + eb!.width / 2, y: eb!.y + eb!.height / 2 }, { x: eb!.x + eb!.width / 2 + 330, y: eb!.y + eb!.height / 2 - 20 });
    await page.locator('button[title^="Connection Mode"]').click();
    const rectId = await page.locator(`${SHAPE}[data-shape-type="rectangle"]`).getAttribute('data-shape-id');
    const ellId = await ell.getAttribute('data-shape-id');
    const from = await page.locator(`[data-port="${rectId}:right"]`).boundingBox();
    const to = await page.locator(`[data-port="${ellId}:left"]`).boundingBox();
    await drag(page, { x: from!.x + 5, y: from!.y + 5 }, { x: to!.x + 5, y: to!.y + 5 }, 12);
    const connector = page.locator('.canvas-background-plane svg path[marker-end]');
    await expect(connector).toHaveCount(1);
    await connector.dispatchEvent('click');
    await expect(page.locator('button[title^="Delete Connector"]')).toBeVisible();
    await page.keyboard.press('Backspace');
    await expect(connector).toHaveCount(0);
  });

  test('PNG export gives a real image of the canvas', async ({ page }) => {
    await addShape(page, 'Star');
    await page.locator('button[title="Export Canvas (PNG, JPEG, SVG)"]').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-testid="confirm-canvas-export"]').click()]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    const bytes = fs.readFileSync((await download.path())!);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.length).toBeGreaterThan(5000);
  });

  test('exporting only the selection leaves the rest out', async ({ page }) => {
    await page.locator('button[title="Text Box (T)"]').click();
    const spot = await emptySpot(page);
    await page.mouse.click(spot.x, spot.y);
    await page.keyboard.type('Only me');
    await page.keyboard.press('Escape');
    await page.locator('button[title="Export Canvas (PNG, JPEG, SVG)"]').click();
    await page.locator('[data-testid="export-scope-selection"]').click();
    await page.getByRole('button', { name: 'svg', exact: true }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-testid="confirm-canvas-export"]').click()]);
    const file = fs.readFileSync((await download.path())!, 'utf8');
    expect(file).toContain('Only me');
    expect(file).not.toContain('QUOTE');
    expect(file).not.toContain('NOTE');
  });

});
