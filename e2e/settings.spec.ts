import { expect, test, type Page } from '@playwright/test';
import { appData, dragToolTo, dragWidget, openApp, position, readSaved, seed, settled, widgets } from './helpers';

const openSettings = (page: Page) => page.getByRole('button', { name: 'Settings' }).click();
const transformOf = (page: Page) => widgets(page).first().evaluate((el) => (el as HTMLElement).style.transform);

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('inclinazione casuale: si può spegnere e riaccendere ritrovando lo stesso angolo', async ({ page }) => {
  await dragToolTo(page, 'Sticky note', 400, 250);
  const angle = await transformOf(page);
  expect(angle).toMatch(/rotate\(/);

  await openSettings(page);
  await page.getByLabel('Random tilt on widgets').uncheck();
  await expect.poll(() => transformOf(page)).toBe('');
  await page.getByLabel('Random tilt on widgets').check();
  await expect.poll(() => transformOf(page)).toBe(angle);
});

test('lancio con inerzia spento: il widget si ferma dove lo lasci', async ({ page }) => {
  await openSettings(page);
  await page.getByLabel('Throw with momentum').uncheck();
  await openSettings(page);

  await dragToolTo(page, 'Sticky note', 300, 300);
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

  await page.getByRole('tab', { name: 'Time' }).click();
  const timeTools = await tools().count();
  expect(timeTools).toBeLessThan(all);
  await expect(page.locator('.drawer-item[aria-label="Timer"]')).toHaveCount(1);
  await expect(page.locator('.drawer-item[aria-label="Post-it"]')).toHaveCount(0);

  await openSettings(page);
  await page.getByLabel('Drawers by category').uncheck();
  await expect(page.locator('.drawer-cats')).toHaveCount(0);
  await expect(tools()).toHaveCount(all); // spenti: tornano tutti i tool
});

test('stile dei cassetti: la scelta resta dopo la ricarica', async ({ page }) => {
  await expect(page.locator('.drawer--tucked')).toHaveCount(1);
  await openSettings(page);
  await page.getByLabel('Drawer style').selectOption({ label: 'Slanted' });
  await expect(page.locator('.drawer--slanted')).toHaveCount(1);
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator('.drawer--slanted')).toHaveCount(1);
});

test('tema: si applica, si ritrova alla riapertura e c\'è già al primo disegno (niente sfarfallio)', async ({ page }) => {
  await openSettings(page);
  await page.getByRole('radio', { name: 'Forest' }).click();
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
  expect(saved.version).toBe(3);
  expect(saved.settings).toMatchObject({ tilt: true, physics: true, theme: 'warm', categories: true });
  expect(saved.workspaces[0].widgets[0]).toMatchObject({ rot: 0, state: { text: 'dal passato' } });
});

test('lingua: inglese di default, si cambia in italiano dalle impostazioni e si ritrova alla riapertura', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.drawer-item[data-type="todo"]')).toHaveAttribute('aria-label', 'To do');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Language').selectOption('it');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await expect(page.locator('.drawer-item[data-type="todo"]')).toHaveAttribute('aria-label', 'Da fare');
  await expect(page.getByRole('button', { name: 'Impostazioni' })).toBeVisible();

  await page.waitForTimeout(600); // autosave con debounce
  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
  await expect(page.locator('.drawer-item[data-type="todo"]')).toHaveAttribute('aria-label', 'Da fare');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
});

test('lingua: una lingua sconosciuta nei dati salvati torna all’inglese', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { language: 'xx' }));
  await expect(page.locator('.drawer-item[data-type="todo"]')).toHaveAttribute('aria-label', 'To do');
});

test('impostazioni: il pannello mostra i crediti e il pulsante è ben grande', async ({ page }) => {
  await openApp(page);
  const button = page.getByRole('button', { name: 'Settings' });
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(34);
  await button.click();
  await expect(page.locator('.credits')).toContainText('Valentino Artizzu');
  await expect(page.locator('.credits a')).toHaveAttribute('href', /github\.com\/Tizzu\/Desktop-in-a-desktop/);
});

test('esporta e importa: i dati si ritrovano dopo una sostituzione', async ({ page }) => {
  await dragToolTo(page, 'Sticky note', 400, 250);
  await widgets(page).first().locator('textarea').fill('da salvare');
  await openSettings(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export to file' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^desktop-in-a-desktop-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();

  await widgets(page).first().getByRole('button', { name: 'Remove widget' }).click();
  await expect(widgets(page)).toHaveCount(0);

  page.once('dialog', (d) => void d.accept());
  await page.getByLabel('Backup file').setInputFiles(file);
  await expect(widgets(page)).toHaveCount(1);
  await expect(widgets(page).first().locator('textarea')).toHaveValue('da salvare');

  // Un file sbagliato viene rifiutato senza toccare niente.
  let message = '';
  page.once('dialog', (d) => { message = d.message(); void d.accept(); });
  await page.getByLabel('Backup file').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"no":1}') });
  await expect.poll(() => message).toContain('not a valid backup');
  await expect(widgets(page)).toHaveCount(1);
});

test('esporta come testo: si copia una stringa e la si incolla per ripristinare', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await dragToolTo(page, 'Sticky note', 400, 250);
  await widgets(page).first().locator('textarea').fill('via chat');
  await openSettings(page);
  await page.getByRole('button', { name: 'Copy as text' }).click();
  await expect(page.getByRole('status')).toContainText('Copied');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^DIAD1:[A-Za-z0-9_-]+:END$/);

  await widgets(page).first().getByRole('button', { name: 'Remove widget' }).click();
  await expect(widgets(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Paste from text' }).click();
  // Una chat può spezzare la riga e aggiungere parole intorno: si ritrova lo stesso.
  await page.getByLabel('Backup text').fill(`Ecco il mio desk!\n${text.slice(0, 40)}\n${text.slice(40)}\nciao`);
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(widgets(page)).toHaveCount(1);
  await expect(widgets(page).first().locator('textarea')).toHaveValue('via chat');

  await expect(page.getByLabel('Backup text')).toHaveCount(0); // dopo l'importazione l'area si chiude
  await page.getByRole('button', { name: 'Paste from text' }).click();
  page.once('dialog', (d) => void d.accept());
  await page.getByLabel('Backup text').fill('DIAD1:nonvalido:END');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(widgets(page)).toHaveCount(1);
});
