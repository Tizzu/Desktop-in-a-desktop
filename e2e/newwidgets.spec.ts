import { expect, test } from '@playwright/test';
import { addWidget, appData, openApp, seed, widgetAt } from './helpers';

test.describe('tool ritratti sopra i widget', () => {
  test('un widget sotto la barra fa rientrare i tool che gli stanno sopra, e solo quelli', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([widgetAt('a', 'postit', 0, 0)], { tilt: false }));
    const retracted = page.locator('.drawer-item.retracted');
    await expect(retracted.first()).toBeVisible();
    const total = await page.locator('.drawer-item').count();
    expect(await retracted.count()).toBeLessThan(total);

    // Il pulsante × del widget in alto a sinistra è cliccabile e rimuove il widget.
    await page.locator('.canvas .widget').getByRole('button', { name: 'Rimuovi widget' }).click({ timeout: 3000 });
    await expect(page.locator('.canvas .widget')).toHaveCount(0);
    await expect(retracted).toHaveCount(0);
  });

  test('scorrendo la barra il rientro passa ai tool che arrivano sopra il widget', async ({ page }) => {
    await page.setViewportSize({ width: 560, height: 700 });
    await openApp(page);
    await seed(page, appData([widgetAt('a', 'postit', 0, 0)], { tilt: false }));
    const names = () => page.locator('.drawer-item.retracted').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')).join('|'));
    const before = await names();
    await page.locator('.drawer-track').evaluate((t) => { t.scrollLeft = 400; });
    await expect.poll(names).not.toBe(before);
  });
});

test.describe('widget aggiuntivi', () => {
  test('promemoria: aggiunge e toglie una voce', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Promemoria');
    await w.getByLabel('Testo').fill('chiamare Anna');
    await w.getByLabel('Quando').fill('2030-05-01T09:30');
    await w.getByRole('button', { name: 'Aggiungi' }).click();
    await expect(w.locator('.todo-list li')).toContainText('chiamare Anna');
    await w.getByRole('button', { name: 'Elimina' }).click();
    await expect(w.locator('.todo-list li')).toHaveCount(0);
  });

  test('conto alla rovescia: mostra i giorni che mancano', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 28, 10, 0, 0) });
    await openApp(page);
    const w = await addWidget(page, 'Conto alla rovescia');
    await w.getByLabel('Data').fill('2026-11-02T12:00');
    await expect(w.locator('.countdown-value b').first()).toHaveText('5');
  });

  test('bacheca: la carta passa da una colonna all’altra e resta dopo il ricaricamento', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Bacheca');
    await w.getByLabel('Nuova carta').fill('scrivere i test');
    await w.getByLabel('Nuova carta').press('Enter');
    await w.getByRole('button', { name: 'Sposta a destra' }).click();
    await expect(w.getByRole('region', { name: 'In corso' })).toContainText('scrivere i test');
    await page.waitForTimeout(600);
    await page.reload();
    await expect(page.getByRole('region', { name: 'In corso' })).toContainText('scrivere i test');
  });

  test('spese e dividi il conto fanno i conti', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const s = await addWidget(page, 'Spese', 300, 250);
    await s.getByLabel('Importo').fill('20');
    await s.getByRole('button', { name: '+ Entrata' }).click();
    await s.getByLabel('Importo').fill('7,5');
    await s.getByRole('button', { name: '− Spesa' }).click();
    await expect(s.getByLabel('Saldo')).toContainText('12,50');

    const d = await addWidget(page, 'Dividi il conto', 700, 250);
    await d.getByLabel('Totale').fill('90');
    await d.getByLabel('persone').fill('3');
    await expect(d.locator('.counter-value')).toContainText('30,00');
  });

  test('umore e pianta: si segnano per oggi', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const m = await addWidget(page, 'Umore', 300, 250);
    await m.getByRole('button', { name: 'Umore 5 su 5' }).click();
    await expect(m.getByRole('button', { name: 'Umore 5 su 5' })).toHaveAttribute('aria-pressed', 'true');

    const p = await addWidget(page, 'Pianta', 700, 250);
    await p.getByRole('button', { name: 'Annaffia' }).click();
    await expect(p.getByRole('button', { name: /Annaffiata oggi/ })).toBeDisabled();
  });

  test('2048 con le frecce, tris e memory si giocano', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const g = await addWidget(page, '2048', 250, 250);
    const tiles = () => g.locator('.t').evaluateAll((els) => els.filter((e) => e.textContent).length);
    expect(await tiles()).toBe(2);
    const grid = g.getByRole('application');
    await grid.focus();
    for (const k of ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp']) await grid.press(k);
    expect(await tiles()).toBeGreaterThanOrEqual(2);
    await expect(g.locator('.g2048-head')).toContainText('Punti');

    const t = await addWidget(page, 'Tris', 600, 250);
    for (const i of [1, 4, 2, 5, 3]) await t.getByRole('button', { name: new RegExp(`^Casella ${i}\\b`) }).click();
    await expect(t).toContainText('Vince X');

    const m = await addWidget(page, 'Memory', 950, 250);
    await m.getByRole('button', { name: 'Carta coperta' }).first().click();
    await expect(m.getByRole('button', { name: 'Carta coperta' })).toHaveCount(15);
  });

  test('ruota della fortuna estrae una delle opzioni', async ({ page }) => {
    await openApp(page);
    await seed(page, appData([], { tilt: false }));
    const w = await addWidget(page, 'Ruota della fortuna');
    await w.getByRole('button', { name: 'Gira' }).click();
    await expect(w.locator('.wheel-result')).toContainText(/Pizza|Sushi|Insalata|Pasta/, { timeout: 6000 });
  });
});
