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

test('bacheca: le carte si trascinano tra le colonne e si riordinano', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
  const w = await addWidget(page, 'Board');
  for (const text of ['uno', 'due', 'tre']) {
    await w.getByLabel('New card', { exact: true }).fill(text);
    await w.getByLabel('New card', { exact: true }).press('Enter');
  }
  const col = (name: string) => w.getByRole('region', { name });
  const texts = (name: string) => col(name).locator('.kanban-card > span').allTextContents();
  expect(await texts('To do')).toEqual(['uno', 'due', 'tre']);

  const drag = async (from: string, to: { x: number; y: number }) => {
    const b = (await w.locator('.kanban-card', { hasText: from }).boundingBox())!;
    await page.mouse.move(b.x + 20, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await expect(w.locator('.kanban-drop')).toHaveCount(1); // l'indicatore mostra dove cadrà
    await page.mouse.up();
  };
  // "due" nella colonna In progress (vuota)
  const mid = (await col('In progress').boundingBox())!;
  await drag('due', { x: mid.x + mid.width / 2, y: mid.y + 60 });
  expect(await texts('To do')).toEqual(['uno', 'tre']);
  expect(await texts('In progress')).toEqual(['due']);

  // "tre" sopra "uno": si riordina nella stessa colonna
  const first = (await w.locator('.kanban-card', { hasText: 'uno' }).boundingBox())!;
  await drag('tre', { x: first.x + 20, y: first.y + 2 });
  expect(await texts('To do')).toEqual(['tre', 'uno']);

  // un clic senza trascinare non sposta niente
  await w.locator('.kanban-card', { hasText: 'uno' }).click();
  expect(await texts('To do')).toEqual(['tre', 'uno']);

  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
  expect(await widgets(page).first().getByRole('region', { name: 'In progress' }).locator('.kanban-card > span').allTextContents()).toEqual(['due']);
});

test.describe('timer di concentrazione', () => {
  test('si personalizza e le impostazioni restano', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Focus timer');
    await expect(w.locator('.timer-time')).toHaveText('25:00');
    await w.getByRole('button', { name: 'Customise' }).click();
    await w.getByLabel('Focus (min)').fill('10');
    await w.getByLabel('Short break (min)').fill('2');
    await w.getByLabel('Sessions before long break').fill('3');
    await w.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(w.locator('.timer-time')).toHaveText('10:00');
    await expect(w.locator('.pomo-dots span')).toHaveCount(3);
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await expect(widgets(page).first().locator('.timer-time')).toHaveText('10:00');
  });

  test('con l\'avvio automatico la fase successiva parte da sola; senza, aspetta', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Focus timer');
    await w.getByRole('button', { name: 'Customise' }).click();
    await w.getByLabel('Focus (min)').fill('1');
    await w.getByLabel('Short break (min)').fill('2');
    await w.getByRole('button', { name: 'Done', exact: true }).click();

    // Senza avvio automatico: finita la fase si ferma e propone "Next".
    await w.getByRole('button', { name: 'Start' }).click();
    await page.clock.fastForward(61_000);
    await expect(w.getByRole('button', { name: 'Next' })).toBeVisible();
    await w.getByRole('button', { name: 'Next' }).click();
    await expect(w.locator('.timer-note')).toHaveText('Short break');
    await expect(w.getByRole('button', { name: 'Start' })).toBeVisible(); // ferma

    // Con l'avvio automatico: dalla pausa si passa da sola alla concentrazione.
    await w.getByRole('button', { name: 'Customise' }).click();
    await w.getByLabel('Start the next phase automatically').check();
    await w.getByRole('button', { name: 'Done', exact: true }).click();
    await w.getByRole('button', { name: 'Start' }).click();
    await page.clock.fastForward(121_000);
    await expect(w.locator('.timer-note')).toHaveText('Focus');
    await expect(w.getByRole('button', { name: 'Pause' })).toBeVisible(); // già in corso
  });
});

test('obiettivo: con poca altezza la scritta non esce sopra la barra del titolo, e si può scorrere', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([{ id: 'g', type: 'goal', x: -150, y: -100, w: 290, h: 74, z: 1, rot: 0, state: { goal: 'una cosa molto importante da fare oggi', done: false, date: new Date().toLocaleDateString('sv') } }], { tilt: false }));
  const w = widgets(page).first();
  const bar = (await w.locator('.widget-bar').boundingBox())!;
  const label = (await w.locator('.goal-label').boundingBox())!;
  expect(label.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
  const body = w.locator('.widget-body');
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true); // il resto si raggiunge scorrendo
});

test('conto alla rovescia: le due schede stanno su una riga già alla dimensione iniziale (anche in italiano)', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false, language: 'it' }));
  const w = await addWidget(page, 'Conto alla rovescia');
  const tabs = w.locator('.cd-views .chip');
  const [a, b] = [(await tabs.nth(0).boundingBox())!, (await tabs.nth(1).boundingBox())!];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  expect(b.x + b.width).toBeLessThanOrEqual((await w.boundingBox())!.x + (await w.boundingBox())!.width);
});

test('chiudere un widget che tiene traccia dell\'utente chiede conferma, solo se ha dati', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
  const w = await addWidget(page, 'Journal', 400, 250);
  await w.getByRole('button', { name: 'Remove widget' }).click(); // vuoto: via subito, senza domande
  await expect(widgets(page)).toHaveCount(0);

  const j = await addWidget(page, 'Journal', 400, 250);
  await j.getByLabel('One line about the day 1').fill('giornata tranquilla');
  let asked = '';
  page.once('dialog', (d) => { asked = d.message(); void d.dismiss(); });
  await j.getByRole('button', { name: 'Remove widget' }).click();
  await expect.poll(() => asked).toContain('holds your entries');
  await expect(widgets(page)).toHaveCount(1); // annullato: resta
  page.once('dialog', (d) => void d.accept());
  await j.getByRole('button', { name: 'Remove widget' }).click();
  await expect(widgets(page)).toHaveCount(0);

  // Un widget che non tiene traccia (un post-it) si chiude senza domande.
  const n = await addWidget(page, 'Sticky note', 400, 250);
  await n.locator('textarea').fill('appunto');
  await n.getByRole('button', { name: 'Remove widget' }).click();
  await expect(widgets(page)).toHaveCount(0);
});

test('serie di giorni: etichetta fissa "Days…", testo libero e partenza da un numero', async ({ page }) => {
  await openApp(page);
  await seed(page, appData([], { tilt: false }));
  const w = await addWidget(page, 'Day streak');
  await expect(w).toContainText('Days…');
  await w.getByLabel('Name').fill('without sugar');
  await w.getByLabel('Starting count').fill('12');
  await expect(w.locator('.counter-value')).toContainText('12');
  await page.reload();
  await page.locator('.drawer-item').first().waitFor();
  const again = widgets(page).first();
  await expect(again.locator('.counter-value')).toContainText('12');
  await expect(again.getByLabel('Name')).toHaveValue('without sugar');
  page.once('dialog', (d) => void d.accept());
  await again.getByRole('button', { name: 'Restart from today' }).click();
  await expect(again.locator('.counter-value')).toContainText('0');
  await expect(again.getByLabel('Starting count')).toHaveValue('0');
});

test.describe('suoni dei timer', () => {
  const countBells = (page: Page) => page.evaluate(() => (window as unknown as { __bells: number }).__bells);
  test.beforeEach(async ({ page }) => {
    // Conta le note che il browser avvierebbe, senza dipendere dall'audio vero.
    await page.addInitScript(() => {
      (window as unknown as { __bells: number }).__bells = 0;
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...a) { (window as unknown as { __bells: number }).__bells++; return start.apply(this, a as []); };
    });
  });

  test('a fine timer suona una campana; spenti nelle impostazioni, no', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Timer');
    await w.getByRole('button', { name: 'Start' }).click();
    expect(await countBells(page)).toBe(0);
    await page.clock.fastForward(5 * 60_000 + 1000);
    await expect(w.locator('.timer-time.done')).toBeVisible();
    await expect.poll(() => countBells(page)).toBeGreaterThanOrEqual(3); // tre note, ognuna con i suoi armonici

    await w.getByRole('button', { name: 'Restart' }).click();
    const before = await countBells(page);
    await openSettings(page);
    await page.getByLabel('Timer sounds').uncheck();
    await openSettings(page);
    await w.getByRole('button', { name: 'Start' }).click();
    await page.clock.fastForward(5 * 60_000 + 1000);
    await expect(w.locator('.timer-time.done')).toBeVisible();
    expect(await countBells(page)).toBe(before);
  });
});

test.describe('novità della versione', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'What\'s new' });
  const old = (extra: Record<string, unknown> = {}) => appData([], { seenVersion: '0.0.1', ...extra });

  test('dopo un aggiornamento si apre una volta sola; la versione nelle impostazioni la riapre', async ({ page }) => {
    await openApp(page);
    await seed(page, old(), { keepChangelog: true });
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText('Snippets');
    await expect(dialog(page)).toContainText('current');
    await dialog(page).getByRole('button', { name: 'Close' }).click();
    await expect(dialog(page)).toHaveCount(0);

    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await expect(dialog(page)).toHaveCount(0); // mai più, fino al prossimo aggiornamento

    await openSettings(page);
    await page.getByRole('button', { name: /^v\d+\.\d+\.\d+$/ }).click();
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
  });

  test('chi parte da zero non la vede (c\'è la visita guidata); chi ha già visto la versione neanche', async ({ page }) => {
    await page.goto('/newtab.html');
    await page.locator('.drawer-item').first().waitFor();
    await expect(page.getByRole('dialog', { name: 'Quick tour' })).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Skip tour' }).click();
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await expect(dialog(page)).toHaveCount(0); // l'installazione nuova ha già "visto" la versione attuale
  });

  test('una versione salvata più recente di quella installata non le riapre', async ({ page }) => {
    await openApp(page);
    await seed(page, old({ seenVersion: '99.0.0' }), { keepChangelog: true });
    await expect(dialog(page)).toHaveCount(0);
  });
});
