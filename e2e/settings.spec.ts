import { expect, test, type Page } from '@playwright/test';
import { dragToolTo, dragWidget, openApp, position, readSaved, seed, settled, widgets } from './helpers';

const openSettings = (page: Page) => page.getByRole('button', { name: 'Impostazioni' }).click();
const transformOf = (page: Page) => widgets(page).first().evaluate((el) => (el as HTMLElement).style.transform);

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('inclinazione casuale: si può spegnere e riaccendere ritrovando lo stesso angolo', async ({ page }) => {
  await dragToolTo(page, 'Post-it', 400, 250);
  const angle = await transformOf(page);
  expect(angle).toMatch(/rotate\(/);

  await openSettings(page);
  await page.getByLabel('Inclinazione casuale dei widget').uncheck();
  await expect.poll(() => transformOf(page)).toBe('');
  await page.getByLabel('Inclinazione casuale dei widget').check();
  await expect.poll(() => transformOf(page)).toBe(angle);
});

test('lancio con inerzia spento: il widget si ferma dove lo lasci', async ({ page }) => {
  await openSettings(page);
  await page.getByLabel('Lancio con inerzia').uncheck();
  await openSettings(page);

  await dragToolTo(page, 'Post-it', 300, 300);
  const w = widgets(page).first();
  await dragWidget(page, w, 360, 0, 6); // lo stesso gesto rapido che con il lancio acceso lo fa proseguire
  const release = await position(w);
  await page.waitForTimeout(700);
  expect(await position(w)).toEqual(release);
});

test('cassetti per categoria: filtrano i tool e si possono spegnere', async ({ page }) => {
  const tools = () => page.locator('.drawer-item');
  const all = await tools().count();
  expect(all).toBeGreaterThan(20);

  await page.getByRole('tab', { name: 'Tempo' }).click();
  const timeTools = await tools().count();
  expect(timeTools).toBeLessThan(all);
  await expect(page.locator('.drawer-item[aria-label="Timer"]')).toHaveCount(1);
  await expect(page.locator('.drawer-item[aria-label="Post-it"]')).toHaveCount(0);

  await openSettings(page);
  await page.getByLabel('Cassetti per categoria').uncheck();
  await expect(page.locator('.drawer-cats')).toHaveCount(0);
  await expect(tools()).toHaveCount(all); // spenti: tornano tutti i tool
});

test('stile dei cassetti: la scelta resta dopo la ricarica', async ({ page }) => {
  await expect(page.locator('.drawer--tucked')).toHaveCount(1);
  await openSettings(page);
  await page.getByLabel('Stile dei cassetti').selectOption({ label: 'Di sbieco' });
  await expect(page.locator('.drawer--slanted')).toHaveCount(1);
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator('.drawer--slanted')).toHaveCount(1);
});

test('tema: si applica, si ritrova alla riapertura e c\'è già al primo disegno (niente sfarfallio)', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('radio', { name: 'Bosco' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'forest');
  await page.waitForTimeout(500);

  // Registra il tema nell'istante in cui React disegna per la prima volta.
  await page.addInitScript(() => {
    new MutationObserver(() => {
      const root = document.getElementById('root');
      const w = window as unknown as { __themeAtFirstPaint?: string | null };
      if (root?.childElementCount && w.__themeAtFirstPaint === undefined) w.__themeAtFirstPaint = document.documentElement.dataset.theme ?? null;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
  expect(await page.evaluate(() => (window as unknown as { __themeAtFirstPaint?: string }).__themeAtFirstPaint)).toBe('forest');
});

test('un salvataggio del vecchio formato (v1) si apre e viene aggiornato', async ({ page }) => {
  await seed(page, {
    version: 1,
    activeWorkspaceId: 'a',
    workspaces: [{ id: 'a', name: 'Vecchio spazio', order: 0, widgets: [{ id: 'w', type: 'postit', x: 50, y: 60, w: 220, h: 200, z: 1, state: { text: 'dal passato' } }] }],
  });
  await expect(page.locator('.tab.active')).toContainText('Vecchio spazio');
  await expect(widgets(page)).toHaveCount(1);
  await expect(widgets(page).first().locator('textarea')).toHaveValue('dal passato');

  // Una modifica lo riscrive nel formato attuale, con le impostazioni predefinite.
  await dragWidget(page, widgets(page).first(), 80, 40);
  await settled(widgets(page).first());
  await page.waitForTimeout(600);
  const saved = await readSaved(page);
  expect(saved.version).toBe(2);
  expect(saved.settings).toMatchObject({ tilt: true, physics: true, theme: 'warm', categories: true });
  expect(saved.workspaces[0].widgets[0]).toMatchObject({ rot: 0, state: { text: 'dal passato' } });
});
