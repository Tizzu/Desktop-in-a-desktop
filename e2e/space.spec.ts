import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { addWidget, appData, closeSettings, dragToolTo, dragWidget, openApp, openSettings, position, readSaved, seed, widgetAt, widgets } from './helpers';

// Coordinate rispetto al centro della tela (versione 3 dei dati).
const open = async (page: Page, list: unknown[], settings: Record<string, unknown> = {}) => {
  await openApp(page);
  await seed(page, { ...appData(list, settings), version: 3 });
};
const tilted = (id: string, x: number, y: number, rot: number) => ({ ...widgetAt(id, 'postit', x, y), rot });
const transformOf = (page: Page, n = 0) => widgets(page).nth(n).evaluate((el) => (el as HTMLElement).style.transform);
const saved = async (page: Page) => {
  await page.waitForTimeout(600);
  return (await readSaved(page)).workspaces;
};
const gear = (page: Page) => page.getByRole('button', { name: 'Space options', exact: true });
const spaceMenu = (page: Page) => page.getByRole('dialog', { name: 'Space options', exact: true });
// Due widget da 260x200 a una distanza data (come in links.spec).
const two = (gap: number) => [widgetAt('a', 'postit', -400, -100), widgetAt('b', 'postit', -400 + 260 + gap, -100)];

test.describe('pannello impostazioni', () => {
  test('si apre sopra la pagina, ha le categorie, si naviga con le frecce e si chiude con Esc o fuori', async ({ page }) => {
    await openApp(page);
    await openSettings(page);
    const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Appearance' })).toHaveAttribute('aria-selected', 'true');
    for (const name of ['Appearance', 'Desk', 'Privacy', 'Sounds', 'Data', 'Language', 'About']) await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Privacy', exact: true }).click();
    await expect(page.getByText('Privacy mode shortcut')).toBeVisible();
    await expect(page.getByLabel('Drawer style')).toHaveCount(0); // l'altra categoria non c'è

    await page.keyboard.press('ArrowDown'); // dalla categoria selezionata alla successiva
    await expect(page.getByRole('tab', { name: 'Sounds', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Timer sounds')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused(); // il focus torna all'ingranaggio

    await openSettings(page);
    await page.mouse.click(8, 300); // sul fondo scuro, fuori dalla finestra
    await expect(dialog).toHaveCount(0);
  });

  test('ogni categoria (tranne Informazioni) comincia con una descrizione, e la × di chiusura non copre nulla', async ({ page }) => {
    await openApp(page);
    await openSettings(page);
    for (const name of ['Appearance', 'Desk', 'Privacy', 'Sounds', 'Data', 'Language']) {
      await page.getByRole('tab', { name, exact: true }).click();
      const first = page.locator('.settings-content > *').first();
      await expect(first, `${name}: la prima riga è la descrizione`).toHaveClass(/set-hint/);
      expect(((await first.textContent()) ?? '').length).toBeGreaterThan(25);

      const x = (await page.getByRole('button', { name: 'Close', exact: true }).boundingBox())!;
      for (const el of await page.locator('.settings-content > *').all()) {
        const b = (await el.boundingBox())!;
        const overlapsRow = b.y < x.y + x.height && b.y + b.height > x.y; // sta alla stessa altezza della ×
        if (overlapsRow) expect(b.x + b.width, `${name}: un elemento passa sotto la ×`).toBeLessThanOrEqual(x.x);
      }
    }
    await page.getByRole('tab', { name: 'About', exact: true }).click();
    await expect(page.locator('.settings-content > *').first()).not.toHaveClass(/set-hint/); // Informazioni è fatta a parte
  });

  test('non contiene più una sezione per lo spazio: quelle opzioni stanno accanto al nome dello spazio', async ({ page }) => {
    await openApp(page);
    await openSettings(page, 'Desk');
    await expect(page.getByLabel('Search bar for this space')).toHaveCount(0);
    await expect(page.getByLabel('Tilt for this space')).toHaveCount(0);
    await closeSettings(page);
    await gear(page).click();
    await expect(page.getByLabel('Tilt for this space')).toBeVisible();
  });

  test('sta dentro una finestra stretta e l\'inclinazione di prima (sì/no) diventa uno slider', async ({ page }) => {
    await open(page, [], { tilt: false });
    await page.setViewportSize({ width: 480, height: 640 });
    await openSettings(page, 'Appearance');
    const card = (await page.locator('.settings-card').boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(480);
    expect(card.y + card.height).toBeLessThanOrEqual(640);
    await expect(page.getByLabel('Tilt', { exact: true })).toHaveValue('0'); // era "false"
  });
});

test.describe('opzioni di uno spazio (ingranaggio accanto al nome)', () => {
  test('l\'ingranaggio c\'è solo sullo spazio attivo e il popover si chiude con Esc e fuori', async ({ page }) => {
    await openApp(page);
    await expect(gear(page)).toHaveCount(1);
    await page.getByRole('button', { name: 'New space' }).click();
    await expect(gear(page)).toHaveCount(1); // uno solo, anche con due spazi
    await gear(page).click();
    await expect(spaceMenu(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(spaceMenu(page)).toHaveCount(0);
    await gear(page).click();
    await page.mouse.click(600, 300);
    await expect(spaceMenu(page)).toHaveCount(0);
  });

  test('rinomina dal popover', async ({ page }) => {
    await openApp(page);
    await gear(page).click();
    await spaceMenu(page).getByLabel('Name', { exact: true }).fill('Casa');
    await spaceMenu(page).getByLabel('Name', { exact: true }).press('Enter');
    await expect(page.locator('.tab.active')).toContainText('Casa');
  });

  test('la × del tab resta e chiede conferma prima di chiudere lo spazio', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'New space' }).click();
    let message = '';
    page.once('dialog', (d) => { message = d.message(); void d.dismiss(); });
    await page.getByRole('button', { name: 'Close Space 2' }).click();
    await expect.poll(() => message).toContain('Delete "Space 2"');
    await expect(page.locator('.tab')).toHaveCount(2); // annullato: resta
    page.once('dialog', (d) => void d.accept());
    await page.getByRole('button', { name: 'Close Space 2' }).click();
    await expect(page.locator('.tab')).toHaveCount(1);
  });

  test('inclinazione propria dello spazio: gli altri spazi seguono le impostazioni, e si torna indietro', async ({ page }) => {
    await open(page, [tilted('a', -130, -100, 2)], { tilt: 1 });
    expect(await transformOf(page)).toBe('rotate(2deg)');

    await gear(page).click();
    await spaceMenu(page).getByLabel('Tilt for this space').selectOption('custom');
    await spaceMenu(page).getByLabel('Tilt amount for this space').fill('50');
    await expect.poll(() => transformOf(page)).toBe('rotate(1deg)'); // 2° × 50%
    await spaceMenu(page).getByLabel('Tilt amount for this space').fill('0');
    await expect.poll(() => transformOf(page)).toBe('');
    await page.keyboard.press('Escape');
    expect((await saved(page))[0].overrides).toEqual({ tilt: 0 });

    // Un altro spazio non ne sa niente: ha i suoi widget inclinati come da impostazioni.
    await page.getByRole('button', { name: 'New space' }).click();
    const w = await addWidget(page, 'Sticky note');
    expect(await w.evaluate((el) => (el as HTMLElement).style.transform)).toMatch(/rotate\(/);
    await page.getByRole('button', { name: 'Space 1', exact: true }).click();
    expect(await transformOf(page)).toBe(''); // il primo resta dritto

    await gear(page).click();
    await spaceMenu(page).getByLabel('Tilt for this space').selectOption('global');
    await expect.poll(() => transformOf(page)).toBe('rotate(2deg)'); // gli angoli non si erano persi
    expect((await saved(page))[0].overrides).toBeUndefined();
  });

  test('rimescola gli angoli: tutti entro il limite, e i widget cambiano', async ({ page }) => {
    await open(page, [tilted('a', -400, -100, 0), tilted('b', -100, -100, 0), tilted('c', 200, -100, 0)], { tilt: 1 });
    await gear(page).click();
    await spaceMenu(page).getByRole('button', { name: 'Shuffle angles' }).click();
    const rots = (await saved(page))[0].widgets.map((w: { rot: number }) => w.rot);
    expect(rots.every((r: number) => Math.abs(r) <= 3)).toBe(true);
    expect(rots.some((r: number) => r !== 0)).toBe(true);
  });

  test('barra di ricerca propria dello spazio', async ({ page }) => {
    await open(page, [], { searchBar: false });
    const bar = page.locator('.fixed-search');
    await expect(bar).toHaveCount(0);

    await gear(page).click();
    await spaceMenu(page).getByLabel('Search bar for this space').selectOption('on');
    await expect(bar).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'New space' }).click();
    await expect(bar).toHaveCount(0); // l'altro spazio segue le impostazioni (spenta)
    await page.getByRole('button', { name: 'Space 1', exact: true }).click();
    await expect(bar).toBeVisible();

    // Se si accende per tutti, lo spazio che la nasconde di proposito continua a nasconderla.
    await openSettings(page, 'Desk');
    await page.getByLabel('Search bar in the centre').check();
    await closeSettings(page);
    await gear(page).click();
    await spaceMenu(page).getByLabel('Search bar for this space').selectOption('off');
    await expect(bar).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Space 2', exact: true }).click();
    await expect(bar).toBeVisible();
  });
});

test.describe('pin dei widget', () => {
  test('un widget fissato non si sposta né si ridimensiona, e chiede conferma prima di sparire', async ({ page }) => {
    await open(page, [widgetAt('a', 'postit', -300, -100), widgetAt('b', 'postit', 100, -100)], { tilt: 0, physics: false });
    const [a, b] = [widgets(page).nth(0), widgets(page).nth(1)];
    await expect(a.getByRole('button', { name: 'Pin widget', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await a.getByRole('button', { name: 'Pin widget', exact: true }).click();
    await expect(a.getByRole('button', { name: 'Unpin widget', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(a).toHaveClass(/pinned/);
    await expect(a.locator('.resize-handle')).toHaveCount(0);

    const before = await position(a);
    await dragWidget(page, a, 120, 60);
    expect(await position(a)).toEqual(before);

    const pb = await position(b);
    await dragWidget(page, b, 50, 0); // gli altri si muovono come prima
    expect((await position(b)).x).toBeGreaterThan(pb.x + 40);

    let message = '';
    page.once('dialog', (d) => { message = d.message(); void d.dismiss(); });
    await a.getByRole('button', { name: 'Remove widget' }).click();
    await expect.poll(() => message).toContain('pinned');
    await expect(widgets(page)).toHaveCount(2);

    await a.getByRole('button', { name: 'Unpin widget', exact: true }).click();
    await expect(a.locator('.resize-handle')).toHaveCount(1);
    await dragWidget(page, a, 120, 60);
    expect((await position(a)).x).toBeGreaterThan(before.x + 100);
    expect((await saved(page))[0].widgets[0].pinned).toBeUndefined();
  });

  test('il pin resta dopo la ricarica', async ({ page }) => {
    await open(page, [widgetAt('a', 'postit', -300, -100)], { tilt: 0 });
    await widgets(page).first().getByRole('button', { name: 'Pin widget', exact: true }).click();
    await page.waitForTimeout(600);
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await expect(widgets(page).first()).toHaveClass(/pinned/);
  });

  test('in un gruppo agganciato, se uno è fissato resta fermo tutto il gruppo', async ({ page }) => {
    await open(page, two(30), { tilt: 0, physics: false });
    const [a, b] = [widgets(page).nth(0), widgets(page).nth(1)];
    await dragWidget(page, b, -22, 0); // si agganciano
    await expect(page.locator('.link-spot')).toHaveCount(1);
    await a.getByRole('button', { name: 'Pin widget', exact: true }).click();
    const before = [await position(a), await position(b)];
    await dragWidget(page, b, 100, 60);
    expect([await position(a), await position(b)]).toEqual(before);
  });

  test('un widget fissato non fa da bersaglio per l\'aggancio', async ({ page }) => {
    await open(page, two(30), { tilt: 0, physics: false });
    const [a, b] = [widgets(page).nth(0), widgets(page).nth(1)];
    await a.getByRole('button', { name: 'Pin widget', exact: true }).click();
    await dragWidget(page, b, -22, 0); // entro la soglia: con un widget libero si sarebbe agganciato
    await expect(page.locator('.link-spot')).toHaveCount(0);
    expect((await position(b)).x - (await position(a)).x).toBe(268); // 260 + 30 − 22: nessuno scatto
  });

  test('bloccare lo spazio fissa tutti i widget, e sbloccarlo li libera', async ({ page }) => {
    await open(page, [widgetAt('a', 'postit', -300, -100), widgetAt('b', 'postit', 100, -100)], { tilt: 0, physics: false });
    await gear(page).click();
    await spaceMenu(page).getByLabel('Lock space layout').check();
    await page.keyboard.press('Escape');
    const [a, b] = [widgets(page).nth(0), widgets(page).nth(1)];
    await expect(a).toHaveClass(/pinned/);
    await expect(b).toHaveClass(/pinned/);
    await expect(a.getByRole('button', { name: 'Unpin widget', exact: true })).toBeDisabled(); // dal widget non si sblocca: si sblocca lo spazio
    // Con il layout bloccato non si aggiungono nemmeno widget: i tool sono spenti e il trascinamento non fa nulla.
    await expect(page.locator('.drawer-item.locked').first()).toBeVisible();
    await dragToolTo(page, 'Sticky note', 600, 450);
    await expect(widgets(page)).toHaveCount(2);
    const before = [await position(a), await position(b)];
    await dragWidget(page, a, 100, 50);
    await dragWidget(page, b, -100, 50);
    expect([await position(a), await position(b)]).toEqual(before);
    expect((await saved(page))[0].locked).toBe(true);

    await gear(page).click();
    await spaceMenu(page).getByLabel('Lock space layout').uncheck();
    await page.keyboard.press('Escape');
    await expect(a).not.toHaveClass(/pinned/);
    await dragWidget(page, a, 100, 50);
    expect((await position(a)).x).toBeGreaterThan(before[0]!.x + 80);
    await expect(page.locator('.drawer-item.locked')).toHaveCount(0);
    await dragToolTo(page, 'Sticky note', 600, 450); // sbloccato: si aggiunge di nuovo
    await expect(widgets(page)).toHaveCount(3);
  });
});

test.describe('maniglia di inclinazione', () => {
  const rotOf = async (page: Page) => parseFloat((await transformOf(page)).replace(/[^\d.-]/g, '') || '0');
  // La linguetta sta nell'angolo in basso a sinistra: si afferra dentro il suo triangolo.
  const dragHandle = async (page: Page, dy: number) => {
    const h = (await page.locator('.rot-handle').boundingBox())!;
    const [x, y] = [h.x + 5, h.y + h.height - 5];
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + dy, { steps: 6 });
    await page.mouse.up();
  };

  test('segue il puntatore entro il limite di ±3°, in entrambe le direzioni', async ({ page }) => {
    await open(page, [tilted('a', -130, -100, 0)], { tilt: 1, physics: false });
    await dragHandle(page, -3); // un tocco leggero: un angolo piccolo, positivo (in senso orario)
    const small = await rotOf(page);
    expect(small).toBeGreaterThan(0.2);
    expect(small).toBeLessThan(2);

    await dragHandle(page, -80);
    expect(await rotOf(page)).toBe(3); // non oltre il limite
    await dragHandle(page, 400);
    expect(await rotOf(page)).toBe(-3);
    expect((await saved(page))[0].widgets[0].rot).toBe(-3); // l'angolo si salva
  });

  test('è una linguetta nell\'angolo, con l\'area ritagliata a triangolo: i pulsanti vicini restano cliccabili', async ({ page }) => {
    await open(page, [tilted('a', -130, -100, 0)], { tilt: 1 });
    const widget = (await widgets(page).first().boundingBox())!;
    const handle = page.locator('.rot-handle');
    const b = (await handle.boundingBox())!;
    expect(b.x).toBeLessThan(widget.x + 3); // sta nell'angolo in basso a sinistra, dentro il widget
    expect(b.y + b.height).toBeGreaterThan(widget.y + widget.height - 3);
    expect(b.width).toBeGreaterThanOrEqual(20);
    expect(await handle.evaluate((el) => getComputedStyle(el).clipPath)).toContain('polygon'); // area utile = triangolo

    // Il pulsante "Draw" del post-it, vicino all'angolo, non è coperto dalla linguetta: il suo centro risponde a lui.
    const draw = (await widgets(page).first().locator('.postit-tools .chip').first().boundingBox())!;
    const hit = await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('.postit-tools'), [draw.x + draw.width / 2, draw.y + draw.height / 2]);
    expect(hit).toBe(true);
    // E gli strumenti del post-it stanno dov'erano.
    expect(await widgets(page).first().locator('.postit-tools').evaluate((el) => getComputedStyle(el).left)).toBe('12px');
  });

  test('si regola anche con le frecce, ed è nascosta se l\'inclinazione è spenta, se è fissato o se è agganciato', async ({ page }) => {
    await open(page, [tilted('a', -130, -100, 0)], { tilt: 1 });
    const handle = page.locator('.rot-handle');
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await rotOf(page)).toBe(1);
    await page.keyboard.press('Home');
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
    expect(await rotOf(page)).toBe(3); // anche con le frecce, non oltre

    await widgets(page).first().getByRole('button', { name: 'Pin widget', exact: true }).click();
    await expect(handle).toHaveCount(0);
    await widgets(page).first().getByRole('button', { name: 'Unpin widget', exact: true }).click();
    await expect(handle).toHaveCount(1);

    await gear(page).click();
    await spaceMenu(page).getByLabel('Tilt for this space').selectOption('custom');
    await spaceMenu(page).getByLabel('Tilt amount for this space').fill('0');
    await expect(handle).toHaveCount(0);
  });

  test('con inclinazione ridotta il widget segue comunque il puntatore e non supera il limite salvato', async ({ page }) => {
    await open(page, [tilted('a', -130, -100, 0)], { tilt: 0.5, physics: false });
    await dragHandle(page, -400);
    expect(await rotOf(page)).toBe(1.5); // 3° salvati × 50%
    expect((await saved(page))[0].widgets[0].rot).toBe(3);
  });
});

test.describe('modalità privacy', () => {
  const veil = (page: Page) => page.getByRole('dialog', { name: 'Privacy mode', exact: true });
  const hideKey = 'Control+Shift+H';

  test('la scorciatoia nasconde e riapre; sotto il velo la pagina non riceve più i tasti', async ({ page }) => {
    await open(page, [widgetAt('a', 'postit', -130, -100)], { tilt: 0 });
    await expect(veil(page)).toHaveCount(0);
    await page.keyboard.press(hideKey);
    await expect(veil(page)).toBeVisible();
    await expect(veil(page)).toContainText('Privacy mode is on');
    await expect(page.locator('.shell')).toHaveAttribute('inert', '');
    await expect(veil(page).getByRole('button', { name: 'Show my desk' })).toBeFocused();
    const box = (await veil(page).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(1000); // tutta la finestra
    await page.keyboard.press(hideKey);
    await expect(veil(page)).toHaveCount(0);
    await expect(page.locator('.shell')).not.toHaveAttribute('inert', '');
  });

  test('con l\'avviso c\'è un grosso pulsante per riaprire; il pulsante a occhio nella barra la nasconde', async ({ page }) => {
    await open(page, [], {});
    await page.getByRole('button', { name: 'Hide the page' }).click();
    const show = veil(page).getByRole('button', { name: 'Show my desk' });
    await expect(show).toBeVisible();
    expect((await show.boundingBox())!.height).toBeGreaterThanOrEqual(50);
    await expect(veil(page)).toContainText('Ctrl+Shift+H'); // dice anche quale tasto la riapre
    await show.click();
    await expect(veil(page)).toHaveCount(0);
  });

  test('avviso discreto: in basso a destra solo il tasto e l\'occhio; ricaricando si vede tutto', async ({ page }) => {
    await open(page, [], { privacyNotice: 'corner' });
    await page.keyboard.press(hideKey);
    await expect(veil(page)).toBeVisible();
    await expect(veil(page).locator('.privacy-card')).toHaveCount(0); // niente avviso al centro
    await expect(veil(page).locator('kbd')).toHaveText('Ctrl+Shift+H'); // il ricordo della scorciatoia
    const eye = veil(page).getByRole('button', { name: 'Show my desk' });
    const [box, win] = [(await eye.boundingBox())!, page.viewportSize()!];
    expect(box.x).toBeGreaterThan(win.width - 120); // in basso a destra
    expect(box.y).toBeGreaterThan(win.height - 80);
    expect(box.height).toBeLessThan(50); // piccolo, non il pulsante grande
    await eye.click();
    await expect(veil(page)).toHaveCount(0);

    await page.keyboard.press(hideKey);
    await page.reload();
    await page.locator('.drawer-item').first().waitFor();
    await expect(veil(page)).toHaveCount(0); // lo stato non si salva
    await page.keyboard.press(hideKey);
    await page.keyboard.press(hideKey);
    await expect(veil(page)).toHaveCount(0);
  });

  test('il velo è trasparente e molto sfocato: sotto si intravede la pagina', async ({ page }) => {
    await open(page, [widgetAt('a', 'postit', -130, -100)], { tilt: 0 });
    await page.keyboard.press(hideKey);
    const style = await veil(page).evaluate((el) => {
      const c = getComputedStyle(el);
      return { blur: c.backdropFilter, bg: c.backgroundColor };
    });
    expect(style.blur).toMatch(/blur\((\d+)px\)/);
    expect(Number(/blur\((\d+)px\)/.exec(style.blur)![1])).toBeGreaterThanOrEqual(40);
    expect(style.bg).not.toMatch(/^rgb\(/); // ha un canale alfa: non è opaco
    await expect(widgets(page).first()).toBeAttached(); // la pagina c'è ancora, sotto
  });

  test('si sceglie dove sta l\'avviso dalle impostazioni', async ({ page }) => {
    await openApp(page);
    await openSettings(page, 'Privacy');
    const choice = page.getByRole('combobox', { name: /While hidden/ });
    await expect(choice).toHaveValue('center');
    await choice.selectOption('corner');
    await closeSettings(page);
    await page.keyboard.press(hideKey);
    await expect(veil(page).locator('.privacy-card')).toHaveCount(0);
  });

  test('scatta anche mentre si scrive in un campo, perché ha i modificatori', async ({ page }) => {
    await open(page, [widgetAt('a', 'postit', -130, -100)], { tilt: 0 });
    await widgets(page).first().locator('textarea').focus();
    await page.keyboard.press(hideKey);
    await expect(veil(page)).toBeVisible();
  });

  test('si nasconde da sola lasciando la scheda, se l\'opzione è accesa', async ({ page }) => {
    const leave = () => page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await open(page, [], { privacyOnLeave: false });
    await leave();
    await expect(veil(page)).toHaveCount(0); // spenta: non fa nulla

    await seed(page, { ...appData([], { privacyOnLeave: true }), version: 3 });
    await leave();
    await expect(veil(page)).toBeVisible();
  });

  test('si nasconde dopo un periodo di inattività, e ogni gesto fa ripartire il conto', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    await seed(page, { ...appData([], { privacyIdle: 1 }), version: 3 });
    await page.clock.fastForward(50_000);
    await page.mouse.move(300, 300);
    await page.mouse.move(320, 310); // un gesto: il conto riparte
    await page.clock.fastForward(50_000);
    await expect(veil(page)).toHaveCount(0);
    await page.clock.fastForward(15_000);
    await expect(veil(page)).toBeVisible();
  });

  test('si imposta dalle impostazioni: tasto proprio, mai uguale a quello della ricerca; "Nascondi ora"', async ({ page }) => {
    await openApp(page);
    await openSettings(page, 'Privacy');
    await page.getByRole('button', { name: 'Ctrl+Shift+H', exact: true }).click();
    await page.keyboard.press('Backslash'); // è la scorciatoia della ricerca
    await expect(page.getByRole('status').filter({ hasText: 'already used' })).toBeVisible();
    await page.keyboard.press('Alt+p');
    await expect(page.getByRole('button', { name: 'Alt+P', exact: true })).toBeVisible();
    await closeSettings(page);

    await page.keyboard.press(hideKey); // il vecchio tasto non vale più
    await expect(veil(page)).toHaveCount(0);
    await page.keyboard.press('Alt+p');
    await expect(veil(page)).toBeVisible();
    await page.keyboard.press('Alt+p');

    await openSettings(page, 'Privacy');
    await page.getByRole('button', { name: 'Hide now' }).click();
    await expect(veil(page)).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0);
  });

  test('è tradotta in italiano', async ({ page }) => {
    await open(page, [], { language: 'it' });
    await page.getByRole('button', { name: 'Nascondi la pagina' }).click();
    await expect(page.getByRole('dialog', { name: 'Modalità privacy', exact: true }).getByRole('button', { name: 'Mostra la scrivania' })).toBeVisible();
  });
});

test.describe('informazioni e novità', () => {
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'What\'s new', exact: true });
  const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string;

  test('il blocco è centrato; la versione è solo testo; sotto il link ci sono Visita guidata e Novità', async ({ page }) => {
    await openApp(page);
    await openSettings(page, 'About');
    const content = (await page.locator('.settings-content').boundingBox())!;
    const name = (await page.locator('.about-name').boundingBox())!;
    expect(Math.abs(name.x + name.width / 2 - (content.x + content.width / 2))).toBeLessThan(4); // centrato in orizzontale
    const block = (await page.locator('.credits').boundingBox())!;
    expect(Math.abs(block.y + block.height / 2 - (content.y + content.height / 2))).toBeLessThan(40); // e in verticale

    await expect(page.locator('.about-version')).toHaveText(`v${version}`);
    expect(await page.locator('.about-version').evaluate((el) => el.tagName)).toBe('SPAN'); // non è più un pulsante
    const link = (await page.getByRole('link', { name: 'Source code and feedback' }).boundingBox())!;
    for (const name of ['Quick tour', 'What\'s new']) {
      const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
      expect(b.y).toBeGreaterThan(link.y + link.height - 1); // sotto il link
    }
    await page.getByRole('button', { name: 'What\'s new', exact: true }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toHaveCount(0);
  });

  test('chi aggiorna vede solo ciò che è uscito dopo l\'ultima volta; il resto sta dietro un pulsante', async ({ page }) => {
    await openApp(page);
    await seed(page, { ...appData([], { seenVersion: '0.3.0' }), version: 3 }, { keepChangelog: true });
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText(`v${version}`);
    await expect(dialog(page)).toContainText('v0.4.0'); // uscita dopo la 0.3.0, che era l'ultima vista
    await expect(dialog(page)).not.toContainText('v0.3.0');
    await expect(dialog(page)).not.toContainText('Snippets'); // è della 0.3.0

    const toggle = dialog(page).getByRole('button', { name: 'Show older versions' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(dialog(page)).toContainText('v0.3.0');
    await expect(dialog(page)).toContainText('Snippets');
    await expect(dialog(page).getByRole('button', { name: 'Hide older versions' })).toHaveAttribute('aria-expanded', 'true');
    await dialog(page).getByRole('button', { name: 'Hide older versions' }).click();
    await expect(dialog(page)).not.toContainText('v0.3.0');
  });

  test('riaprendole a mano, quando sono già viste, c\'è solo l\'ultima versione', async ({ page }) => {
    await open(page, [], {}); // seenVersion = quella attuale
    await openSettings(page, 'About');
    await page.getByRole('button', { name: 'What\'s new', exact: true }).click();
    await expect(dialog(page)).toContainText(`v${version}`);
    await expect(dialog(page)).not.toContainText('v0.4.0');
    await expect(dialog(page).getByRole('button', { name: 'Show older versions' })).toBeVisible();
  });
});
