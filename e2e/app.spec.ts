import { expect, test, type Locator } from '@playwright/test';
import { dragToolTo, dragWidget, openApp, position, settled, widgets } from './helpers';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('trascinare un tool dal cassetto crea il widget dove lo lasci', async ({ page }) => {
  const canvas = (await page.locator('.canvas').boundingBox())!;
  await dragToolTo(page, 'Sticky note', 500, 300);

  await expect(widgets(page)).toHaveCount(1);
  const p = await position(widgets(page).first());
  expect(p.x).toBeCloseTo(500 - canvas.x - 110, 0); // centrato sul puntatore (larghezza 220)
  expect(p.y).toBeCloseTo(300 - canvas.y - 16, 0);
});

test('posizione e contenuto si ritrovano alla riapertura', async ({ page }) => {
  await dragToolTo(page, 'Sticky note', 400, 250);
  const w = widgets(page).first();
  await w.locator('textarea').fill('comprare il pane');
  await dragWidget(page, w, 150, 80);
  await settled(w); // il rilascio può lanciare il widget: aspetta che si fermi
  const before = await position(w);
  await page.waitForTimeout(600); // autosave con debounce

  await page.reload();
  await expect(widgets(page)).toHaveCount(1);
  const after = await position(widgets(page).first());
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.y).toBeCloseTo(before.y, 0);
  await expect(widgets(page).first().locator('textarea')).toHaveValue('comprare il pane');
});

test('ricaricando subito dopo una modifica non si perde nulla', async ({ page }) => {
  await dragToolTo(page, 'Sticky note', 400, 250);
  await widgets(page).first().locator('textarea').fill('scritto un attimo prima');
  await page.reload(); // senza attendere il debounce

  await expect(widgets(page)).toHaveCount(1);
  await expect(widgets(page).first().locator('textarea')).toHaveValue('scritto un attimo prima');
});

test('ogni spazio tiene i suoi widget', async ({ page }) => {
  await dragToolTo(page, 'Sticky note', 400, 250);
  await page.getByRole('button', { name: 'New space' }).click();
  await expect(widgets(page)).toHaveCount(0);

  await dragToolTo(page, 'Notebook', 500, 300);
  await expect(widgets(page)).toHaveCount(1);
  await expect(widgets(page).first().locator('.widget-bar')).toContainText('Notebook');

  await page.getByRole('button', { name: 'Space 1', exact: true }).click();
  await expect(widgets(page)).toHaveCount(1);
  await expect(widgets(page).first().locator('.widget-bar')).toContainText('Sticky note');
});

test('la finestra si ridimensiona senza scorrere: i widget restano fissi rispetto al centro, o vengono spinti dentro', async ({ page }) => {
  const overflow = () =>
    page.evaluate(() => {
      const c = document.querySelector('.canvas')!;
      return { canvas: c.scrollWidth - c.clientWidth, page: document.documentElement.scrollWidth - innerWidth };
    });
  const fromCentre = async (w: Locator) => {
    const c = (await page.locator('.canvas').boundingBox())!;
    const b = (await w.boundingBox())!;
    return Math.round(b.x - c.x - c.width / 2);
  };

  await page.setViewportSize({ width: 1100, height: 700 });
  await dragToolTo(page, 'Sticky note', 700, 300);
  const w = widgets(page).first();
  await expect(w).toBeVisible();
  const d0 = await fromCentre(w);

  await page.setViewportSize({ width: 1300, height: 700 });
  await expect.poll(() => fromCentre(w)).toBe(d0); // la finestra si allarga: stessa distanza dal centro

  await page.setViewportSize({ width: 600, height: 700 });
  await expect.poll(async () => (await w.boundingBox())!.x + (await w.boundingBox())!.width).toBeLessThanOrEqual(600 + 12); // spinto dentro
  expect(await overflow()).toEqual({ canvas: 0, page: 0 }); // niente scorrimento da nessuna parte

  await page.setViewportSize({ width: 1100, height: 700 });
  await expect.poll(() => fromCentre(w)).toBe(d0); // allargando torna dov'era
});

test('un widget lanciato continua a muoversi e resta dentro i bordi', async ({ page }) => {
  await dragToolTo(page, 'Sticky note', 300, 300);
  const w = widgets(page).first();
  const canvas = (await page.locator('.canvas').boundingBox())!;
  const start = await position(w);

  await dragWidget(page, w, 360, 0, 6); // gesto rapido, rilascio mentre si muove
  const release = await position(w);
  await settled(w);
  const end = await position(w);

  expect(release.x).toBeGreaterThan(start.x + 100);
  expect(end.x).toBeGreaterThan(release.x + 40); // ha proseguito per inerzia
  expect(end.x + 220).toBeLessThanOrEqual(canvas.width + 0.5); // senza uscire dalla tela
});

test('barra di ricerca fissa: coperta diventa trasparente e "\\" la porta davanti', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Search bar in the centre').check();
  await page.getByRole('button', { name: 'Settings' }).click();

  const bar = page.locator('.fixed-search');
  await expect(bar).toBeVisible();
  await expect(bar).not.toHaveClass(/covered/);

  const box = (await bar.boundingBox())!;
  await dragToolTo(page, 'Sticky note', box.x + box.width / 2, box.y + box.height / 2);
  await expect(widgets(page)).toHaveCount(1);
  await expect(bar).toHaveClass(/covered/);
  await expect(bar.locator('input')).toHaveAttribute('placeholder', 'Move the widgets or press \\ to search');

  await page.keyboard.press('Backslash');
  await expect(bar.locator('input')).toBeFocused();
  await expect(page.locator('.fixed-search-anchor.raised')).toHaveCount(1);
  await expect(bar).not.toHaveClass(/covered/);

  await page.keyboard.press('Escape');
  await expect(bar).toHaveClass(/covered/);
});
