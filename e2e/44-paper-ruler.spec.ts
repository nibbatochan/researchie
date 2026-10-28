import { test, expect, type Page } from '@playwright/test';

// The ruler above the page: units for the page size, handles that set the margin (drag, then arrow keys), guide lines
// while dragging, the margin saved with the paper, and a switch in Page settings. Papers made here are removed.
const TAG = `E2E-RU ${Date.now()}`;

test.afterEach(async ({ request }) => {
  const live = ((await (await request.get('/api/papers')).json()).data as any[]) ?? [];
  for (const p of live) if (p.title.startsWith(TAG)) await request.delete(`/api/papers/${p.id}`);
  const trash = ((await (await request.get('/api/papers?trash=1')).json()).data as any[]) ?? [];
  for (const p of trash) if (p.title.startsWith(TAG)) await request.post('/api/papers', { data: { action: 'purge', id: p.id } });
});

async function open(page: Page, name: string) {
  await page.goto('/');
  await page.getByTestId('paper-mode-button').click();
  await page.getByTestId('new-paper-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('template-use').click();
  await page.getByTestId('paper-name').fill(name);
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await expect(page.getByTestId('paper-ruler')).toBeVisible();
}

const padLeft = (page: Page) => page.getByTestId('paper-sheet').locator('> div.relative.z-10').evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft));

test('dragging a ruler handle sets the margin, shows guides while it moves, and is saved', async ({ page }) => {
  await open(page, `${TAG} drag`);
  const ruler = page.getByTestId('paper-ruler');
  await expect(ruler).toHaveAttribute('data-margin-px', '96');
  expect(await padLeft(page)).toBe(96);

  const handle = page.getByTestId('ruler-handle-left');
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 48, box.y + box.height / 2, { steps: 6 }); // 48 px toward the page edge
  await expect(page.getByTestId('margin-guide').first()).toBeVisible(); // guides while dragging
  await page.mouse.up();
  await expect(page.getByTestId('margin-guide')).toHaveCount(0);
  await expect(ruler).toHaveAttribute('data-margin-px', '48');
  expect(await padLeft(page)).toBe(48);
  await expect(page.getByTestId('save-status')).toContainText('Saved', { timeout: 10000 });

  // Page settings names it custom
  await page.getByTestId('tb-page').click();
  await expect(page.getByTestId('ps-margin')).toHaveValue('custom');
  await page.getByTestId('ps-margin').selectOption('wide');
  await expect(ruler).toHaveAttribute('data-margin-px', '120');
});

test('the arrow keys move a handle, and the right handle sets the same margin', async ({ page }) => {
  await open(page, `${TAG} keys`);
  const ruler = page.getByTestId('paper-ruler');
  await page.getByTestId('ruler-handle-right').focus();
  await page.keyboard.press('ArrowLeft'); // toward the page centre on the right side: margin grows by 12 px
  await expect(ruler).toHaveAttribute('data-margin-px', '108');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(ruler).toHaveAttribute('data-margin-px', '84');
  await expect(page.getByTestId('ruler-handle-left')).toHaveAttribute('aria-valuetext', /cm/);
});

test('the ruler can be turned off in Page settings and stays off after a reload', async ({ page }) => {
  await open(page, `${TAG} switch`);
  await page.getByTestId('tb-page').click();
  await page.getByTestId('ps-ruler').uncheck();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('paper-ruler')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('paper-editor')).toBeVisible();
  await expect(page.getByTestId('paper-ruler')).toHaveCount(0);
  await page.getByTestId('tb-page').click();
  await page.getByTestId('ps-ruler').check();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('paper-ruler')).toBeVisible();
});

test('the ruler lines up with the page', async ({ page }) => {
  await open(page, `${TAG} align`);
  const ruler = (await page.getByTestId('paper-ruler').boundingBox())!;
  const sheet = (await page.getByTestId('paper-sheet').boundingBox())!;
  expect(Math.abs(ruler.x - sheet.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(ruler.width - sheet.width)).toBeLessThanOrEqual(2);
});
