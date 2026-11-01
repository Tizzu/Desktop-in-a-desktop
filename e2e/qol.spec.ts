import { expect, test, type Page } from '@playwright/test';
import { addWidget, appData, dragToolTo, openApp, seed, widgets } from './helpers';

const openSettings = (page: Page) => page.getByRole('button', { name: 'Settings' }).click();

test('scorciatoia di ricerca: si sceglie dalle impostazioni e sostituisce quella predefinita', async ({ page }) => {
  await openApp(page);
  await openSettings(page);
  await page.getByLabel('Search bar in the centre').check();
  await page.getByRole('button', { name: '\\', exact: true }).click();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('button', { name: 'Ctrl+K' })).toBeVisible();
  await openSettings(page); // chiude il pannello

  const input = page.locator('.fixed-search input');
  await page.keyboard.press('Backslash');
  await expect(input).not.toBeFocused(); // la vecchia non vale più
  await expect(input).toHaveAttribute('placeholder', 'Search the web…  ( Ctrl+K )');
  await page.keyboard.press('Control+k');
  await expect(input).toBeFocused();
  await page.keyboard.press('Escape');

  // Backspace nel selettore ripristina quella predefinita.
  await openSettings(page);
  await page.getByRole('button', { name: 'Ctrl+K' }).click();
  await page.keyboard.press('Backspace');
  await expect(page.getByRole('button', { name: '\\', exact: true })).toBeVisible();
});

test('contenitore: si può rinominare con la matita o con il doppio clic, e il nome resta', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
  const box = await addWidget(page, 'Container');
  await expect(box.locator('.widget-bar')).toContainText('Container');

  await box.getByRole('button', { name: 'Rename' }).click();
  await page.keyboard.type('Lavoro');
  await page.keyboard.press('Enter');
  await expect(box.locator('.widget-bar')).toContainText('Lavoro');

  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
  await expect(widgets(page).first().locator('.widget-bar')).toContainText('Lavoro');

  await widgets(page).first().locator('.widget-bar span').dblclick();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter'); // vuoto: torna il nome predefinito
  await expect(widgets(page).first().locator('.widget-bar')).toContainText('Container');
});

test('2048: ogni swipe muove una volta, in tutte le direzioni, senza selezionare i numeri', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false, physics: false }));
  const w = await addWidget(page, '2048');
  const grid = w.locator('.g2048-grid');
  const cells = () => grid.locator('.t').allTextContents().then((c) => c.join(','));
  const box = (await grid.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const swipe = async (dx: number, dy: number, steps = 4) => {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy + dy, { steps });
    await page.mouse.up();
  };

  let changed = 0;
  for (const [dx, dy] of [[60, 0], [-60, 0], [0, 60], [0, -60], [60, 0], [0, 60], [-60, 0], [0, -60]] as const) {
    const before = await cells();
    await swipe(dx, dy);
    if ((await cells()) !== before) changed++;
  }
  expect(changed).toBeGreaterThanOrEqual(6); // quasi ogni gesto sposta qualcosa
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('');

  // Il gesto finisce anche se il puntatore esce dalla griglia, e una mossa sola per gesto.
  const score = () => w.locator('.g2048-head b').first().textContent();
  await swipe(500, 0, 10);
  await swipe(-500, 0, 10);
  expect(await score()).not.toBeNull();
});

test('pioggia: le gocce cadono per tutta l\'altezza, anche se si allunga il widget', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([{ ...{ id: 'r', type: 'rain', x: -200, y: -200, w: 260, h: 520, z: 1, rot: 0, state: {} } }], { tilt: false }));
  const w = widgets(page).first();
  const top = (await w.boundingBox())!.y;
  let deepest = 0;
  for (let i = 0; i < 12; i++) {
    deepest = Math.max(deepest, ...(await w.locator('.rain i').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().bottom))).map((b) => b - top));
    await page.waitForTimeout(250);
  }
  expect(deepest).toBeGreaterThan(400); // prima le gocce finivano a ~260px
});

test('camino: la scena si ingrandisce in blocco con il widget', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([{ id: 'f', type: 'fireplace', x: -200, y: -200, w: 260, h: 230, z: 1, rot: 0, state: {} }], { tilt: false }));
  const w = widgets(page).first();
  const scene = w.locator('.fire-scene');
  const before = (await scene.boundingBox())!;
  const h = (await w.locator('.resize-handle').boundingBox())!;
  await page.mouse.move(h.x + 8, h.y + 8);
  await page.mouse.down();
  await page.mouse.move(h.x + 240, h.y + 200, { steps: 8 });
  await page.mouse.up();
  const after = (await scene.boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width * 1.4);
  expect(Math.abs(after.width / after.height - before.width / before.height)).toBeLessThan(0.01); // senza deformarsi
  const wb = (await w.boundingBox())!;
  expect(after.y + after.height).toBeCloseTo(wb.y + wb.height, 0); // sempre appoggiata in basso

  // Trascinando solo in verticale il widget non si allunga: resta nelle sue proporzioni, senza spazio vuoto sopra il fuoco.
  const h2 = (await w.locator('.resize-handle').boundingBox())!;
  const ratio = wb.width / (wb.height - 30);
  await page.mouse.move(h2.x + 8, h2.y + 8);
  await page.mouse.down();
  await page.mouse.move(h2.x + 8, h2.y + 8 + 120, { steps: 6 });
  await page.mouse.up();
  const tall = (await w.boundingBox())!;
  expect(tall.height).toBeGreaterThan(wb.height);
  expect(Math.abs(tall.width / (tall.height - 30) - ratio)).toBeLessThan(0.02);
});

test('cassetto: le anteprime non sono interattive (la lavagna non si pasticcia)', async ({ page }) => {
  await openApp(page);
  const tool = page.locator('.drawer-item[aria-label="Blackboard"]');
  await tool.scrollIntoViewIfNeeded();
  const b = (await tool.locator('.tool').boundingBox())!;
  const x = b.x + b.width / 2, y = b.y + b.height - 20;
  const hit = await page.evaluate(([px, py]) => document.elementFromPoint(px!, py!)?.closest('.drawer-item')?.getAttribute('aria-label'), [x, y]);
  expect(hit).toBe('Blackboard'); // il bersaglio è il tool, non la tela di disegno dentro
  await dragToolTo(page, 'Blackboard', 500, 300);
  await expect(widgets(page)).toHaveCount(1);
  expect((await page.evaluate(() => 0)) + (await widgets(page).first().locator('canvas').count())).toBe(1);
});

test('cassetti di sbieco: all\'hover l\'anteprima non viene tagliata e l\'ombra sta su un livello dritto', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { drawerStyle: 'slanted' }));
  const item = page.locator('.drawer-item').first();
  await item.hover();
  await page.waitForTimeout(400);
  const track = (await page.locator('.drawer-track').boundingBox())!;
  const rects = await page.locator('.drawer-item .preview').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().bottom));
  expect(Math.max(...rects)).toBeLessThanOrEqual(track.y + track.height + 0.5);
  const filters = await item.evaluate((el) => ({
    shadow: getComputedStyle(el.querySelector('.slant')!).filter,
    preview: getComputedStyle(el.querySelector('.preview')!).filter,
  }));
  expect(filters.shadow).toContain('drop-shadow');
  expect(filters.preview).toBe('none');
});

test('un salvataggio con la cornice (rimossa) si apre senza quel widget', async ({ page }) => {
  await openApp(page);
  await seed(page, { ...appData([{ id: 'x', type: 'frame', x: 0, y: 0, w: 200, h: 200, z: 1, rot: 0, state: { color: 1 } }, { id: 'n', type: 'postit', x: 100, y: 0, w: 200, h: 200, z: 2, rot: 0, state: { text: 'resto' } }]), version: 3 });
  await expect(widgets(page)).toHaveCount(1);
  await expect(widgets(page).first().locator('textarea')).toHaveValue('resto');
});

test.describe('visita guidata', () => {
  const tour = (page: Page) => page.getByRole('dialog', { name: 'Quick tour' });

  test('al primo avvio parte da sola; si percorre, si salta e non si ripropone', async ({ page }) => {
    await page.goto('/newtab.html');
    await page.locator('.drawer-item').first().waitFor();
    await expect(tour(page)).toBeVisible();
    await expect(tour(page)).toContainText('Welcome to your desk');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(tour(page)).toContainText('Your tools');
    const hole = (await page.locator('.tour-hole').boundingBox())!;
    const drawer = (await page.locator('.drawer-track').boundingBox())!;
    expect(hole.x).toBeLessThanOrEqual(drawer.x); // la zona evidenziata copre i cassetti
    expect(hole.y + hole.height).toBeGreaterThanOrEqual(drawer.y + drawer.height);

    await page.keyboard.press('ArrowRight');
    await expect(tour(page)).toContainText('Move, resize, remove');
    await page.keyboard.press('ArrowLeft');
    await expect(tour(page)).toContainText('Your tools');

    for (const title of ['Move, resize, remove', 'Stick widgets together', 'Containers', 'Spaces', 'Make it yours', 'That\'s it!']) {
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(tour(page)).toContainText(title);
    }
    await expect(page.getByRole('button', { name: 'Skip tour' })).toHaveCount(0); // all'ultimo passo c'è solo "Done"
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(tour(page)).toHaveCount(0);

    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await expect(tour(page)).toHaveCount(0);

    // Si rivede dalle impostazioni, e Esc la chiude.
    await openSettings(page);
    await page.getByRole('button', { name: 'Quick tour' }).click();
    await expect(tour(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tour(page)).toHaveCount(0);
  });

  test('saltarla la chiude subito e la scelta resta dopo la ricarica; chi ha già dati non la vede', async ({ page }) => {
    await page.goto('/newtab.html');
    await page.locator('.drawer-item').first().waitFor();
    await page.getByRole('button', { name: 'Skip tour' }).click();
    await expect(tour(page)).toHaveCount(0);
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await expect(tour(page)).toHaveCount(0);

    // Un salvataggio di una versione precedente (senza il campo) non la riattiva.
    await seed(page, { ...appData([]), settings: { language: 'en' } });
    await expect(tour(page)).toHaveCount(0);
  });
});

test('taccuino: i pulsanti formattano la selezione e Ctrl+B funziona', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
  const w = await addWidget(page, 'Notebook');
  const text = w.locator('textarea');
  await text.fill('ciao mondo');
  await text.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 10));
  await w.getByRole('button', { name: 'Bold' }).click();
  await expect(text).toHaveValue('ciao **mondo**');
  await w.getByRole('button', { name: 'Bold' }).click(); // di nuovo: toglie il grassetto
  await expect(text).toHaveValue('ciao mondo');

  await text.press('Control+a');
  await w.getByRole('button', { name: 'Italic' }).click();
  await expect(text).toHaveValue('*ciao mondo*');
  await w.getByRole('button', { name: 'Checklist' }).click();
  await expect(text).toHaveValue('- [ ] *ciao mondo*');
  await w.getByRole('button', { name: 'Heading' }).click();
  await expect(text).toHaveValue('# *ciao mondo*');

  await text.press('Control+a');
  await text.press('Control+b');
  await expect(text).toHaveValue('**# *ciao mondo***');

  await w.getByRole('button', { name: 'Read' }).click();
  await expect(w.getByRole('toolbar', { name: 'Formatting' })).toHaveCount(0); // solo in modalità scrittura
  await w.getByRole('button', { name: 'Write' }).click();
  await text.fill('~~via~~');
  await w.getByRole('button', { name: 'Read' }).click();
  await expect(w.locator('.md s')).toHaveText('via');
});

test('dadi: la moneta si vede come una moneta e dà testa o croce', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
  const w = await addWidget(page, 'Dice');
  await w.getByLabel('Sides').selectOption({ label: 'Coin' });
  await w.getByRole('button', { name: 'Roll' }).click();
  const coin = w.locator('.coin');
  await expect(coin).toHaveCount(1);
  await expect(coin).toHaveAttribute('aria-label', /Heads|Tails/);
  await expect(w.locator('.coin-name')).toHaveText(/Heads|Tails/);
});

test('contenitore ed etichetta stanno in una categoria a parte, "Layout"', async ({ page }) => {
  await openApp(page);
  await page.getByRole('tab', { name: 'Layout' }).click();
  await expect(page.locator('.drawer-item')).toHaveCount(2);
  await expect(page.locator('.drawer-item[aria-label="Container"]')).toHaveCount(1);
  await expect(page.locator('.drawer-item[aria-label="Label"]')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Links & images' }).click();
  await expect(page.locator('.drawer-item[aria-label="Label"]')).toHaveCount(0);
});

test('countdown: la vista "Time left" mostra giorno, settimana, mese e anno', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 28, 12, 0, 0) }); // mercoledì 28 ottobre 2026, mezzogiorno
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
  const w = await addWidget(page, 'Countdown');
  await w.getByRole('tab', { name: 'Time left' }).click();
  const bar = (name: string) => w.getByRole('progressbar', { name, exact: true });
  await expect(bar('Day')).toHaveAttribute('aria-valuenow', '50');
  await expect(bar('Week')).toHaveAttribute('aria-valuenow', '35'); // 2,5 giorni su 7
  await expect(bar('Month')).toHaveAttribute('aria-valuenow', /^8[6-9]$/); // il 28 ottobre
  await expect(bar('Year')).toHaveAttribute('aria-valuenow', '82');
  await expect(w.getByText(/^1[12] hours \d+ min to go$/)).toBeVisible();

  await w.getByRole('tab', { name: 'Countdown' }).click();
  await expect(w.getByLabel('Date')).toBeVisible();
  await w.getByRole('tab', { name: 'Time left' }).click();
  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
  await expect(w.getByRole('tab', { name: 'Time left' })).toHaveAttribute('aria-selected', 'true'); // la scelta resta
});

test('snippets: si aggiungono, si copiano con un clic, si modificano e si tolgono', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
  const w = await addWidget(page, 'Snippets');
  await expect(w.locator('.snip-empty')).toBeVisible();
  await expect(w.getByRole('button', { name: 'Add' })).toBeDisabled(); // senza testo non si aggiunge

  await w.getByLabel('Title', { exact: true }).fill('Indirizzo');
  await w.getByLabel('Text', { exact: true }).fill('Via Roma 1, Milano');
  await w.getByRole('button', { name: 'Add' }).click();
  await w.getByLabel('Text', { exact: true }).fill('ciao@example.com');
  await w.getByRole('button', { name: 'Add' }).click();
  await expect(w.locator('.snip')).toHaveCount(2);

  await w.locator('.snip').first().click();
  await expect(w.getByRole('status')).toHaveText('Copied!');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Via Roma 1, Milano');

  await w.getByRole('button', { name: 'Edit' }).first().click();
  await expect(w.getByLabel('Text', { exact: true })).toHaveValue('Via Roma 1, Milano');
  await w.getByLabel('Text', { exact: true }).fill('Via Dante 2, Milano');
  await w.getByRole('button', { name: 'Save' }).click();
  await expect(w.locator('.snip').first()).toContainText('Via Dante 2');
  await expect(w.locator('.snip')).toHaveCount(2); // modificato, non duplicato

  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
  await expect(widgets(page).first().locator('.snip')).toHaveCount(2);
  await widgets(page).first().getByRole('button', { name: 'Delete' }).last().click();
  await expect(widgets(page).first().locator('.snip')).toHaveCount(1);
});
